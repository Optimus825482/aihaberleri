/**
 * Content Service - Handles content generation and processing
 */

import {
  analyzeNewsArticles,
  rewriteArticle,
  generateImagePrompt,
  aggregateMultiSourceArticles,
} from "@/lib/deepseek";
import { fetchPollinationsImage } from "@/lib/pollinations";
import { generateSlug } from "@/lib/utils";
import { db } from "@/lib/db";
import type { NewsArticle } from "./news.service";
import { fetchArticleContent, isDuplicateNews } from "./news.service";
import { submitArticleToIndexNow } from "@/lib/seo/indexnow";
import { postTweet } from "@/lib/social/twitter";
import { postToFacebook } from "@/lib/social/facebook";
import { postToBluesky } from "@/lib/social/bluesky";
import { postToMastodon } from "@/lib/social/mastodon";
import { translateAndSaveArticle } from "@/lib/translation";
import { getCache } from "@/lib/cache";
import { contentLogger } from "@/lib/logger";
import { optimizeAndGenerateSizes } from "@/lib/image-optimizer";
import {
  recordShareSuccess,
  recordShareFailure,
  initializeShareRecords,
} from "@/services/social-share.service";
import { createModuleLogger } from "@/lib/agent-log-stream";
import {
  ContentValidator,
  validateAndFixContent,
} from "@/lib/content-validator";
import { isAIRelatedContent, calculateAIRelevanceScore } from "@/lib/rss";
import { upsertGlossaryWithArticleTerms } from "../lib/ai-glossary";
import { runContentQualityController } from "@/services/content-quality-controller.service";

// ============================================================================
// CONTENT CONSTANTS - Magic numbers extracted for maintainability
// ============================================================================

const CONTENT_CONSTANTS = {
  // Duplicate check window (hours)
  DUPLICATE_CHECK_WINDOW_HOURS: 48,
  // Duplicate check window for aggregated content (hours)
  AGGREGATE_DUPLICATE_WINDOW_HOURS: 48,
  // Topic recency check window (hours)
  TOPIC_RECENCY_WINDOW_HOURS: 24,
  // Minimum articles for cluster aggregation
  MIN_CLUSTER_ARTICLES: 2,
  // Maximum sources per aggregation
  MAX_AGGREGATION_SOURCES: 5,
  // Maximum recent articles for AI context
  MAX_RECENT_CONTEXT: 20,
  // Maximum recent articles for internal linking
  MAX_INTERNAL_LINKS: 3,
  // Recent article window for diversity (hours)
  DIVERSITY_WINDOW_HOURS: 48,
  // Score threshold for auto-publishing
  PUBLISH_SCORE_THRESHOLD: 750,
  // Image fetch timeout (ms)
  IMAGE_FETCH_TIMEOUT: 30000,
} as const;

// ============================================================================
// END CONSTANTS
// ============================================================================

// Create module-specific loggers for live streaming
const liveLog = {
  content: createModuleLogger("content"),
  duplicate: createModuleLogger("duplicate"),
  deepseek: createModuleLogger("deepseek"),
  image: createModuleLogger("image"),
  publish: createModuleLogger("publish"),
};

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
  topic?: string; // NEW: Topic from smart filtering
  qualityControl?: {
    qualityScore: number;
    attemptsUsed: number;
    forcedPass: boolean;
    issues: string[];
  };
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

    // Live log: Duplicate detected
    await liveLog.duplicate.warn(
      `🗑️ Duplicate URL: ${existingByUrl.title.substring(0, 50)}...`,
    );

    return true;
  }

  // Check 2: Use new advanced duplicate detection (title + content similarity)
  const duplicateCheck = await isDuplicateNews(
    article.title,
    article.description,
    CONTENT_CONSTANTS.DUPLICATE_CHECK_WINDOW_HOURS,
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
 * ENHANCED: Now returns multi-entity combinations for precise clustering
 * Example: "Nvidia CEO OpenAI yatırım" → "NVIDIA+OpenAI" (multi-entity topic)
 */
function extractTopic(title: string): string {
  const lowerTitle = title.toLowerCase();

  // Step 1: Extract ALL entities from title
  const detectedEntities: string[] = [];

  // Company entities
  if (lowerTitle.includes("nvidia") || lowerTitle.includes("jensen huang"))
    detectedEntities.push("NVIDIA");
  if (
    lowerTitle.includes("openai") ||
    lowerTitle.includes("gpt") ||
    lowerTitle.includes("chatgpt") ||
    lowerTitle.includes("sam altman")
  )
    detectedEntities.push("OpenAI");
  if (lowerTitle.includes("google") || lowerTitle.includes("gemini"))
    detectedEntities.push("Google");
  if (
    lowerTitle.includes("microsoft") ||
    lowerTitle.includes("copilot") ||
    lowerTitle.includes("satya nadella")
  )
    detectedEntities.push("Microsoft");
  if (
    lowerTitle.includes("anthropic") ||
    lowerTitle.includes("claude") ||
    lowerTitle.includes("dario amodei")
  )
    detectedEntities.push("Anthropic");
  if (
    lowerTitle.includes("meta") ||
    lowerTitle.includes("facebook") ||
    lowerTitle.includes("llama") ||
    lowerTitle.includes("zuckerberg")
  )
    detectedEntities.push("Meta");
  if (lowerTitle.includes("tesla") || lowerTitle.includes("elon musk"))
    detectedEntities.push("Tesla");
  if (lowerTitle.includes("apple")) detectedEntities.push("Apple");
  if (lowerTitle.includes("amazon") || lowerTitle.includes("aws"))
    detectedEntities.push("Amazon");
  if (lowerTitle.includes("deepseek")) detectedEntities.push("DeepSeek");

  // Step 2: If 2+ entities found, create combination topic (for better clustering)
  if (detectedEntities.length >= 2) {
    // Sort for consistent ordering (NVIDIA+OpenAI = OpenAI+NVIDIA)
    const sorted = detectedEntities.sort();
    const combo = sorted.slice(0, 3).join("+"); // Max 3 entities
    console.log(
      `🔗 Multi-entity topic detected: ${combo} from "${title.substring(0, 50)}..."`,
    );
    return combo;
  }

  // Step 3: Single entity - return as before with category prefix
  if (detectedEntities.length === 1) {
    return detectedEntities[0];
  }

  // Step 4: No company entity - check for technology/theme topics
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
  if (lowerTitle.includes("model")) return "AI Modelleri";

  return "Genel AI"; // Default
}

/**
 * Check if topic was recently published
 */
async function isTopicRecent(
  topic: string,
  hoursWindow: number = CONTENT_CONSTANTS.TOPIC_RECENCY_WINDOW_HOURS,
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
 * Cluster articles by topic - groups similar stories from different sources
 * Returns clusters with 2+ articles covering the same story
 */
interface ArticleCluster {
  topic: string;
  articles: NewsArticle[];
  keywords: string[];
}

function clusterArticlesByTopic(articles: NewsArticle[]): ArticleCluster[] {
  const clusters = new Map<string, NewsArticle[]>();

  // Group by extracted topic
  for (const article of articles) {
    const topic = extractTopic(article.title);
    if (!clusters.has(topic)) {
      clusters.set(topic, []);
    }
    clusters.get(topic)!.push(article);
  }

  // Filter clusters with 2+ articles (aggregation candidates)
  const result: ArticleCluster[] = [];
  for (const [topic, arts] of clusters) {
    if (arts.length >= CONTENT_CONSTANTS.MIN_CLUSTER_ARTICLES) {
      // Extract common keywords from cluster
      const allWords = arts.flatMap((a) => a.title.toLowerCase().split(/\s+/));
      const wordCounts = new Map<string, number>();
      for (const word of allWords) {
        if (word.length > 3) {
          // Skip short words
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      }
      // Keywords appearing in 50%+ of articles
      const threshold = arts.length * 0.5;
      const keywords = Array.from(wordCounts.entries())
        .filter(([, count]) => count >= threshold)
        .map(([word]) => word);

      result.push({ topic, articles: arts, keywords });
      console.log(
        `📦 Cluster found: "${topic}" with ${arts.length} articles from different sources`,
      );
    }
  }

  // Sort by cluster size (largest first)
  return result.sort((a, b) => b.articles.length - a.articles.length);
}

/**
 * Process a cluster of articles into a single aggregated article
 * Uses DeepSeek to synthesize multiple sources into one comprehensive piece
 */
async function processAggregatedCluster(
  cluster: ArticleCluster,
  category: string,
): Promise<ProcessedArticle | null> {
  console.log(
    `🔗 Processing aggregated cluster: ${cluster.topic} (${cluster.articles.length} sources)`,
  );

  await liveLog.content.info(
    `🔗 Aggregating ${cluster.articles.length} sources: ${cluster.topic}`,
  );

  try {
    // Fetch full content for each article in cluster
    // OPTIMIZED: Parallel processing with Promise.allSettled() and concurrency limit
    // Max 5 concurrent requests, 30s timeout each, fault-tolerant (one failure doesn't block others)
    const articlesWithContent = [];
    const articlesToFetch = cluster.articles.slice(
      0,
      CONTENT_CONSTANTS.MAX_AGGREGATION_SOURCES,
    ); // Max 5 sources

    // Process in parallel with concurrency limit (max 5 concurrent)
    const CONCURRENCY_LIMIT = 5;
    for (let i = 0; i < articlesToFetch.length; i += CONCURRENCY_LIMIT) {
      const batch = articlesToFetch.slice(i, i + CONCURRENCY_LIMIT);

      // Parallel fetch with individual timeouts
      const fetchPromises = batch.map(async (article) => {
        let content = article.description;
        try {
          // Individual timeout per article (30s max)
          const fullContent = (await Promise.race([
            fetchArticleContent(article.url),
            new Promise<string>((_, reject) =>
              setTimeout(
                () => reject(new Error("Article fetch timeout")),
                CONTENT_CONSTANTS.IMAGE_FETCH_TIMEOUT,
              ),
            ),
          ])) as string;
          if (fullContent && fullContent.length > content.length) {
            content = fullContent;
          }
        } catch (e) {
          console.warn(
            `⚠️ Could not fetch full content for ${article.url}: ${(e as Error).message}`,
          );
        }
        return {
          title: article.title,
          content,
          source: article.source || "Unknown",
          url: article.url,
        };
      });

      // Use allSettled for fault tolerance - continue even if some fail
      const results = await Promise.allSettled(fetchPromises);

      // Collect successful results
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          articlesWithContent.push(result.value);
        }
      }
    }

    // Use DeepSeek to aggregate sources
    const aggregated = await aggregateMultiSourceArticles(
      articlesWithContent,
      cluster.topic,
    );

    await liveLog.deepseek.success(
      `✅ Aggregated: ${aggregated.title.substring(0, 50)}...`,
    );

    // Generate AI image for aggregated article
    console.log("🎨 Generating image for aggregated article...");
    const imagePrompt = await generateImagePrompt(
      aggregated.title,
      aggregated.content,
      category,
    );

    const { fetchPollinationsImage } = await import("@/lib/pollinations");
    const imageUrl = await fetchPollinationsImage(imagePrompt, {
      width: 1200,
      height: 630,
      model: "flux",
      enhance: true,
      nologo: true,
    });

    const slug = generateSlug(aggregated.title);

    // Optimize image
    let imageSizes = {
      large: imageUrl,
      medium: imageUrl,
      small: imageUrl,
      thumb: imageUrl,
    };

    try {
      imageSizes = await optimizeAndGenerateSizes(imageUrl, slug);
    } catch (e) {
      console.warn("⚠️ Image optimization failed, using original");
    }

    // Get category slug
    const categorySlug = generateSlug(category);
    await ensureCategory(category, categorySlug);

    // Create source references for content footer
    const sourcesList = aggregated.sources
      .map(
        (s) =>
          `<li><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></li>`,
      )
      .join("");

    const contentWithSources = `${aggregated.content}
    <div class="sources-box" style="margin-top: 2rem; padding: 1rem; background: #f5f5f5; border-radius: 8px;">
      <h3 style="margin-bottom: 0.5rem;">📚 Kaynaklar</h3>
      <ul style="margin: 0; padding-left: 1.5rem;">${sourcesList}</ul>
    </div>`;

    await liveLog.image.success(`🖼️ Image generated for: ${slug}`);

    return {
      title: aggregated.title,
      slug,
      excerpt: aggregated.excerpt,
      content: contentWithSources,
      imageUrl: imageSizes.large,
      imageUrlMedium: imageSizes.medium,
      imageUrlSmall: imageSizes.small,
      imageUrlThumb: imageSizes.thumb,
      sourceUrl: cluster.articles[0].url, // Primary source
      categorySlug,
      keywords: aggregated.keywords,
      metaTitle: aggregated.title,
      metaDescription: aggregated.metaDescription,
      score: 850, // Aggregated articles get high score
    };
  } catch (error) {
    console.error(`❌ Aggregation failed for cluster ${cluster.topic}:`, error);
    await liveLog.content.error(`❌ Aggregation failed: ${cluster.topic}`);
    return null;
  }
}

/**
 * Select the best articles from a list using AI analysis
 * ENHANCED: Now with multi-source aggregation support
 *
 * WORKFLOW:
 * 1. Filter duplicates
 * 2. Cluster similar articles by topic
 * 3. If cluster has 2+ sources → aggregate into single comprehensive article
 * 4. Remaining articles → select best individually via AI
 */
export async function selectBestArticles(
  articles: NewsArticle[],
  targetCount: number = 3,
): Promise<
  Array<{
    article: NewsArticle;
    category: string;
    aggregated?: ProcessedArticle;
  }>
> {
  console.log(
    `🎯 ${articles.length} haber arasından en iyi ${targetCount} tanesi seçiliyor...`,
  );

  if (articles.length === 0) return [];

  // Duplicate check removed from here — processAndPublishArticles already does it
  // before processing each article (saves redundant DB queries)
  const uniqueArticles = articles;

  // ═══════════════════════════════════════════════════════════════════
  // AI RELEVANCE FILTER - Remove non-AI content
  // ═══════════════════════════════════════════════════════════════════
  const aiRelevantArticles = uniqueArticles.filter((article) => {
    const isRelevant = isAIRelatedContent(
      article.title,
      article.description || "",
    );
    if (!isRelevant) {
      const score = calculateAIRelevanceScore(
        article.title,
        article.description || "",
      );
      console.log(
        `🚫 AI dışı içerik filtrelendi (skor: ${score}): ${article.title}`,
      );
    }
    return isRelevant;
  });

  console.log(
    `🤖 AI filtreleme: ${uniqueArticles.length} → ${aiRelevantArticles.length} (${uniqueArticles.length - aiRelevantArticles.length} elendi)`,
  );

  if (aiRelevantArticles.length === 0) {
    console.log("⚠️ Tüm makaleler AI ile ilgisiz bulundu.");
    return [];
  }

  try {
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: MULTI-SOURCE AGGREGATION
    // Check for topic clusters with 2+ sources - these become aggregated articles
    // ═══════════════════════════════════════════════════════════════════
    const clusters = clusterArticlesByTopic(aiRelevantArticles);
    const aggregatedResults: Array<{
      article: NewsArticle;
      category: string;
      aggregated?: ProcessedArticle;
    }> = [];
    const usedArticleUrls = new Set<string>();

    // Process clusters with 2+ articles for aggregation
    for (const cluster of clusters) {
      if (
        cluster.articles.length >= 2 &&
        aggregatedResults.length < Math.ceil(targetCount / 2)
      ) {
        console.log(
          `📦 Processing cluster: ${cluster.topic} with ${cluster.articles.length} sources`,
        );

        // Check if this topic was recently published
        const isRecent = await isTopicRecent(
          cluster.topic,
          CONTENT_CONSTANTS.TOPIC_RECENCY_WINDOW_HOURS,
        );
        if (isRecent) {
          console.log(
            `🚫 Cluster topic "${cluster.topic}" was recently published - skipping`,
          );
          continue;
        }

        // Determine category based on topic
        const clusterCategory = cluster.topic.includes("Google")
          ? "Google AI"
          : cluster.topic.includes("OpenAI")
            ? "OpenAI"
            : cluster.topic.includes("Microsoft")
              ? "Microsoft"
              : cluster.topic.includes("NVIDIA")
                ? "Donanım"
                : cluster.topic.includes("Robotik")
                  ? "Robotik"
                  : "Yapay Zeka";

        try {
          const aggregatedArticle = await processAggregatedCluster(
            cluster,
            clusterCategory,
          );
          if (aggregatedArticle) {
            // Add first article as reference, with aggregated content
            aggregatedResults.push({
              article: cluster.articles[0],
              category: clusterCategory,
              aggregated: aggregatedArticle,
            });

            // Mark all cluster articles as used
            cluster.articles.forEach((a) => usedArticleUrls.add(a.url));
            console.log(
              `✅ Aggregated ${cluster.articles.length} sources into: ${aggregatedArticle.title}`,
            );
          }
        } catch (aggError) {
          console.error(
            `❌ Aggregation failed for ${cluster.topic}:`,
            aggError,
          );
          // Continue with individual article selection
        }
      }
    }

    // Filter out already-used articles from individual selection
    const remainingArticles = aiRelevantArticles.filter(
      (a) => !usedArticleUrls.has(a.url),
    );
    const remainingTargetCount = targetCount - aggregatedResults.length;

    console.log(
      `📊 Aggregation complete: ${aggregatedResults.length} aggregated, ${remainingTargetCount} individual slots remaining`,
    );

    // If we have enough aggregated articles, return them
    if (remainingTargetCount <= 0 || remainingArticles.length === 0) {
      return aggregatedResults;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: INDIVIDUAL ARTICLE SELECTION
    // For remaining slots, select best individual articles
    // ═══════════════════════════════════════════════════════════════════

    // Phase 2.1: Fetch recently published articles for diversity control
    const recentPublished = await db.article.findMany({
      where: {
        publishedAt: {
          gte: new Date(
            Date.now() -
              CONTENT_CONSTANTS.DIVERSITY_WINDOW_HOURS * 60 * 60 * 1000,
          ),
        },
        status: "PUBLISHED",
      },
      select: {
        title: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: CONTENT_CONSTANTS.MAX_RECENT_CONTEXT,
    });

    console.log(
      `📖 Recent context: ${recentPublished.length} articles from last 48h passed to AI`,
    );

    // Analyze only remaining articles (not used in aggregation) WITH context of recent publications
    const analysis = await analyzeNewsArticles(
      remainingArticles.slice(0, CONTENT_CONSTANTS.MAX_RECENT_CONTEXT),
      recentPublished
        .filter((a) => a.publishedAt !== null)
        .map((a) => ({
          title: a.title,
          publishedAt: a.publishedAt as Date,
        })),
    );

    const selected = analysis
      .slice(0, remainingTargetCount)
      .map((item) => {
        const index = item.index;
        return {
          article: remainingArticles[index], // Use remainingArticles array
          category: item.category,
          topic: extractTopic(remainingArticles[index]?.title || ""),
        };
      })
      .filter((item) => item.article !== undefined);

    // Phase 2.2: Topic clustering - filter out topics published within 24 hours
    const diverseSelected = [];
    for (const item of selected) {
      const isRecent = await isTopicRecent(
        item.topic,
        CONTENT_CONSTANTS.TOPIC_RECENCY_WINDOW_HOURS,
      );
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

    // Combine aggregated results with individual selections
    const finalResults = [...aggregatedResults, ...diverseSelected];

    console.log(
      `🎯 Final selection: ${finalResults.length} articles (${aggregatedResults.length} aggregated, ${diverseSelected.length} individual)`,
    );

    if (finalResults.length === 0) {
      throw new Error("AI could not select any articles");
    }

    return finalResults;
  } catch (error) {
    console.error("Haber analiz hatası, fallback uygulanıyor:", error);
    // Fallback: Take the first few unique ones
    return aiRelevantArticles.slice(0, targetCount).map((a) => ({
      article: a,
      category: "Yapay Zeka",
    }));
  }
}

/**
 * Process a single article: deep research, rewrite, get image, prepare for publishing
 * ENHANCED: Now includes deep research step for richer, more comprehensive content
 */
export async function processArticle(
  article: NewsArticle,
  category: string,
  tracer?: import("@/lib/pipeline-tracer").PipelineTracer,
): Promise<ProcessedArticle> {
  console.log(`📝 Haber işleniyor: ${article.title}`);

  // Block self-referencing: reject own site as source
  try {
    const hostname = new URL(article.url).hostname.toLowerCase();
    if (hostname === "aihaberleri.org" || hostname === "www.aihaberleri.org") {
      throw new Error(`Self-reference blocked: ${article.url}`);
    }
  } catch (e: any) {
    if (e.message?.includes("Self-reference")) throw e;
  }

  // Live log: Processing article
  await liveLog.content.info(
    `📝 İşleniyor: ${article.title.substring(0, 60)}...`,
  );

  try {
    // Step 1: Fetch full article content
    const fetchSpan = tracer?.span("fetch-article-content");
    await fetchSpan?.start({ url: article.url });
    const fullContent = await fetchArticleContent(article.url);
    await fetchSpan?.end({ contentLength: fullContent.length });

    // Step 1.1: 🆕 EARLY CONTENT VALIDATION - Catch garbage before processing
    console.log("🔍 Kaynak içerik kalite kontrolü yapılıyor...");

    const earlyValidation = ContentValidator.validate({
      title: article.title,
      content: fullContent,
      excerpt: article.description,
      sourceUrl: article.url,
    });

    if (earlyValidation.score < 40) {
      // Critical garbage - don't even try to process
      console.error(`❌ EARLY QUALITY GATE FAILED: Source content is garbage`);
      console.error(`   Score: ${earlyValidation.score}/100`);
      console.error(`   Issues: ${earlyValidation.issues.join(", ")}`);
      await liveLog.content.error(
        `❌ Kaynak içerik çok düşük kaliteli (${earlyValidation.score}/100): ${article.title.substring(0, 50)}...`,
      );
      throw new Error(
        `Source content quality too low (${earlyValidation.score}/100): ${earlyValidation.issues.slice(0, 3).join(", ")}`,
      );
    }

    if (earlyValidation.issues.length > 0) {
      console.log(
        `⚠️ Source content has issues (but passable): ${earlyValidation.issues.join(", ")}`,
      );
    }

    console.log(
      `✅ Kaynak içerik kalite kontrolünden geçti (${earlyValidation.score}/100)`,
    );

    // Content enrichment - use original content directly (Brave deep research removed)
    const enrichedContent = fullContent;
    const additionalSources: Array<{ title: string; url: string }> = [];

    // Step 2: Fetch recent articles for internal linking context (max 3 to avoid over-linking)
    const recentArticles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        category: { name: category },
      },
      select: { title: true, slug: true },
      take: CONTENT_CONSTANTS.MAX_INTERNAL_LINKS,
      orderBy: { createdAt: "desc" },
    });

    // Step 3: Rewrite article using DeepSeek
    console.log("🤖 DeepSeek ile içerik yeniden yazılıyor...");

    // Live log: Rewriting
    await liveLog.deepseek.info(
      `🤖 DeepSeek yeniden yazıyor: ${article.title.substring(0, 40)}...`,
    );

    // Define type for rewrite result to include score
    interface RewriteResult {
      title: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
      score?: number;
    }

    const rewriteSpan = tracer?.span("deepseek-rewrite");
    await rewriteSpan?.start({});
    const rewriteStart = Date.now();

    const rewritten = (await rewriteArticle(
      article.title,
      enrichedContent,
      category,
      recentArticles,
    )) as RewriteResult;

    const qualityControl = await runContentQualityController({
      rewritten: {
        title: rewritten.title,
        excerpt: rewritten.excerpt,
        content: rewritten.content,
        keywords: rewritten.keywords,
        metaTitle: rewritten.title,
        metaDescription: rewritten.metaDescription,
        score: rewritten.score || 0,
      },
      categoryName: category,
    });

    const score = qualityControl.rewritten.score || 0;
    console.log(`📊 Haber Puanı: ${score}/1000`);
    console.log(
      `🛂 Kontrol Agent Skoru: ${qualityControl.qualityScore}/100 (attempt: ${qualityControl.attemptsUsed}, forcedPass: ${qualityControl.forcedPass})`,
    );
    await rewriteSpan?.end({
      score,
      qualityScore: qualityControl.qualityScore,
      durationMs: Date.now() - rewriteStart,
    });

    // Live log: Rewritten
    await liveLog.deepseek.success(`✅ Yeniden yazıldı (Puan: ${score}/1000)`);

    // 🆕 Add sources footer to content
    let finalContent = qualityControl.rewritten.content;

    // Build sources list (original source only — Brave deep research removed)
    const allSources = [
      {
        title: new URL(article.url).hostname.replace("www.", ""),
        url: article.url,
      },
    ];

    // Create compact AI disclosure + sources footer
    const sourcesHtml = allSources
      .map(
        (s) =>
          `<a href="${s.url}" target="_blank" rel="noopener nofollow" class="source-link">${s.title}</a>`,
      )
      .join(" • ");

    finalContent += `
<div class="ai-disclosure" style="margin-top: 2.5rem; padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(147,51,234,0.08) 100%); border-radius: 12px; border: 1px solid rgba(59,130,246,0.15);">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;"><path d="M12 8V4H8"/><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8a4 4 0 0 1 0 8"/><path d="M12 8a4 4 0 0 0 0 8"/></svg>
    <span style="font-size: 0.75rem; font-weight: 600; color: #3b82f6;">Yapay Zeka Destekli İçerik</span>
  </div>
  
  <div style="font-size: 0.65rem; color: #94a3b8;">
    <strong style="color: #64748b;">Kaynaklar:</strong> ${sourcesHtml}
  </div>
</div>`;

    // Step 4: Generate AI image prompt using DeepSeek
    console.log("🎨 DeepSeek ile görsel prompt oluşturuluyor...");
    const imageSpan = tracer?.span("image-generation");
    await imageSpan?.start();
    const imagePrompt = await generateImagePrompt(
      qualityControl.rewritten.title,
      qualityControl.rewritten.content,
      category,
    );
    console.log("📝 Görsel prompt:", imagePrompt);

    // Step 5: Get image from Pollinations.ai
    console.log("🖼️  Pollinations.ai'dan görsel alınıyor...");
    let imageUrl = await fetchPollinationsImage(imagePrompt, {
      width: 1200,
      height: 630,
      model: "flux",
      enhance: true,
      nologo: true,
    });
    console.log("✅ Görsel URL:", imageUrl);

    // Step 5.5: Generate slug (needed for image optimization)
    const slug = generateSlug(qualityControl.rewritten.title);

    // Live log: Image generated
    await liveLog.image.success(`🖼️ Görsel oluşturuldu: ${slug}`);

    // Step 6: Optimize image and generate multiple sizes
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
      await imageSpan?.end({ prompt: imagePrompt.substring(0, 100) });
    } catch (optimizeError) {
      console.error(
        "⚠️  Görsel optimizasyonu başarısız, orijinal kullanılacak:",
        optimizeError,
      );
      await imageSpan?.end({ fallback: true });
      // Continue with original image URL for all sizes
    }

    // Step 7: Get or create category
    const categorySlug = generateSlug(category);
    await ensureCategory(category, categorySlug);

    return {
      title: qualityControl.rewritten.title,
      slug,
      excerpt: qualityControl.rewritten.excerpt,
      content: finalContent, // 🆕 Use content with AI disclosure footer
      imageUrl: imageSizes.large,
      imageUrlMedium: imageSizes.medium,
      imageUrlSmall: imageSizes.small,
      imageUrlThumb: imageSizes.thumb,
      sourceUrl: article.url,
      categorySlug,
      keywords: qualityControl.rewritten.keywords,
      metaTitle: qualityControl.rewritten.metaTitle,
      metaDescription: qualityControl.rewritten.metaDescription,
      score,
      qualityControl: {
        qualityScore: qualityControl.qualityScore,
        attemptsUsed: qualityControl.attemptsUsed,
        forcedPass: qualityControl.forcedPass,
        issues: qualityControl.issues,
      },
    };
  } catch (error) {
    // Enhanced error handling with context
    const errorMessage =
      error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Haber işleme hatası:", {
      article: article.title,
      url: article.url,
      error: errorMessage,
    });
    throw new Error(
      `Failed to process article "${article.title}": ${errorMessage}`,
    );
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

  // Live log: Publishing
  await liveLog.publish.info(
    `📤 Yayınlanıyor: ${processedArticle.title.substring(0, 50)}...`,
  );

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
      CONTENT_CONSTANTS.AGGREGATE_DUPLICATE_WINDOW_HOURS, // 48 hour window
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

    // ========================================================================
    // LAYER 3: CONTENT QUALITY VALIDATION (PRE-PUBLISH GATE)
    // Rejects garbage content, scraping artifacts, and malformed HTML
    // ========================================================================
    console.log(`🔍 İçerik kalite kontrolü yapılıyor...`);

    const validationResult = await validateAndFixContent({
      title: processedArticle.title,
      content: processedArticle.content,
      excerpt: processedArticle.excerpt,
      sourceUrl: processedArticle.sourceUrl,
    });

    if (!validationResult.success) {
      console.error(`❌ QUALITY CHECK FAILED: ${processedArticle.title}`);
      console.error(`   Issues: ${validationResult.issues.join(", ")}`);
      await liveLog.publish.error(
        `❌ Kalite kontrolü başarısız: ${processedArticle.title.substring(0, 50)}...`,
      );
      return null; // Skip publishing garbage content
    }

    // Apply auto-fixed content if available
    const finalContent = validationResult.content || processedArticle.content;
    const finalExcerpt = validationResult.excerpt || processedArticle.excerpt;

    if (validationResult.issues.length > 0) {
      console.log(
        `⚠️ Content passed with warnings: ${validationResult.issues.join(", ")}`,
      );
    }

    console.log(`✅ İçerik kalite kontrolünden geçti`);

    // Determine status based on score
    const score = processedArticle.score || 0;
    const status =
      score >= CONTENT_CONSTANTS.PUBLISH_SCORE_THRESHOLD
        ? "PUBLISHED"
        : "DRAFT";

    await upsertGlossaryWithArticleTerms({
      title: processedArticle.title,
      excerpt: finalExcerpt,
      content: finalContent,
      keywords: processedArticle.keywords,
      source: "CONTENT_PRE_PUBLISH_AGENT",
    }).catch((error: unknown) => {
      console.error("AI glossary enrichment failed (pre-publish):", error);
    });

    // Create article
    const article = await db.article.create({
      data: {
        title: processedArticle.title,
        slug: processedArticle.slug,
        excerpt: finalExcerpt, // Use validated/fixed excerpt
        content: finalContent, // Use validated/fixed content
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
        seoScore: processedArticle.qualityControl?.qualityScore,
        topic: processedArticle.topic, // NEW: Save topic from smart filtering
        agentLogId,
      },
    });

    if (processedArticle.qualityControl?.forcedPass) {
      const issueText = processedArticle.qualityControl.issues
        .slice(0, 5)
        .join(" | ");

      await db.sEORecommendation.create({
        data: {
          articleId: article.id,
          type: "CONTENT_QUALITY_LOW_VALUE",
          severity: "MEDIUM",
          message: `Kontroller Agent zorunlu geçiş verdi (max 2 rewrite sonrası). Attempts: ${processedArticle.qualityControl.attemptsUsed}`,
          suggestion:
            issueText ||
            "İçeriği editöryal gözden geçirip haber değerini artırın.",
          isResolved: false,
        },
      });
    }

    console.log(`✅ Haber yayınlandı: ${article.slug} (Skor: ${score})`);

    // 📋 Initialize social share tracking records for all platforms
    // This creates PENDING records so the admin panel shows accurate status
    await initializeShareRecords(article.id);

    // Live log: Published
    await liveLog.publish.success(
      `✅ Yayınlandı: ${article.title.substring(0, 50)}... (Skor: ${score})`,
    );

    // 🚀 CACHE: Invalidate articles cache when new article published
    try {
      const cache = getCache();
      await cache.invalidateByTag("articles");
      console.log("🗑️  Cache invalidated for tag: articles");
    } catch (cacheError) {
      console.error("❌ Cache invalidation error:", cacheError);
      // Don't fail article creation if cache invalidation fails
    }

    // Post-publish tasks: Indexing + Supplementary methods
    try {
      // 1. IndexNow + Google Indexing API (kota yönetimli, DB tracking)
      const { notifyTurkishArticle } =
        await import("@/lib/seo/indexing-tracker");
      notifyTurkishArticle(article.id, article.slug)
        .then((results) => {
          console.log(`✅ Turkish version notification results:`, results);
        })
        .catch((err) => {
          console.error("Turkish version notification error:", err);
        });

      // 2. Supplementary methods (WebSub, Sitemap Ping, CF Purge, Ping-o-Matic)
      const { aggressivelyIndexArticle } =
        await import("@/lib/seo/aggressive-indexing");
      aggressivelyIndexArticle(article.slug, article.id).catch((err) =>
        console.error("Supplementary indexing error:", err),
      );
    } catch (e) {
      console.error("Failed to trigger indexing:", e);
    }

    // Post to Twitter (Async)
    try {
      postTweet({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        categoryName: category.name,
      })
        .then(async (postId) => {
          if (postId) {
            await recordShareSuccess(article.id, "TWITTER", "tr", postId);
            console.log("🐦 Twitter paylaşıldı:", article.slug);
          }
        })
        .catch(async (err) => {
          await recordShareFailure(
            article.id,
            "TWITTER",
            "tr",
            err?.message || "Unknown error",
          );
          console.error("Async tweet failed:", err);
        });
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
      })
        .then(async (postId) => {
          if (postId) {
            await recordShareSuccess(article.id, "FACEBOOK", "tr", postId);
            // Eski flag'ı da güncelle (backward compatibility)
            await db.article.update({
              where: { id: article.id },
              data: { facebookShared: true },
            });
            console.log("📘 Facebook paylaşıldı:", article.slug);
          }
        })
        .catch(async (err) => {
          await recordShareFailure(
            article.id,
            "FACEBOOK",
            "tr",
            err?.message || "Unknown error",
          );
          console.error("Async Facebook post failed:", err);
        });
    } catch (e) {
      console.error("Failed to trigger Facebook post:", e);
    }

    // Post to Bluesky (Async)
    try {
      postToBluesky({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        imageUrl: processedArticle.imageUrl,
        categoryName: category.name,
      })
        .then(async (postId) => {
          if (postId) {
            await recordShareSuccess(article.id, "BLUESKY", "tr", postId);
            console.log("🦋 Bluesky paylaşıldı:", article.slug);
          }
        })
        .catch(async (err) => {
          await recordShareFailure(
            article.id,
            "BLUESKY",
            "tr",
            err?.message || "Unknown error",
          );
          console.error("Async Bluesky post failed:", err);
        });
    } catch (e) {
      console.error("Failed to trigger Bluesky post:", e);
    }

    // Post to Mastodon (Async)
    try {
      postToMastodon({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        imageUrl: processedArticle.imageUrl,
        categoryName: category.name,
      })
        .then(async (postId) => {
          if (postId) {
            await recordShareSuccess(article.id, "MASTODON", "tr", postId);
            console.log("🐘 Mastodon paylaşıldı:", article.slug);
          }
        })
        .catch(async (err) => {
          await recordShareFailure(
            article.id,
            "MASTODON",
            "tr",
            err?.message || "Unknown error",
          );
          console.error("Async Mastodon post failed:", err);
        });
    } catch (e) {
      console.error("Failed to trigger Mastodon post:", e);
    }

    // Translate article to English (Async)
    // FIXED: Properly handle async translation to avoid unhandled promise rejections
    try {
      translateAndSaveArticle(article.id, "tr").catch((err) => {
        // Log with context for debugging
        console.error(`[Translation] Failed for article ${article.id}:`, {
          title: article.title,
          slug: article.slug,
          error: err instanceof Error ? err.message : String(err),
        });
        // Note: Translation failure is non-critical, article remains published
      });
    } catch (e) {
      console.error("[Translation] Failed to trigger:", e);
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
 * ENHANCED: Now supports pre-aggregated articles from multi-source clustering
 * ENHANCED: Now supports topic field from smart filtering
 */
export async function processAndPublishArticles(
  articles: Array<{
    article: NewsArticle;
    category: string;
    aggregated?: ProcessedArticle;
    topic?: string; // NEW: Topic from smart filtering
  }>,
  agentLogId?: string,
  forceCategorySlug?: string,
): Promise<Array<{ id: string; slug: string }>> {
  const published = [];

  for (const { article, category, aggregated, topic } of articles) {
    try {
      let processed: ProcessedArticle;

      // Check if this is a pre-aggregated article (from multi-source clustering)
      if (aggregated) {
        console.log(`📦 Using pre-aggregated article: ${aggregated.title}`);
        processed = aggregated;

        // Override category slug if forced
        if (forceCategorySlug) {
          processed.categorySlug = forceCategorySlug;
        }

        // Add topic if provided
        if (topic) {
          processed.topic = topic;
        }
      } else {
        // ⚡ CRITICAL FIX: Check for duplicates BEFORE processing (saves image generation costs)
        console.log(
          `🔍 Pre-processing duplicate check: ${article.title.substring(0, 60)}...`,
        );

        const preCheckDuplicate = await isDuplicate(article);
        if (preCheckDuplicate) {
          console.log(
            `🗑️ Pre-check duplicate skipped (saved processing): ${article.title}`,
          );
          continue; // Skip to next article - don't waste resources on duplicate
        }

        // Normal single-source article processing
        // If forceCategorySlug is provided, use it instead of DeepSeek's category
        const targetCategory = forceCategorySlug
          ? await db.category.findUnique({ where: { slug: forceCategorySlug } })
          : null;

        const categoryToUse = targetCategory ? targetCategory.name : category;

        processed = await processArticle(article, categoryToUse);

        // Override category slug if forced
        if (forceCategorySlug) {
          processed.categorySlug = forceCategorySlug;
        }

        // Add topic if provided from smart filtering
        if (topic) {
          processed.topic = topic;
        }
      }

      const result = await publishArticle(processed, agentLogId);

      // CRITICAL: Only add to published array if not duplicate (result is not null)
      if (result) {
        published.push(result);
        console.log(
          `✅ Haber başarıyla yayınlandı: ${result.slug}${aggregated ? " (AGGREGATED)" : ""}`,
        );
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
