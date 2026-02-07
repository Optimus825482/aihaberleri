/**
 * Title A/B Testing System
 *
 * Generates title variants, tracks CTR, and auto-selects winners.
 *
 * VARIANT TYPES:
 * - primary: Professional news style (neutral, factual)
 * - clickbait: Attention-grabbing, curiosity-inducing
 * - seo: Keyword-rich, search engine optimized
 *
 * AUTO-SELECTION: Winner is selected after threshold views
 * based on highest CTR.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { callDeepSeek } from "@/lib/deepseek";

// ============================================================================
// Types
// ============================================================================

export type TitleVariantType = "primary" | "clickbait" | "seo";

export interface TitleVariants {
  primary: string;
  clickbait: string;
  seo: string;
}

export interface VariantMetrics {
  primary: number;
  clickbait: number;
  seo: number;
}

export interface TitleABTestData {
  titleVariants: TitleVariants;
  activeVariant: TitleVariantType;
  variantViews: VariantMetrics;
  variantClicks: VariantMetrics;
}

export interface ArticleWithABTest {
  id: string;
  title: string;
  titleABTest: TitleABTestData | null;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  /** Minimum views before auto-selecting winner */
  MIN_VIEWS_FOR_WINNER: 100,

  /** Minimum CTR difference to declare winner (e.g., 0.02 = 2%) */
  MIN_CTR_DIFFERENCE: 0.02,

  /** How to distribute initial views (rotation strategy) */
  ROTATION_STRATEGY: "round-robin" as "round-robin" | "random" | "weighted",

  /** Maximum title length */
  MAX_TITLE_LENGTH: 80,

  /** DeepSeek model for title generation */
  DEEPSEEK_MODEL: "deepseek-chat",
};

// ============================================================================
// DeepSeek Prompt for Title Generation
// ============================================================================

const TITLE_GENERATION_PROMPT = `Sen dünya çapında ödüllü bir haber editörü ve SEO uzmanısın.

Görevin: Aşağıdaki haber içeriği için 3 FARKLI başlık varyantı oluştur.

### HABER İÇERİĞİ:
{content}

### KATEGORİ: {category}

### BAŞLIK VARYANTLARI:

1. **PRIMARY (Profesyonel Haber Stili):**
   - Tarafsız, nesnel, Reuters/AP tarzı
   - Net, bilgilendirici, güvenilir
   - Jargonsuz, herkesin anlayacağı dil
   - 50-70 karakter ideal

2. **CLICKBAIT (Dikkat Çekici):**
   - Merak uyandıran, tıklamaya teşvik eden
   - Duygusal tetikleyiciler (şaşkınlık, heyecan, endişe)
   - Soru formatı veya "işte nedeni" kalıpları
   - Abartısız ama ilgi çekici
   - 50-75 karakter

3. **SEO (Arama Motoru Optimizeli):**
   - Ana anahtar kelime başta
   - Yüksek arama hacimli terimler
   - Google Discover uyumlu
   - Trend kelimeler varsa dahil et
   - 55-70 karakter

### KURALLAR:
- Türkçe karakterleri doğru kullan (ı, ğ, ü, ş, ö, ç)
- Başlıklar birbirinden FARKLI olmalı (sadece kelime değişikliği değil, farklı yaklaşım)
- Clickbait abartılı/yalan olmamalı, içerikle uyumlu
- Her başlık tek satırda, noktalama işareti ile bitebilir

JSON formatında yanıt ver:
{
  "primary": "Profesyonel haber başlığı",
  "clickbait": "Dikkat çekici başlık",
  "seo": "Anahtar kelime odaklı başlık"
}`;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Generate 3 title variants using DeepSeek
 */
export async function generateTitleVariants(
  content: string,
  category: string,
): Promise<TitleVariants> {
  // Truncate content to avoid token limits
  const truncatedContent =
    content.length > 2000 ? content.substring(0, 2000) + "..." : content;

  const prompt = TITLE_GENERATION_PROMPT.replace(
    "{content}",
    truncatedContent,
  ).replace("{category}", category);

  try {
    const response = await callDeepSeek(
      [
        {
          role: "system",
          content:
            "Sen bir haber editörü ve SEO uzmanısın. Sadece geçerli JSON yanıtı ver, başka açıklama ekleme.",
        },
        { role: "user", content: prompt },
      ],
      {
        model: CONFIG.DEEPSEEK_MODEL,
        maxTokens: 500,
        temperature: 0.8,
      },
    );

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse title variants JSON");
    }

    const variants = JSON.parse(jsonMatch[0]) as TitleVariants;

    // Validate and truncate titles
    return {
      primary: truncateTitle(variants.primary),
      clickbait: truncateTitle(variants.clickbait),
      seo: truncateTitle(variants.seo),
    };
  } catch (error) {
    console.error("Title variant generation failed:", error);

    // Fallback: Return the original title for all variants
    const fallbackTitle = truncateTitle(content.split("\n")[0] || "Haber");
    return {
      primary: fallbackTitle,
      clickbait: fallbackTitle,
      seo: fallbackTitle,
    };
  }
}

/**
 * Initialize A/B test data for an article
 */
export function initializeABTestData(variants: TitleVariants): TitleABTestData {
  return {
    titleVariants: variants,
    activeVariant: "primary", // Start with primary
    variantViews: { primary: 0, clickbait: 0, seo: 0 },
    variantClicks: { primary: 0, clickbait: 0, seo: 0 },
  };
}

/**
 * Select active variant for display (rotation strategy)
 * Returns the current active variant title
 */
export async function selectActiveVariant(articleId: string): Promise<string> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      titleABTest: true,
    },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  // If no A/B test data, return original title
  if (!article.titleABTest) {
    return article.title;
  }

  const abTest = article.titleABTest as unknown as TitleABTestData;

  // Check if we have a winner
  const winner = calculateWinner(abTest);
  if (winner) {
    return abTest.titleVariants[winner];
  }

  // Apply rotation strategy
  const nextVariant = getNextVariant(abTest);

  // Update active variant
  await prisma.article.update({
    where: { id: articleId },
    data: {
      titleABTest: {
        ...abTest,
        activeVariant: nextVariant,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return abTest.titleVariants[nextVariant];
}

/**
 * Get the active title for display (without changing rotation)
 */
export async function getActiveTitle(articleId: string): Promise<string> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      titleABTest: true,
    },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  if (!article.titleABTest) {
    return article.title;
  }

  const abTest = article.titleABTest as unknown as TitleABTestData;

  // Return active variant's title
  return abTest.titleVariants[abTest.activeVariant];
}

/**
 * Track a view for the current variant
 */
export async function trackVariantView(
  articleId: string,
  variant: TitleVariantType,
): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { titleABTest: true },
  });

  if (!article?.titleABTest) {
    return;
  }

  const abTest = article.titleABTest as unknown as TitleABTestData;

  // Increment view count
  abTest.variantViews[variant]++;

  await prisma.article.update({
    where: { id: articleId },
    data: { titleABTest: abTest as object },
  });
}

/**
 * Track a click for the current variant
 */
export async function trackVariantClick(
  articleId: string,
  variant: TitleVariantType,
): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { titleABTest: true },
  });

  if (!article?.titleABTest) {
    return;
  }

  const abTest = article.titleABTest as unknown as TitleABTestData;

  // Increment click count
  abTest.variantClicks[variant]++;

  await prisma.article.update({
    where: { id: articleId },
    data: { titleABTest: abTest as object },
  });
}

/**
 * Get the winning variant (or null if not enough data)
 */
export async function getWinningVariant(
  articleId: string,
): Promise<TitleVariantType | null> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { titleABTest: true },
  });

  if (!article?.titleABTest) {
    return null;
  }

  const abTest = article.titleABTest as unknown as TitleABTestData;
  return calculateWinner(abTest);
}

/**
 * Get full A/B test statistics for an article
 */
export async function getABTestStats(articleId: string): Promise<{
  variants: TitleVariants;
  activeVariant: TitleVariantType;
  stats: {
    variant: TitleVariantType;
    title: string;
    views: number;
    clicks: number;
    ctr: number;
  }[];
  winner: TitleVariantType | null;
  totalViews: number;
  totalClicks: number;
} | null> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { titleABTest: true },
  });

  if (!article?.titleABTest) {
    return null;
  }

  const abTest = article.titleABTest as unknown as TitleABTestData;

  const variants: TitleVariantType[] = ["primary", "clickbait", "seo"];
  const stats = variants.map((variant) => ({
    variant,
    title: abTest.titleVariants[variant],
    views: abTest.variantViews[variant],
    clicks: abTest.variantClicks[variant],
    ctr: calculateCTR(
      abTest.variantClicks[variant],
      abTest.variantViews[variant],
    ),
  }));

  const totalViews = variants.reduce(
    (sum, v) => sum + abTest.variantViews[v],
    0,
  );
  const totalClicks = variants.reduce(
    (sum, v) => sum + abTest.variantClicks[v],
    0,
  );

  return {
    variants: abTest.titleVariants,
    activeVariant: abTest.activeVariant,
    stats,
    winner: calculateWinner(abTest),
    totalViews,
    totalClicks,
  };
}

/**
 * Lock winner and update article title permanently
 */
export async function lockWinner(articleId: string): Promise<{
  success: boolean;
  winner: TitleVariantType | null;
  newTitle: string | null;
}> {
  const winner = await getWinningVariant(articleId);

  if (!winner) {
    return { success: false, winner: null, newTitle: null };
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { titleABTest: true },
  });

  if (!article?.titleABTest) {
    return { success: false, winner: null, newTitle: null };
  }

  const abTest = article.titleABTest as unknown as TitleABTestData;
  const winnerTitle = abTest.titleVariants[winner];

  // Update article title to winner
  await prisma.article.update({
    where: { id: articleId },
    data: {
      title: winnerTitle,
      titleABTest: {
        ...abTest,
        activeVariant: winner,
        locked: true,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return { success: true, winner, newTitle: winnerTitle };
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Generate title variants for multiple articles (batch)
 */
export async function generateVariantsBatch(
  articles: { id: string; content: string; category: string }[],
): Promise<Map<string, TitleVariants>> {
  const results = new Map<string, TitleVariants>();

  for (const article of articles) {
    try {
      const variants = await generateTitleVariants(
        article.content,
        article.category,
      );
      results.set(article.id, variants);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to generate variants for ${article.id}:`, error);
    }
  }

  return results;
}

/**
 * Check and lock winners for all eligible articles
 */
export async function processWinners(): Promise<{
  processed: number;
  locked: number;
}> {
  // Find articles with A/B test data and enough views
  const articles = await prisma.article.findMany({
    where: {
      titleABTest: { not: Prisma.JsonNull },
      status: "PUBLISHED",
    },
    select: {
      id: true,
      titleABTest: true,
    },
  });

  let processed = 0;
  let locked = 0;

  for (const article of articles) {
    const abTest = article.titleABTest as unknown as TitleABTestData & {
      locked?: boolean;
    };

    // Skip if already locked
    if (abTest.locked) {
      continue;
    }

    processed++;

    const winner = calculateWinner(abTest);
    if (winner) {
      const result = await lockWinner(article.id);
      if (result.success) {
        locked++;
        console.log(`🏆 Locked winner for ${article.id}: ${winner}`);
      }
    }
  }

  return { processed, locked };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Truncate title to max length
 */
function truncateTitle(title: string): string {
  if (title.length <= CONFIG.MAX_TITLE_LENGTH) {
    return title;
  }

  // Truncate at last word boundary
  const truncated = title.substring(0, CONFIG.MAX_TITLE_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + "..." : truncated;
}

/**
 * Calculate CTR (Click-Through Rate)
 */
function calculateCTR(clicks: number, views: number): number {
  if (views === 0) return 0;
  return clicks / views;
}

/**
 * Get next variant based on rotation strategy
 */
function getNextVariant(abTest: TitleABTestData): TitleVariantType {
  const variants: TitleVariantType[] = ["primary", "clickbait", "seo"];

  switch (CONFIG.ROTATION_STRATEGY) {
    case "round-robin": {
      // Find variant with least views
      const sorted = [...variants].sort(
        (a, b) => abTest.variantViews[a] - abTest.variantViews[b],
      );
      return sorted[0];
    }

    case "random": {
      const idx = Math.floor(Math.random() * variants.length);
      return variants[idx];
    }

    case "weighted": {
      // Weight based on inverse of views (less views = higher chance)
      const totalViews = variants.reduce(
        (sum, v) => sum + abTest.variantViews[v],
        0,
      );
      if (totalViews === 0) return variants[0];

      const weights = variants.map(
        (v) => (totalViews - abTest.variantViews[v] + 1) / (totalViews + 3),
      );
      const random = Math.random();
      let cumulative = 0;

      for (let i = 0; i < variants.length; i++) {
        cumulative += weights[i];
        if (random < cumulative) {
          return variants[i];
        }
      }
      return variants[0];
    }

    default:
      return "primary";
  }
}

/**
 * Calculate winner based on CTR and minimum views
 */
function calculateWinner(abTest: TitleABTestData): TitleVariantType | null {
  const variants: TitleVariantType[] = ["primary", "clickbait", "seo"];

  // Check if all variants have minimum views
  const allHaveMinViews = variants.every(
    (v) => abTest.variantViews[v] >= CONFIG.MIN_VIEWS_FOR_WINNER / 3,
  );

  if (!allHaveMinViews) {
    return null;
  }

  // Calculate CTR for each variant
  const ctrs = variants.map((v) => ({
    variant: v,
    ctr: calculateCTR(abTest.variantClicks[v], abTest.variantViews[v]),
  }));

  // Sort by CTR descending
  ctrs.sort((a, b) => b.ctr - a.ctr);

  const best = ctrs[0];
  const secondBest = ctrs[1];

  // Winner must have MIN_CTR_DIFFERENCE higher than second
  if (best.ctr - secondBest.ctr >= CONFIG.MIN_CTR_DIFFERENCE) {
    return best.variant;
  }

  // Not enough difference yet
  return null;
}

// ============================================================================
// Integration with Content Enricher
// ============================================================================

/**
 * Process article for A/B testing during content enrichment
 * Call this from content-enricher.agent.ts after synthesizing content
 */
export async function processArticleForABTesting(
  articleId: string,
  content: string,
  category: string,
  originalTitle: string,
): Promise<TitleABTestData | null> {
  try {
    // Generate variants
    const variants = await generateTitleVariants(content, category);

    // Ensure primary is close to original (for consistency)
    variants.primary = variants.primary || originalTitle;

    // Initialize A/B test data
    const abTestData = initializeABTestData(variants);

    // Save to database
    await prisma.article.update({
      where: { id: articleId },
      data: { titleABTest: abTestData as object },
    });

    console.log(`📊 A/B test initialized for article ${articleId}`);
    return abTestData;
  } catch (error) {
    console.error(`Failed to initialize A/B test for ${articleId}:`, error);
    return null;
  }
}

// ============================================================================
// API Helpers
// ============================================================================

/**
 * Get title to display (for API/frontend use)
 * Handles rotation and tracking in one call
 */
export async function getDisplayTitle(
  articleId: string,
  trackView = true,
): Promise<{
  title: string;
  variant: TitleVariantType | null;
  isABTest: boolean;
}> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      titleABTest: true,
    },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  if (!article.titleABTest) {
    return {
      title: article.title,
      variant: null,
      isABTest: false,
    };
  }

  const abTest = article.titleABTest as unknown as TitleABTestData & {
    locked?: boolean;
  };

  // If locked, return winner
  if (abTest.locked) {
    return {
      title: abTest.titleVariants[abTest.activeVariant],
      variant: abTest.activeVariant,
      isABTest: false, // Locked = no longer testing
    };
  }

  // Get next variant
  const variant = getNextVariant(abTest);
  const title = abTest.titleVariants[variant];

  // Track view if requested
  if (trackView) {
    await trackVariantView(articleId, variant);
  }

  return {
    title,
    variant,
    isABTest: true,
  };
}

/**
 * Record a click from article listing to detail page
 */
export async function recordClick(
  articleId: string,
  variant: TitleVariantType,
): Promise<void> {
  await trackVariantClick(articleId, variant);
}

export default {
  generateTitleVariants,
  initializeABTestData,
  selectActiveVariant,
  getActiveTitle,
  trackVariantView,
  trackVariantClick,
  getWinningVariant,
  getABTestStats,
  lockWinner,
  generateVariantsBatch,
  processWinners,
  processArticleForABTesting,
  getDisplayTitle,
  recordClick,
};
