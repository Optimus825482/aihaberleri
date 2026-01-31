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
import { fetchArticleContent, isDuplicateNews } from "./news.service";
import { submitArticleToIndexNow } from "@/lib/seo/indexnow";
import { postTweet } from "@/lib/social/twitter";
import { postToFacebook } from "@/lib/social/facebook";
import { translateAndSaveArticle } from "@/lib/translation";
import { getCache } from "@/lib/cache";
import { contentLogger } from "@/lib/logger";
import { optimizeAndGenerateSizes } from "@/lib/image-optimizer";

export interface ProcessedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string | null;
  imageUrlMedium: string | null;
  imageUrlSmall: string | null;
  imageUrlThumb: string | null;
  sourceUrl: string;
  categorySlug: string;
  keywords: string[];
  metaTitle: string;
  metaDescription: string;
  score: number | null;
}

/**
 * Check if article already exists in database
 * ENHANCED: Multiple layers of duplicate detection using new isDuplicateNews()
 */
async function isDuplicate(article: NewsArticle): Promise<boolean> {
  // 1. Normalize URL: remove query parameters, fragments, trailing slashes
  const normalizeUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      // Remove trailing slash and normalize path
      const path = urlObj.pathname.replace(/\/$/, "");
      return `${urlObj.origin}${path}`;
    } catch {
      return url;
    }
  };

  const normalizedUrl = normalizeUrl(article.url);

  // Check 1: Exact sourceUrl match (fastest)
  const existingByUrl = await db.article.findFirst({
    where: {
      OR: [
        { sourceUrl: normalizedUrl },
        { sourceUrl: { startsWith: normalizedUrl } },
        { sourceUrl: { endsWith: normalizedUrl.split("/").pop() || "" } }, // Match by last path segment
      ],
    },
    select: { id: true, title: true, sourceUrl: true },
  });

  if (existingByUrl) {
    contentLogger.duplicate(
      existingByUrl.title,
      `URL match: ${existingByUrl.sourceUrl}`,
    );
    console.log(`🗑️ Duplicate URL detected: ${existingByUrl.title}`);
    console.log(`   Existing URL: ${existingByUrl.sourceUrl}`);
    console.log(`   New URL: ${article.url}`);
    return true;
  }

  // Check 2: Use new advanced duplicate detection (title + content similarity)
  const duplicateCheck = await isDuplicateNews(
    article.title,
    article.description,
    48, // Check last 48 hours (increased from 24)
  );

  if (duplicateCheck.isDuplicate) {
    contentLogger.duplicate(
      article.title,
      duplicateCheck.reason || "Content similarity",
    );
    console.log(`🗑️ ${duplicateCheck.reason}: "${article.title}"`);
    if (duplicateCheck.similarArticleId) {
      console.log(
        `   Similar to article ID: ${duplicateCheck.similarArticleId}`,
      );
    }
    return true;
  }

  return false;
}

/**
 * Extract topic/theme from article title
 */
function extractTopic(title: string): string {
  const lowerTitle = title.toLowerCase();

  // Entity-based topics
  if (
    lowerTitle.includes("gpt") ||
    lowerTitle.includes("chatgpt") ||
    lowerTitle.includes("openai")
  )
    return "OpenAI/GPT";
  if (lowerTitle.includes("gemini") || lowerTitle.includes("bard"))
    return "Google/Gemini";
  if (lowerTitle.includes("claude") || lowerTitle.includes("anthropic"))
    return "Anthropic/Claude";
  if (lowerTitle.includes("tesla") || lowerTitle.includes("elon"))
    return "Tesla/Elon Musk";
  if (
    lowerTitle.includes("meta") ||
    lowerTitle.includes("facebook") ||
    lowerTitle.includes("llama")
  )
    return "Meta/Facebook";
  if (lowerTitle.includes("microsoft") || lowerTitle.includes("copilot"))
    return "Microsoft";
  if (lowerTitle.includes("google ai") || lowerTitle.includes("google yapay"))
    return "Google AI";
  if (lowerTitle.includes("nvidia")) return "NVIDIA";
  if (lowerTitle.includes("apple")) return "Apple";

  // Technology-based topics
  if (
    lowerTitle.includes("görüntü") ||
    lowerTitle.includes("image") ||
    lowerTitle.includes("vision") ||
    lowerTitle.includes("dall-e")
  )
    return "Bilgisayarlı Görü";
  if (lowerTitle.includes("video") || lowerTitle.includes("sora"))
    return "Video AI";
  if (
    lowerTitle.includes("ses") ||
    lowerTitle.includes("audio") ||
    lowerTitle.includes("voice")
  )
    return "Ses AI";
  if (lowerTitle.includes("robot")) return "Robotik";
  if (
    lowerTitle.includes("otonom") ||
    lowerTitle.includes("autonomous") ||
    lowerTitle.includes("self-driving")
  )
    return "Otonom Sistemler";

  // Theme-based topics
  if (
    lowerTitle.includes("etik") ||
    lowerTitle.includes("ethical") ||
    lowerTitle.includes("regulation")
  )
    return "AI Etiği/Düzenlemeler";
  if (
    lowerTitle.includes("yatırım") ||
    lowerTitle.includes("fonlama") ||
    lowerTitle.includes("funding") ||
    lowerTitle.includes("investment")
  )
    return "Yatırım";
  if (lowerTitle.includes("model") && !lowerTitle.includes("tesla"))
    return "AI Modelleri";

  return "Genel AI"; // Default
}

/**
 * Check if topic was recently published
 */
async function isTopicRecent(
  topic: string,
  hoursWindow: number = 24,
): Promise<boolean> {
  const recentArticles = await db.article.findMany({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - hoursWindow * 60 * 60 * 1000),
      },
      status: "PUBLISHED",
    },
    select: { title: true },
  });

  const recentTopics = recentArticles.map((a) => extractTopic(a.title));
  return recentTopics.includes(topic);
}

/**
 * Select the best articles from a list using AI analysis
 * ENHANCED: Now passes recent published articles to AI for diversity enforcement
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
    // Phase 3: Fetch recently published articles for diversity control
    const recentPublished = await db.article.findMany({
      where: {
        publishedAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Last 48 hours
        },
        status: "PUBLISHED",
      },
      select: {
        title: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });

    console.log(
      `📖 Recent context: ${recentPublished.length} articles from last 48h passed to AI`,
    );

    // Analyze only the top 15-20 unique articles WITH context of recent publications
    const analysis = await analyzeNewsArticles(
      uniqueArticles.slice(0, 20),
      recentPublished.map((a) => ({
        title: a.title,
        publishedAt: a.publishedAt,
      })),
    );

    const selected = analysis
      .slice(0, targetCount)
      .map((item) => {
        const index = item.index;
        return {
          article: uniqueArticles[index], // Use uniqueArticles array
          category: item.category,
          topic: extractTopic(uniqueArticles[index].title),
        };
      })
      .filter((item) => item.article !== undefined);

    // Phase 2: Topic clustering - filter out topics published within 24 hours
    const diverseSelected = [];
    for (const item of selected) {
      const isRecent = await isTopicRecent(item.topic, 24);
      if (!isRecent) {
        diverseSelected.push(item);
        console.log(`✅ Topic "${item.topic}" is fresh - including`);
      } else {
        console.log(
          `🚫 Topic "${item.topic}" was recently published - skipping for diversity`,
        );
      }
    }

    // If all were filtered, take at least one to avoid complete failure
    if (diverseSelected.length === 0 && selected.length > 0) {
      console.log(
        `⚠️ All topics were recent, taking best one anyway to avoid empty result`,
      );
      diverseSelected.push(selected[0]);
    }

    if (diverseSelected.length === 0) {
      throw new Error("AI could not select any articles");
    }

    return diverseSelected;
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

    // Step 2: Fetch recent articles for internal linking context (max 3 to avoid over-linking)
    const recentArticles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        category: { name: category },
      },
      select: { title: true, slug: true },
      take: 3,
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

    // Step 4.5: Generate slug (needed for image optimization)
    const slug = generateSlug(rewritten.title);

    // Step 5: Optimize image and generate multiple sizes
    console.log("🎨 Görsel optimize ediliyor ve boyutlar oluşturuluyor...");
    let imageSizes = {
      large: imageUrl,
      medium: imageUrl,
      small: imageUrl,
      thumb: imageUrl,
    };

    try {
      imageSizes = await optimizeAndGenerateSizes(imageUrl, slug);
      console.log("✅ Görsel optimizasyonu tamamlandı");
      console.log(`   Large: ${imageSizes.large}`);
      console.log(`   Medium: ${imageSizes.medium}`);
      console.log(`   Small: ${imageSizes.small}`);
      console.log(`   Thumb: ${imageSizes.thumb}`);
    } catch (optimizeError) {
      console.error(
        "⚠️  Görsel optimizasyonu başarısız, orijinal kullanılacak:",
        optimizeError,
      );
      // Continue with original image URL for all sizes
    }

    // Step 6: Get or create category
    const categorySlug = generateSlug(category);
    await ensureCategory(category, categorySlug);

    return {
      title: rewritten.title,
      slug,
      excerpt: rewritten.excerpt,
      content: rewritten.content,
      imageUrl: imageSizes.large,
      imageUrlMedium: imageSizes.medium,
      imageUrlSmall: imageSizes.small,
      imageUrlThumb: imageSizes.thumb,
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
): Promise<{ id: string; slug: string } | null> {
  console.log(`📤 Haber yayınlanıyor: ${processedArticle.title}`);

  try {
    // Get category
    const category = await db.category.findUnique({
      where: { slug: processedArticle.categorySlug },
    });

    if (!category) {
      throw new Error(`Kategori bulunamadı: ${processedArticle.categorySlug}`);
    }

    // CRITICAL: Multi-layer duplicate check BEFORE publishing

    // Layer 1: Check by slug OR sourceUrl (fastest)
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
        `🗑️ DUPLICATE (slug/url): ${existing.title} (${existing.slug})`,
      );
      return null; // Return null instead of existing article
    }

    // Layer 2: Advanced duplicate detection (title + content similarity)
    const duplicateCheck = await isDuplicateNews(
      processedArticle.title,
      processedArticle.content,
      48, // 48 hour window
    );

    if (duplicateCheck.isDuplicate) {
      console.log(
        `🗑️ DUPLICATE (${duplicateCheck.reason}): ${processedArticle.title}`,
      );
      if (duplicateCheck.similarArticleId) {
        console.log(
          `   Similar to article ID: ${duplicateCheck.similarArticleId}`,
        );
      }
      return null; // Skip publishing
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
        imageUrlMedium: processedArticle.imageUrlMedium,
        imageUrlSmall: processedArticle.imageUrlSmall,
        imageUrlThumb: processedArticle.imageUrlThumb,
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

    // 🚀 CACHE: Invalidate articles cache when new article published
    try {
      const cache = getCache();
      await cache.invalidateByTag("articles");
      console.log("🗑️  Cache invalidated for tag: articles");
    } catch (cacheError) {
      console.error("❌ Cache invalidation error:", cacheError);
      // Don't fail article creation if cache invalidation fails
    }

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

    // Translate article to English (Async)
    try {
      translateAndSaveArticle(article.id, "tr").catch((err) =>
        console.error("Async translation failed:", err),
      );
    } catch (e) {
      console.error("Failed to trigger translation:", e);
    }

    // Trigger Web Push Notification (Async)
    try {
      if (status === "PUBLISHED") {
        console.log("📱 Push bildirimi gönderiliyor...");
        // Use direct import instead of dynamic import for better reliability
        const { sendPushNotification } = await import("@/lib/push");
        sendPushNotification(
          article.title,
          article.excerpt,
          `https://aihaberleri.org/news/${article.slug}`,
        )
          .then(() => console.log("✅ Push bildirimi gönderildi"))
          .catch((err) => {
            console.error("❌ Push bildirimi hatası:", err);
          });
      }
    } catch (e) {
      console.error("❌ Push bildirimi başlatılamadı:", e);
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

      // CRITICAL: Only add to published array if not duplicate (result is not null)
      if (result) {
        published.push(result);
        console.log(`✅ Haber başarıyla yayınlandı: ${result.slug}`);
      } else {
        console.log(`🗑️ Duplicate detected, skipped: ${article.title}`);
      }
    } catch (error) {
      console.error(`❌ Haber işleme başarısız: ${article.title}`, error);
    }
  }

  console.log(
    `📊 Toplam ${published.length}/${articles.length} haber yayınlandı`,
  );
  return published;
}

export default {
  selectBestArticles,
  processArticle,
  publishArticle,
  processAndPublishArticles,
};
