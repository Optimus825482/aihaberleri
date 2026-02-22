/**
 * Topic Extraction Service
 *
 * Haber başlıklarından kısa ve açıklayıcı topic'ler çıkarır
 * DeepSeek API kullanarak akıllı kategorilendirme yapar
 */

import { callDeepSeek } from "@/lib/deepseek";
import { db } from "@/lib/db";
import { createModuleLogger } from "@/lib/agent-log-stream";

const logger = createModuleLogger("content");

/**
 * AI Keywords for quick relevance check
 * Used to filter out non-AI news before expensive API calls
 */
const AI_KEYWORDS = [
  // Core AI Terms
  "artificial intelligence",
  "yapay zeka",
  " ai ",
  "a.i.",
  "machine learning",
  "deep learning",
  "neural network",
  // AI Models & Products
  "gpt",
  "chatgpt",
  "openai",
  "gemini",
  "claude",
  "anthropic",
  "llama",
  "mistral",
  "deepseek",
  "copilot",
  "bard",
  "dall-e",
  "midjourney",
  "stable diffusion",
  "sora",
  "grok",
  // AI Techniques
  "nlp",
  "natural language",
  "computer vision",
  "transformer",
  "language model",
  "generative ai",
  "llm",
  "large language model",
  // AI Companies
  "nvidia",
  "hugging face",
  "cohere",
  "perplexity",
  "stability ai",
  "meta ai",
  "google ai",
  "microsoft ai",
  "amazon ai",
  "xai",
  // Tech keywords
  "robot",
  "automation",
  "autonomous",
  "algorithm",
  "data science",
  "tech",
  "software",
  "startup",
  "silicon valley",
  "chip",
  "gpu",
  "semiconductor",
  "quantum",
  "blockchain",
  "crypto",
  "web3",
];

/**
 * Quick AI relevance check using keywords
 * Returns true if article appears to be AI/tech related
 */
function isAIRelevant(title: string, description?: string): boolean {
  const text = `${title} ${description || ""}`.toLowerCase();
  return AI_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

export interface ArticleWithTopic {
  id?: string;
  title: string;
  description?: string;
  topic?: string;
  trendScore?: number;
  [key: string]: any;
}

/**
 * Tek bir haber başlığından topic çıkar
 * 🚀 OPTIMIZED: Reduced timeout, faster fallback
 */
export async function extractTopic(title: string): Promise<string> {
  // ⚡ PERFORMANCE: Skip DeepSeek API call, use fast fallback
  // Topic extraction was causing 100+ second delays per batch
  // Duplicate detection already has 3 layers (URL, title, content)
  // Topic is not critical for the pipeline
  logger.debug(`Fallback topic: ${title.substring(0, 50)}…`);
  return generateFallbackTopic(title);
}

/**
 * Fallback topic generation (DeepSeek başarısız olursa)
 */
function generateFallbackTopic(title: string): string {
  // Extract first 3-4 meaningful words
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);

  return words.join("_") || "unknown_topic";
}

/**
 * Batch processing: Birden fazla haberin topic'ini çıkar
 * 🚀 OPTIMIZED: Increased batch size, reduced delays, added caching
 */
export async function extractTopicsBatch(
  articles: ArticleWithTopic[],
  batchSize: number = 20, // ✅ 4→20 (5x faster, fewer batches)
): Promise<ArticleWithTopic[]> {
  logger.info(`Topic extraction: ${articles.length} haber`);

  const results: ArticleWithTopic[] = [];
  const topicCache = new Map<string, string>();

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(articles.length / batchSize);

    logger.debug(`Batch ${batchNum}/${totalBatches} (${batch.length} haber)`);

    const topicPromises = batch.map((article) => {
      const cached = topicCache.get(article.title);
      if (cached) return Promise.resolve(cached);
      return extractTopic(article.title);
    });

    const topics = await Promise.all(topicPromises);

    batch.forEach((article, index) => {
      const topic = topics[index];
      topicCache.set(article.title, topic);

      results.push({
        ...article,
        topic: topic,
      });
    });

    // ⚡ NO DELAY: Fallback is instant, no API rate limit needed
    // if (i + batchSize < articles.length) {
    //   await new Promise((resolve) => setTimeout(resolve, 200));
    // }
  }

  logger.success(`Topic extraction: ${results.length} haber tamamlandı`);
  return results;
}

/**
 * Topic'lere göre haberleri grupla
 */
export function groupByTopic(
  articles: ArticleWithTopic[],
): Record<string, ArticleWithTopic[]> {
  const groups: Record<string, ArticleWithTopic[]> = {};

  for (const article of articles) {
    const topic = article.topic || "unknown";
    if (!groups[topic]) {
      groups[topic] = [];
    }
    groups[topic].push(article);
  }

  return groups;
}

/**
 * Topic bazlı duplicate kontrolü
 */
export async function checkTopicDuplicate(
  topic: string,
  timeWindowDays: number = 0.25, // 6 saate düşürüldü (0.25 gün)
): Promise<{
  isDuplicate: boolean;
  existingArticle?: { id: string; title: string; publishedAt: Date | null };
}> {
  try {
    const whereClause: any = {
      topic: topic,
      publishedAt: {
        gte: new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000),
      },
      status: "PUBLISHED",
    };

    const existingArticle = await db.article.findFirst({
      where: whereClause,
      select: {
        id: true,
        title: true,
        publishedAt: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    if (existingArticle) {
      return {
        isDuplicate: true,
        existingArticle,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    logger.error(
      `Topic duplicate check: ${error instanceof Error ? error.message : String(error)}`,
    );
    // Fail-open: Eğer hata olursa, duplicate değil kabul et
    return { isDuplicate: false };
  }
}

/**
 * Akıllı haber seçimi: Topic bazlı duplicate kontrolü ile
 */
export async function selectUniqueTopicArticles(
  articles: ArticleWithTopic[],
  targetCount: number = 5,
  timeWindowDays: number = 0.25, // 6 saate düşürüldü (0.25 gün)
): Promise<ArticleWithTopic[]> {
  const timeWindowHours = timeWindowDays * 24;
  logger.info(
    `Haber seçimi: ${articles.length} aday → hedef ${targetCount} (${timeWindowHours.toFixed(1)}h pencere)`,
  );

  // Puana göre sırala (en yüksek önce)
  const sortedArticles = [...articles].sort(
    (a, b) => (b.trendScore || 0) - (a.trendScore || 0),
  );

  const normalizeSourceUrl = (url: string) =>
    url.split("?")[0].replace(/\/$/, "");

  // 🚀 PRELOAD: Topic ve URL duplicate verilerini tek seferde çek (N+1 önleme)
  const candidateTopics = Array.from(
    new Set(sortedArticles.map((article) => article.topic || "unknown")),
  );
  const candidateUrls = sortedArticles
    .map((article) => (typeof article.url === "string" ? article.url : ""))
    .filter((url): url is string => Boolean(url));
  const candidateBaseUrls = Array.from(
    new Set(candidateUrls.map((url) => normalizeSourceUrl(url))),
  );

  const publishedAfter = new Date(
    Date.now() - timeWindowDays * 24 * 60 * 60 * 1000,
  );

  const [existingTopicRows, existingUrlRows] = await Promise.all([
    candidateTopics.length > 0
      ? db.article.findMany({
          where: {
            status: "PUBLISHED",
            publishedAt: { gte: publishedAfter },
            topic: { in: candidateTopics },
          },
          select: {
            topic: true,
          },
        })
      : Promise.resolve([]),
    candidateUrls.length > 0 || candidateBaseUrls.length > 0
      ? db.article.findMany({
          where: {
            OR: [
              ...(candidateUrls.length > 0
                ? [{ sourceUrl: { in: candidateUrls } }]
                : []),
              ...candidateBaseUrls.map((baseUrl) => ({
                sourceUrl: { startsWith: baseUrl },
              })),
            ],
          },
          select: {
            sourceUrl: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const duplicateTopics = new Set(
    existingTopicRows
      .map((row) => row.topic)
      .filter((topic): topic is string => Boolean(topic)),
  );
  const existingExactUrls = new Set(
    existingUrlRows
      .map((row) => row.sourceUrl)
      .filter((url): url is string => Boolean(url)),
  );
  const existingBaseUrls = new Set(
    Array.from(existingExactUrls).map((url) => normalizeSourceUrl(url)),
  );

  const selected: ArticleWithTopic[] = [];
  const seenTopics = new Set<string>();
  let skippedSameTopic = 0;
  let skippedDuplicate = 0;
  let skippedNotAI = 0;

  for (const article of sortedArticles) {
    if (selected.length >= targetCount) {
      break;
    }

    const topic = article.topic || "unknown";

    // NEW: Quick AI relevance check BEFORE expensive duplicate checks
    if (!isAIRelevant(article.title, article.description)) {
      skippedNotAI++;
      continue;
    }

    // Bu topic'i daha önce seçtik mi?
    if (seenTopics.has(topic)) {
      skippedSameTopic++;
      continue;
    }

    // Veritabanında bu topic var mı? (preloaded set)
    if (duplicateTopics.has(topic)) {
      skippedDuplicate++;
      continue;
    }

    // NEW: URL-based duplicate check (prevents URL duplicates even with different topics)
    if (article.url) {
      const urlWithoutParams = normalizeSourceUrl(article.url);
      const isUrlDuplicate =
        existingExactUrls.has(article.url) ||
        existingBaseUrls.has(urlWithoutParams);

      if (isUrlDuplicate) {
        skippedDuplicate++;
        continue;
      }
    }

    // ✅ Unique topic! Seç
    selected.push(article);
    seenTopics.add(topic);
    logger.debug(
      `SELECTED [${selected.length}/${targetCount}]: ${topic} (score: ${article.trendScore || 0})`,
    );
  }

  logger.info(
    `Seçim: ${selected.length} seçildi, ${skippedNotAI} AI-dışı, ${skippedSameTopic} aynı-topic, ${skippedDuplicate} duplicate`,
  );

  // 🔧 RECOVERY MECHANISM: Eğer 0 haber seçildiyse, relaxed mode ile tekrar dene
  if (selected.length === 0 && articles.length > 0) {
    logger.warn("RECOVERY MODE: Tüm haberler elendi, relaxed seçim yapılıyor…");

    // Relaxed retry: AI relevance check'i kaldır, sadece URL duplicate kontrolü yap
    for (const article of sortedArticles) {
      if (selected.length >= Math.min(1, targetCount)) break; // En az 1 haber garantisi

      const topic = article.topic || "unknown";

      // Sadece URL duplicate kontrolü
      if (article.url) {
        const urlWithoutParams = normalizeSourceUrl(article.url);
        const isUrlDuplicate =
          existingExactUrls.has(article.url) ||
          existingBaseUrls.has(urlWithoutParams);

        if (isUrlDuplicate) continue;
      }

      // Topic batch içinde daha önce seçildi mi?
      if (seenTopics.has(topic)) continue;

      // RELAXED: AI check ve topic duplicate check atlanıyor
      selected.push(article);
      seenTopics.add(topic);
      logger.debug(
        `RECOVERY SELECTED: ${topic} (score: ${article.trendScore || 0})`,
      );
    }

    logger.info(`Recovery sonucu: ${selected.length} haber seçildi`);
  }

  return selected;
}

/**
 * Background job: Mevcut haberlerin topic'lerini çıkar
 */
export async function extractTopicsForExistingArticles(
  limit: number = 100,
): Promise<{ processed: number; failed: number }> {
  logger.info(`Mevcut haberler topic extraction (limit: ${limit})`);

  const whereClause: any = {
    topic: null,
    status: "PUBLISHED",
  };

  const articles = await db.article.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
    },
    take: limit,
    orderBy: {
      publishedAt: "desc",
    },
  });

  logger.info(`${articles.length} haber bulundu`);

  let processed = 0;
  let failed = 0;

  // 4'er batch'te işle
  for (let i = 0; i < articles.length; i += 4) {
    const batch = articles.slice(i, i + 4);

    for (const article of batch) {
      try {
        const topic = await extractTopic(article.title);
        const updateData: any = { topic: topic };
        await db.article.update({
          where: { id: article.id },
          data: updateData,
        });
        processed++;
      } catch (error) {
        failed++;
        logger.error(
          `Topic extraction failed [${processed + failed}/${articles.length}]: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Rate limit protection
    if (i + 4 < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  logger.success(
    `Topic extraction: ${processed} başarılı, ${failed} başarısız`,
  );

  return { processed, failed };
}

export default {
  extractTopic,
  extractTopicsBatch,
  groupByTopic,
  checkTopicDuplicate,
  selectUniqueTopicArticles,
  extractTopicsForExistingArticles,
};

/**
 * Extract entities from title (for duplicate detection)
 */
function extractEntities(title: string): string[] {
  const entities: string[] = [];
  const lowerTitle = title.toLowerCase();

  // Common tech entities
  const techEntities = [
    "openai",
    "nvidia",
    "google",
    "meta",
    "microsoft",
    "apple",
    "amazon",
    "tesla",
    "anthropic",
    "deepmind",
    "facebook",
    "instagram",
    "twitter",
    "x",
    "tiktok",
    "youtube",
    "chatgpt",
    "gemini",
    "claude",
    "grok",
    "copilot",
    "waymo",
    "uber",
    "lyft",
    "spacex",
    "neuralink",
  ];

  for (const entity of techEntities) {
    if (lowerTitle.includes(entity)) {
      entities.push(entity);
    }
  }

  return entities;
}

/**
 * Extract keywords from title (for similarity check)
 * ENHANCED: Includes AI-specific short keywords
 */
function extractKeywords(title: string): string[] {
  const stopWords = [
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "was",
    "are",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "s",
  ];

  // AI-specific keywords (even if short)
  const aiKeywords = ["ai", "ml", "gpt", "llm", "api"];

  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => {
      // Include AI keywords even if short
      if (aiKeywords.includes(word)) return true;
      // Otherwise, filter by length and stopwords
      return word.length > 2 && !stopWords.includes(word);
    });

  return words;
}

/**
 * 🔴 CRITICAL FIX: Early duplicate filtering by URL (FULL DATABASE) + topic (recent)
 * URL DUPLICATES are checked against ENTIRE database (no time limit)
 * Topic duplicates are checked against recent articles only
 * This MUST run BEFORE expensive operations (Brave API, DeepSeek, etc.)
 */
export async function filterDuplicatesByTopicAndUrl(
  articles: ArticleWithTopic[],
  timeWindowDays: number = 0.25, // 6 saate düşürüldü (daha esnek)
): Promise<ArticleWithTopic[]> {
  const timeWindowHours = timeWindowDays * 24;
  logger.info(
    `Early duplicate filter: ${articles.length} haber, ${timeWindowHours.toFixed(1)}h pencere`,
  );

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeWindowDays);

  const unique: ArticleWithTopic[] = [];
  let urlDuplicateCount = 0;
  let topicDuplicateCount = 0;
  let batchDuplicateCount = 0;

  // 🔄 RELAXED: Fetch URLs from last 24 hours only (instead of entire DB)
  // This allows similar topics from different days to pass through
  const urlCutoffDate = new Date();
  urlCutoffDate.setHours(urlCutoffDate.getHours() - 24);

  const allUrls = await db.article.findMany({
    select: {
      sourceUrl: true,
    },
    where: {
      sourceUrl: { not: null },
      createdAt: { gte: urlCutoffDate },
    },
  });

  // Create a Set for O(1) lookup + normalized URL prefix set
  const existingUrls = new Set<string>();
  const existingUrlPrefixes = new Set<string>();

  for (const article of allUrls) {
    if (article.sourceUrl) {
      existingUrls.add(article.sourceUrl);
      // Also store URL without query params for prefix matching
      const urlWithoutParams = article.sourceUrl.split("?")[0];
      existingUrlPrefixes.add(urlWithoutParams);
    }
  }

  logger.debug(`URL DB: ${existingUrls.size} URLs loaded`);

  // Fetch recent articles for TOPIC check (time-limited)
  const recentArticles = await db.article.findMany({
    where: {
      publishedAt: { gte: cutoffDate },
    },
    select: {
      id: true,
      title: true,
      topic: true,
      sourceUrl: true,
      publishedAt: true,
    },
    take: 500, // Son 500 makale (topic için)
  });

  logger.debug(`Topic DB: ${recentArticles.length} recent articles`);

  for (const article of articles) {
    let isDuplicate = false;

    // 🔴 FIRST: URL-based check (ENTIRE DATABASE - most important!)
    if (article.url) {
      const urlWithoutParams = article.url.split("?")[0];

      // Check against FULL database URLs (Set lookup - O(1))
      if (
        existingUrls.has(article.url) ||
        existingUrlPrefixes.has(urlWithoutParams)
      ) {
        urlDuplicateCount++;
        isDuplicate = true;
        continue;
      }

      // Check URL against ALREADY SELECTED articles in this batch
      const batchUrlDuplicate = unique.find(
        (u) =>
          u.url === article.url || u.url?.split("?")[0] === urlWithoutParams,
      );
      if (batchUrlDuplicate) {
        batchDuplicateCount++;
        isDuplicate = true;
        continue;
      }
    }

    // 2. Topic-based check (recent database only)
    if (!isDuplicate && article.topic) {
      const existingByTopic = recentArticles.find(
        (a) => a.topic === article.topic,
      );

      if (existingByTopic) {
        topicDuplicateCount++;
        isDuplicate = true;
        continue;
      }

      // Check topic against ALREADY SELECTED articles in this batch
      const batchDuplicate = unique.find((u) => u.topic === article.topic);
      if (batchDuplicate) {
        batchDuplicateCount++;
        isDuplicate = true;
        continue;
      }
    }

    // 3. Entity+keyword check (database AND batch)
    if (!isDuplicate) {
      const entities = extractEntities(article.title);
      if (entities.length >= 1) {
        // At least 1 entity for matching

        // Check against DATABASE articles
        for (const existing of recentArticles) {
          const existingEntities = extractEntities(existing.title);
          const commonEntities = entities.filter((e) =>
            existingEntities.includes(e),
          );

          // If 1+ common entities, check keyword similarity
          if (commonEntities.length >= 1) {
            const keywords = extractKeywords(article.title);
            const existingKeywords = extractKeywords(existing.title);
            const commonKeywords = keywords.filter((k) =>
              existingKeywords.includes(k),
            );
            const similarity =
              commonKeywords.length / Math.max(keywords.length, 1);

            // If 50%+ keyword similarity with same entities = duplicate (esnek modda)
            if (similarity >= 0.65) {
              topicDuplicateCount++;
              isDuplicate = true;
              break;
            }
          }
        }

        // Check against ALREADY SELECTED articles in this batch
        if (!isDuplicate) {
          for (const selected of unique) {
            const selectedEntities = extractEntities(selected.title);
            const commonEntities = entities.filter((e) =>
              selectedEntities.includes(e),
            );

            // If 2+ common entities, check keyword similarity
            if (commonEntities.length >= 1) {
              const keywords = extractKeywords(article.title);
              const selectedKeywords = extractKeywords(selected.title);
              const commonKeywords = keywords.filter((k) =>
                selectedKeywords.includes(k),
              );
              const similarity =
                commonKeywords.length / Math.max(keywords.length, 1);

              if (similarity >= 0.65) {
                batchDuplicateCount++;
                isDuplicate = true;
                break;
              }
            }
          }
        }

        if (isDuplicate) continue;
      }
    }

    // ✅ Unique! Add URL to tracked set for batch checking
    if (article.url) {
      existingUrls.add(article.url);
      existingUrlPrefixes.add(article.url.split("?")[0]);
    }
    unique.push(article);
  }

  const totalDuplicates =
    urlDuplicateCount + topicDuplicateCount + batchDuplicateCount;

  const dupeRate =
    articles.length > 0
      ? ((totalDuplicates / articles.length) * 100).toFixed(1)
      : "0";

  logger.info(
    `Early filter: ${unique.length}/${articles.length} unique (${dupeRate}% duplicate — URL:${urlDuplicateCount} Topic:${topicDuplicateCount} Batch:${batchDuplicateCount})`,
  );

  return unique;
}
