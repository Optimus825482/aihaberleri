/**
 * Content Service - Handles content generation and processing
 */

import {
  analyzeNewsArticles,
  rewriteArticle,
  generateImagePrompt,
} from "@/lib/deepseek";
import { fetchPollinationsImage } from "@/lib/pollinations";
import { generateSlug } from "@/lib/utils";
import { db } from "@/lib/db";
import type { NewsArticle } from "./news.service";
import { fetchArticleContent } from "./news.service";
import { submitArticleToIndexNow } from "@/lib/seo/indexnow";
import { postTweet } from "@/lib/social/twitter";
import { postToFacebook } from "@/lib/social/facebook";

export interface ProcessedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string | null;
  sourceUrl: string;
  categorySlug: string;
  keywords: string[];
  metaTitle: string;
  metaDescription: string;
  score: number | null;
}

/**
 * Check if article already exists in database
 * ENHANCED: Multiple layers of duplicate detection
 */
async function isDuplicate(article: NewsArticle): Promise<boolean> {
  // 1. Normalize URL: remove query parameters
  const normalizeUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch {
      return url;
    }
  };

  const normalizedUrl = normalizeUrl(article.url);

  // Check 1: Exact sourceUrl match (fastest)
  const existingByUrl = await db.article.findFirst({
    where: {
      sourceUrl: {
        startsWith: normalizedUrl, // Flexible match for base URL
      },
    },
    select: { id: true, title: true },
  });

  if (existingByUrl) {
    console.log(`🗑️ Duplicate URL detected: ${existingByUrl.title}`);
    return true;
  }

  // Check 2: Slug match (prevent same slug conflicts)
  const potentialSlug = generateSlug(article.title);
  const existingBySlug = await db.article.findFirst({
    where: {
      slug: {
        startsWith: potentialSlug, // Matches "slug" or "slug-123456"
      },
    },
    select: { id: true, title: true, slug: true },
  });

  if (existingBySlug) {
    console.log(
      `🗑️ Duplicate slug detected: ${existingBySlug.slug} (${existingBySlug.title})`,
    );
    return true;
  }

  // Check 3: Title match (exact or close)
  // Clean title: remove extra spaces, lowercase
  const cleanTitle = article.title.trim().toLowerCase();

  // Fetch recent articles (last 7 days) for fuzzy comparison
  // INCREASED from 3 to 7 days to catch more duplicates
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentArticles = await db.article.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      title: true,
      id: true,
    },
    take: 200, // Limit to avoid performance issues
  });

  // Check for exact match first
  const exactMatch = recentArticles.find(
    (a) => a.title.trim().toLowerCase() === cleanTitle,
  );
  if (exactMatch) {
    console.log(`🗑️ Exact title match: ${exactMatch.title}`);
    return true;
  }

  // Check 4: Fuzzy Similarity (Dice Coefficient)
  // LOWERED threshold from 0.85 to 0.80 to catch more similar titles
  const SIMILARITY_THRESHOLD = 0.8;

  for (const recent of recentArticles) {
    const similarity = calculateSimilarity(article.title, recent.title);
    if (similarity >= SIMILARITY_THRESHOLD) {
      console.log(
        `🗑️ Fuzzy duplicate detected (${(similarity * 100).toFixed(1)}%):`,
        `\n   New: "${article.title}"`,
        `\n   Old: "${recent.title}"`,
      );
      return true;
    }
  }

  return false;
}

/**
 * Calculate similarity between two strings using Dice Coefficient (0 to 1)
 * Good for catching similar titles even with small typos or word swaps
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/\s+/g, "");
  const s2 = str2.toLowerCase().replace(/\s+/g, "");

  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < s1.length - 1; i++) {
    const bigram = s1.substring(i, i + 2);
    bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substring(i, i + 2);
    const count = bigrams1.get(bigram);
    if (count && count > 0) {
      bigrams1.set(bigram, count - 1);
      intersection++;
    }
  }

  return (2.0 * intersection) / (s1.length - 1 + s2.length - 1);
}

/**
 * Select the best articles from a list using AI analysis
 */
export async function selectBestArticles(
  articles: NewsArticle[],
  targetCount: number = 3,
): Promise<Array<{ article: NewsArticle; category: string }>> {
  console.log(
    `🎯 ${articles.length} haber arasından en iyi ${targetCount} tanesi seçiliyor...`,
  );

  if (articles.length === 0) return [];

  // Filter out duplicates BEFORE AI analysis to save tokens and avoid duplicate processing
  const uniqueArticles: NewsArticle[] = [];
  for (const article of articles) {
    if (!(await isDuplicate(article))) {
      uniqueArticles.push(article);
    } else {
      console.log(`🗑️ Duplicate skipped: ${article.title}`);
    }
  }

  if (uniqueArticles.length === 0) {
    console.log("⚠️ All articles were duplicates.");
    return [];
  }

  try {
    // Analyze only the top 15-20 unique articles
    const analysis = await analyzeNewsArticles(uniqueArticles.slice(0, 20));

    const selected = analysis
      .slice(0, targetCount)
      .map((item) => {
        const index = item.index;
        return {
          article: uniqueArticles[index], // Use uniqueArticles array
          category: item.category,
        };
      })
      .filter((item) => item.article !== undefined);

    if (selected.length === 0) {
      throw new Error("AI could not select any articles");
    }

    return selected;
  } catch (error) {
    console.error("Haber analiz hatası, fallback uygulanıyor:", error);
    // Fallback: Take the first few unique ones
    return uniqueArticles.slice(0, targetCount).map((a) => ({
      article: a,
      category: "Yapay Zeka",
    }));
  }
}

/**
 * Process a single article: rewrite, get image, prepare for publishing
 */
export async function processArticle(
  article: NewsArticle,
  category: string,
): Promise<ProcessedArticle> {
  console.log(`📝 Haber işleniyor: ${article.title}`);

  try {
    // Step 1: Fetch full article content
    const fullContent = await fetchArticleContent(article.url);

    // Step 2: Fetch recent articles for internal linking context
    const recentArticles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        category: { name: category },
      },
      select: { title: true, slug: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    // Step 3: Rewrite article using DeepSeek
    console.log("🤖 DeepSeek ile haber yeniden yazılıyor...");

    // Define type for rewrite result to include score
    interface RewriteResult {
      title: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
      score?: number;
    }

    const rewritten = (await rewriteArticle(
      article.title,
      fullContent,
      category,
      recentArticles,
    )) as RewriteResult;

    const score = rewritten.score || 0;
    console.log(`📊 Haber Puanı: ${score}/1000`);

    // Step 3: Generate AI image prompt using DeepSeek
    console.log("🎨 DeepSeek ile görsel prompt oluşturuluyor...");
    const imagePrompt = await generateImagePrompt(
      rewritten.title,
      rewritten.content,
      category,
    );
    console.log("📝 Görsel prompt:", imagePrompt);

    // Step 4: Get image from Pollinations.ai
    console.log("🖼️  Pollinations.ai'dan görsel alınıyor...");
    const imageUrl = await fetchPollinationsImage(imagePrompt, {
      width: 1200,
      height: 630,
      model: "flux-realism",
      enhance: true,
      nologo: true,
    });
    console.log("✅ Görsel URL:", imageUrl);

    // Step 5: Generate slug
    const slug = generateSlug(rewritten.title);

    // Step 6: Get or create category
    const categorySlug = generateSlug(category);
    await ensureCategory(category, categorySlug);

    return {
      title: rewritten.title,
      slug,
      excerpt: rewritten.excerpt,
      content: rewritten.content,
      imageUrl,
      sourceUrl: article.url,
      categorySlug,
      keywords: rewritten.keywords,
      metaTitle: rewritten.title,
      metaDescription: rewritten.metaDescription,
      score,
    };
  } catch (error) {
    console.error("Haber işleme hatası:", error);
    throw error;
  }
}

/**
 * Ensure category exists in database
 */
async function ensureCategory(name: string, slug: string): Promise<void> {
  try {
    await db.category.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        description: `${name} ile ilgili haberler`,
      },
    });
  } catch (error) {
    console.error("Kategori oluşturma hatası:", error);
  }
}

/**
 * Publish processed article to database
 */
export async function publishArticle(
  processedArticle: ProcessedArticle,
  agentLogId?: string,
): Promise<{ id: string; slug: string }> {
  console.log(`📤 Haber yayınlanıyor: ${processedArticle.title}`);

  try {
    // Get category
    const category = await db.category.findUnique({
      where: { slug: processedArticle.categorySlug },
    });

    if (!category) {
      throw new Error(`Kategori bulunamadı: ${processedArticle.categorySlug}`);
    }

    // ENHANCED: Check for existing article by slug OR sourceUrl
    const existing = await db.article.findFirst({
      where: {
        OR: [
          { slug: processedArticle.slug },
          { sourceUrl: processedArticle.sourceUrl },
        ],
      },
      select: { id: true, slug: true, title: true },
    });

    if (existing) {
      console.log(
        `⚠️ Haber zaten var, atlanıyor: ${existing.title} (${existing.slug})`,
      );
      // Return existing article instead of creating duplicate
      return {
        id: existing.id,
        slug: existing.slug,
      };
    }

    // Determine status based on score
    const score = processedArticle.score || 0;
    const status = score >= 750 ? "PUBLISHED" : "DRAFT";

    // Create article
    const article = await db.article.create({
      data: {
        title: processedArticle.title,
        slug: processedArticle.slug,
        excerpt: processedArticle.excerpt,
        content: processedArticle.content,
        imageUrl: processedArticle.imageUrl,
        sourceUrl: processedArticle.sourceUrl,
        categoryId: category.id,
        status,
        score,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        metaTitle: processedArticle.metaTitle,
        metaDescription: processedArticle.metaDescription,
        keywords: processedArticle.keywords,
        agentLogId,
      },
    });

    console.log(`✅ Haber yayınlandı: ${article.slug} (Skor: ${score})`);

    // Post-publish tasks: IndexNow submission
    try {
      submitArticleToIndexNow(article.slug).catch((err) =>
        console.error("IndexNow auto-submit error:", err),
      );
    } catch (e) {
      console.error("Failed to trigger IndexNow submission:", e);
    }

    // Post to Twitter (Async)
    try {
      postTweet({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        categoryName: category.name,
      }).catch((err) => console.error("Async tweet failed:", err));
    } catch (e) {
      console.error("Failed to trigger Twitter post:", e);
    }

    // Post to Facebook (Async)
    try {
      postToFacebook({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        imageUrl: processedArticle.imageUrl,
        categoryName: category.name,
      }).catch((err) => console.error("Async Facebook post failed:", err));
    } catch (e) {
      console.error("Failed to trigger Facebook post:", e);
    }

    return {
      id: article.id,
      slug: article.slug,
    };
  } catch (error) {
    console.error("Haber yayınlama hatası:", error);
    throw error;
  }
}

/**
 * Process and publish multiple articles
 */
export async function processAndPublishArticles(
  articles: Array<{ article: NewsArticle; category: string }>,
  agentLogId?: string,
  forceCategorySlug?: string,
): Promise<Array<{ id: string; slug: string }>> {
  const published = [];

  for (const { article, category } of articles) {
    try {
      // If forceCategorySlug is provided, use it instead of DeepSeek's category
      const targetCategory = forceCategorySlug
        ? await db.category.findUnique({ where: { slug: forceCategorySlug } })
        : null;

      const categoryToUse = targetCategory ? targetCategory.name : category;

      const processed = await processArticle(article, categoryToUse);

      // Override category slug if forced
      if (forceCategorySlug) {
        processed.categorySlug = forceCategorySlug;
      }

      const result = await publishArticle(processed, agentLogId);
      published.push(result);
    } catch (error) {
      console.error(`Haber işleme başarısız: ${article.title}`, error);
    }
  }

  return published;
}

export default {
  selectBestArticles,
  processArticle,
  publishArticle,
  processAndPublishArticles,
};
