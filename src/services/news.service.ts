/**
 * News Service - Handles news scraping and fetching with RSS + Trend Analysis
 */

import axios from "axios";
import {
  fetchAllRSSFeeds,
  filterRecentArticles,
  type RSSItem,
} from "@/lib/rss";
import { rankArticlesByTrendScore } from "@/lib/trend-scoring";
import { distance } from "fastest-levenshtein";
import { createModuleLogger } from "@/lib/agent-log-stream";
import { db } from "@/lib/db";
import { normalizeUrl } from "@/lib/url-utils";

const logger = createModuleLogger("rss");

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedDate?: string;
  source?: string;
  trendScore?: number;
  topic?: string; // Topic from smart filtering
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;

  const dist = distance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - dist / maxLength;
}

/**
 * Token-based similarity (Jaccard similarity - word order independent)
 * NEW: Added on 08.02.2026 to catch duplicates with different word order
 * Example: "Google Chrome Auto Browse tanıttı" vs "Auto Browse Google Chrome'da tanıtıldı"
 */
function calculateTokenSimilarity(str1: string, str2: string): number {
  const stopWords = [
    "haber",
    "için",
    "olan",
    "bir",
    "ile",
    "yeni",
    "dedi",
    "etti",
    "oldu",
    "news",
    "this",
    "that",
    "with",
    "from",
    "will",
    "new",
    "the",
    "and",
  ];

  const tokenize = (str: string): Set<string> => {
    return new Set(
      str
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.includes(word)),
    );
  };

  const tokens1 = tokenize(str1);
  const tokens2 = tokenize(str2);

  if (tokens1.size === 0 || tokens2.size === 0) {
    return 0;
  }

  const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Extract main keywords from text (remove stop words)
 * EXPANDED: Added more Turkish/English stopwords (08.02.2026)
 */
function extractKeywords(text: string): string[] {
  const stopWords = [
    // Turkish
    "haber",
    "için",
    "olan",
    "bir",
    "ile",
    "yeni",
    "dedi",
    "etti",
    "oldu",
    "yapıldı",
    "açıkladı",
    "belirtti",
    "göre",
    "olarak",
    "gibi",
    "kadar",
    "sonra",
    "önce",
    "şimdi",
    "bugün",
    "dün",
    "yarın",
    "çok",
    "daha",
    "var",
    "yok",
    "ama",
    "veya",
    "ancak",
    "böyle",
    "şöyle",
    "her",
    "bazı",
    // English
    "news",
    "this",
    "that",
    "with",
    "from",
    "will",
    "new",
    "the",
    "and",
    "said",
    "announced",
    "revealed",
    "launched",
    "released",
    "according",
    "has",
    "have",
    "been",
    "was",
    "were",
    "are",
    "can",
    "could",
    "would",
    "about",
    "after",
    "before",
    "now",
    "today",
    "yesterday",
    "tomorrow",
    "more",
    "some",
    "very",
    "also",
    "just",
    "only",
    "such",
    "than",
    "then",
  ];

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\sğüşıöçĞÜŞİÖÇ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .filter((w) => !stopWords.includes(w));
}

/**
 * Extract numbers with units (milyar/milyon/billion/million) from text
 * This helps detect duplicate news about same financial deals
 */
function extractNumbersWithUnits(text: string): string[] {
  const lowerText = text.toLowerCase();
  const numbers: string[] = [];

  // Match patterns like "10 milyar", "500 milyon", "1.5 billion"
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(milyar|milyon|trilyon|billion|million|trillion)/gi,
    /\$(\d+(?:[.,]\d+)?)\s*(b|m|t)\b/gi, // $10B, $500M
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(lowerText)) !== null) {
      // Normalize: "10 milyar" -> "10_milyar"
      const unit = match[2]
        .toLowerCase()
        .replace("billion", "milyar")
        .replace("million", "milyon")
        .replace("b", "milyar")
        .replace("m", "milyon");
      const normalized = `${match[1]}_${unit}`;
      numbers.push(normalized);
    }
  }

  return numbers;
}

/**
 * Extract entities (company names, product names) from text
 * ENHANCED: Added key people titles and action keywords for better matching
 */
function extractEntities(text: string): string[] {
  const knownEntities = [
    // AI Companies
    "openai",
    "anthropic",
    "deepseek",
    "mistral",
    "cohere",
    "hugging face",
    "stability ai",
    // Big Tech
    "google",
    "microsoft",
    "meta",
    "apple",
    "amazon",
    "nvidia",
    "tesla",
    "samsung",
    // AI Models & Products
    "gpt",
    "gpt-4",
    "gpt-5",
    "chatgpt",
    "gemini",
    "claude",
    "llama",
    "copilot",
    "bard",
    "palm",
    "dall-e",
    "sora",
    "midjourney",
    "stable diffusion",
    "whisper",
    "grok",
    // Key People
    "sam altman",
    "elon musk",
    "sundar pichai",
    "satya nadella",
    "mark zuckerberg",
    "jensen huang",
    // 🆕 Key action words (helps identify same story)
    "yatırım",
    "investment",
    "ortaklık",
    "partnership",
    "satın alma",
    "acquisition",
  ];

  const lowerText = text.toLowerCase();
  return knownEntities.filter((entity) => lowerText.includes(entity));
}

/**
 * Popular topics that need extended duplicate check window (7 days instead of 4)
 */
const POPULAR_TOPICS = [
  // AI Models & Products
  "gpt",
  "gpt-4",
  "gpt-5",
  "chatgpt",
  "gemini",
  "claude",
  "copilot",
  "sora",
  "grok",
  // Companies
  "openai",
  "anthropic",
  "deepseek",
  "google ai",
  "microsoft",
  "meta",
  "apple",
  "nvidia",
  "tesla",
  "amazon",
  // Key People
  "sam altman",
  "elon musk",
  "sundar pichai",
  "jensen huang",
];

/**
 * Check if a news article is duplicate based on title and content similarity
 * @param title - Article title
 * @param content - Article content (optional)
 * @param timeWindowHours - Time window to check for duplicates (default: 96 hours)
 * @returns true if duplicate found, false otherwise
 */
export async function isDuplicateNews(
  title: string,
  content?: string,
  timeWindowHours: number = 96, // Increased from 48 to 96 hours (4 days)
): Promise<{
  isDuplicate: boolean;
  reason?: string;
  similarArticleId?: string;
}> {
  try {
    // Check if this is a popular topic - extend window to 7 days
    const lowerTitle = title.toLowerCase();
    const isPopularTopic = POPULAR_TOPICS.some((topic) =>
      lowerTitle.includes(topic),
    );

    if (isPopularTopic) {
      timeWindowHours = 168; // 7 days for popular topics
      console.log(
        `🔍 Popular topic detected - extending duplicate check to 7 days`,
      );
    }

    // Fetch recent articles within time window
    const recentArticles = await db.article.findMany({
      where: {
        publishedAt: {
          gte: new Date(Date.now() - timeWindowHours * 60 * 60 * 1000),
        },
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        content: true,
        slug: true,
        publishedAt: true,
      },
    });

    console.log(
      `🔍 Checking for duplicates among ${recentArticles.length} recent articles...`,
    );

    for (const article of recentArticles) {
      // 1. Exact Title Match
      if (title.toLowerCase() === article.title.toLowerCase()) {
        console.log(
          `❌ DUPLICATE: Exact title match with article ${article.id}`,
        );
        return {
          isDuplicate: true,
          reason: "EXACT_TITLE_MATCH",
          similarArticleId: article.id,
        };
      }

      // 2. Title Similarity Check (75%+ similar - RELAXED from 65% on 08.02.2026)
      // Increased to reduce false positives while maintaining duplicate detection
      const titleSimilarity = calculateSimilarity(title, article.title);
      if (titleSimilarity > 0.75) {
        console.log(
          `❌ DUPLICATE: Title similarity ${(titleSimilarity * 100).toFixed(1)}% with article ${article.id}`,
        );
        console.log(`   New: "${title}"`);
        console.log(`   Existing: "${article.title}"`);
        return {
          isDuplicate: true,
          reason: `TITLE_SIMILARITY_${(titleSimilarity * 100).toFixed(0)}%`,
          similarArticleId: article.id,
        };
      }

      // 2.1. Token-based similarity (NEW - 08.02.2026)
      // Catches duplicates with different word order
      const tokenSimilarity = calculateTokenSimilarity(title, article.title);
      if (tokenSimilarity > 0.65) {
        console.log(
          `❌ DUPLICATE: Token overlap ${(tokenSimilarity * 100).toFixed(1)}% with article ${article.id}`,
        );
        console.log(`   New: "${title}"`);
        console.log(`   Existing: "${article.title}"`);
        return {
          isDuplicate: true,
          reason: `TOKEN_OVERLAP_${(tokenSimilarity * 100).toFixed(0)}%`,
          similarArticleId: article.id,
        };
      }

      // 2.5. Keyword Overlap Check (ENHANCED - multiple thresholds)
      const newKeywords = extractKeywords(title);
      const existingKeywords = extractKeywords(article.title);

      if (newKeywords.length > 0 && existingKeywords.length > 0) {
        const intersection = newKeywords.filter((k) =>
          existingKeywords.includes(k),
        );
        const keywordOverlap =
          intersection.length /
          Math.max(newKeywords.length, existingKeywords.length);

        // 🆕 Tier 1: 4+ common keywords = very likely same story
        if (intersection.length >= 4 && keywordOverlap > 0.4) {
          console.log(
            `❌ DUPLICATE: Strong keyword overlap - ${intersection.length} common words (${(keywordOverlap * 100).toFixed(1)}%) with article ${article.id}`,
          );
          console.log(`   Common: [${intersection.join(", ")}]`);
          return {
            isDuplicate: true,
            reason: `STRONG_KEYWORD_MATCH_${intersection.length}_WORDS`,
            similarArticleId: article.id,
          };
        }

        // Tier 2: 60%+ overlap (original check)
        if (keywordOverlap > 0.6) {
          console.log(
            `❌ DUPLICATE: Keyword overlap ${(keywordOverlap * 100).toFixed(1)}% with article ${article.id}`,
          );
          console.log(
            `   New keywords: [${newKeywords.slice(0, 5).join(", ")}]`,
          );
          console.log(
            `   Existing keywords: [${existingKeywords.slice(0, 5).join(", ")}]`,
          );
          console.log(`   Common: [${intersection.slice(0, 5).join(", ")}]`);
          return {
            isDuplicate: true,
            reason: `KEYWORD_OVERLAP_${(keywordOverlap * 100).toFixed(0)}%`,
            similarArticleId: article.id,
          };
        }
      }

      // 2.6. Entity Match Check (ENHANCED - same entities + similar time)
      const newEntities = extractEntities(title);
      const existingEntities = extractEntities(article.title);

      if (newEntities.length > 0 && existingEntities.length > 0) {
        const entityIntersection = newEntities.filter((e) =>
          existingEntities.includes(e),
        );

        if (entityIntersection.length > 0) {
          const timeDiff = article.publishedAt
            ? Date.now() - new Date(article.publishedAt).getTime()
            : Date.now();
          const hoursDiff = timeDiff / (60 * 60 * 1000);

          // NEW: Check for same financial numbers (10 milyar, 500 milyon, etc.)
          const newNumbers = extractNumbersWithUnits(title);
          const existingNumbers = extractNumbersWithUnits(article.title);
          const numberIntersection = newNumbers.filter((n) =>
            existingNumbers.includes(n),
          );

          // STRONG DUPLICATE: 2+ same entities + same numbers + within 48 hours
          if (
            entityIntersection.length >= 2 &&
            numberIntersection.length > 0 &&
            hoursDiff < 48
          ) {
            console.log(
              `❌ DUPLICATE: Multi-entity + number match [${entityIntersection.join(", ")}] + [${numberIntersection.join(", ")}]`,
            );
            console.log(`   New: "${title}"`);
            console.log(`   Existing: "${article.title}"`);
            return {
              isDuplicate: true,
              reason: `MULTI_ENTITY_NUMBER_MATCH`,
              similarArticleId: article.id,
            };
          }

          // 🔧 RELAXED: 12h→24h, 50%→60% similarity (08.02.2026)
          // More lenient to allow different angles on same topic
          if (
            entityIntersection.length >= 2 &&
            hoursDiff < 24 &&
            titleSimilarity > 0.6
          ) {
            console.log(
              `❌ DUPLICATE: Multi-entity match [${entityIntersection.join(", ")}] + ${(titleSimilarity * 100).toFixed(1)}% similarity within 24h`,
            );
            console.log(`   New: "${title}"`);
            console.log(`   Existing: "${article.title}"`);
            return {
              isDuplicate: true,
              reason: `MULTI_ENTITY_SAME_STORY`,
              similarArticleId: article.id,
            };
          }

          // 🔧 RELAXED: 4+ entity 6h → 5+ entity 12h (08.02.2026)
          // Requires more entities and longer time window for duplicate detection
          if (entityIntersection.length >= 5 && hoursDiff < 12) {
            console.log(
              `❌ DUPLICATE: Multi-entity match [${entityIntersection.join(", ")}] within 6h`,
            );
            console.log(`   New: "${title}"`);
            console.log(`   Existing: "${article.title}"`);
            return {
              isDuplicate: true,
              reason: `MULTI_ENTITY_SAME_DAY`,
              similarArticleId: article.id,
            };
          }

          // Same entities within 48 hours + moderate title similarity = likely duplicate
          // RELAXED: 72h -> 48h, 45% -> 55% (01.02.2026)
          if (hoursDiff < 48 && titleSimilarity > 0.55) {
            console.log(
              `❌ DUPLICATE: Entity match [${entityIntersection.join(", ")}] + ${(titleSimilarity * 100).toFixed(1)}% title similarity`,
            );
            console.log(`   Time difference: ${hoursDiff.toFixed(1)} hours`);
            return {
              isDuplicate: true,
              reason: `ENTITY_MATCH_${entityIntersection[0].toUpperCase()}`,
              similarArticleId: article.id,
            };
          }
        }
      }

      // 3. Slug Prefix Match (first 40 characters)
      const newSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 40);

      const existingSlugPrefix = article.slug.substring(0, 40);

      if (newSlug === existingSlugPrefix && newSlug.length > 20) {
        console.log(
          `❌ DUPLICATE: Slug prefix match with article ${article.id}`,
        );
        return {
          isDuplicate: true,
          reason: "SLUG_PREFIX_MATCH",
          similarArticleId: article.id,
        };
      }

      // 4. Content Similarity Check (if content provided)
      if (content && article.content) {
        // Compare first 300 characters of content
        const contentPreview1 = content.substring(0, 300).toLowerCase();
        const contentPreview2 = article.content.substring(0, 300).toLowerCase();

        const contentSimilarity = calculateSimilarity(
          contentPreview1,
          contentPreview2,
        );

        if (contentSimilarity > 0.7) {
          console.log(
            `❌ DUPLICATE: Content similarity ${(contentSimilarity * 100).toFixed(1)}% with article ${article.id}`,
          );
          return {
            isDuplicate: true,
            reason: `CONTENT_SIMILARITY_${(contentSimilarity * 100).toFixed(0)}%`,
            similarArticleId: article.id,
          };
        }
      }
    }

    console.log(`✅ No duplicates found for: "${title.substring(0, 60)}..."`);
    return { isDuplicate: false };
  } catch (error) {
    console.error("❌ Error checking for duplicates:", error);
    // On error, allow the article to be published (fail-open)
    return { isDuplicate: false };
  }
}

/**
 * AI Keywords for filtering news articles
 * Only articles containing these keywords will be considered
 */
const AI_KEYWORDS = [
  // Core AI Terms
  "artificial intelligence",
  "yapay zeka",
  " ai ", // ✅ FIX: Space on both sides to avoid "campaign", "detail", etc.
  "a.i.",
  "machine learning",
  "makine öğrenmesi",
  "makine ogrenmesi",
  "deep learning",
  "derin öğrenme",
  "derin ogrenme",
  "neural network",
  "sinir ağı",
  "sinir agi",

  // AI Models & Products (tightened - removed ambiguous terms like "gemini", "copilot", "robot")
  "gpt",
  "chatgpt",
  "openai",
  "claude ai",
  "anthropic",
  "mistral ai",
  "deepseek",
  "dall-e",
  "midjourney",
  "stable diffusion",
  "sora ai",

  // AI Techniques
  "nlp",
  "natural language processing",
  "doğal dil işleme",
  "dogal dil isleme",
  "computer vision",
  "bilgisayarlı görü",
  "bilgisayarli goru",
  "transformer model",
  "language model",
  "dil modeli",
  "generative ai",
  "üretken yapay zeka",
  "uretken yapay zeka",
  "large language model",
  "llm",
  "büyük dil modeli",

  // AI Companies (specific AI context)
  "nvidia ai",
  "nvidia cuda",
  "tesla autopilot",
  "otonom sürüş",
  "otonom surus",
  "hugging face",
  "cohere ai",
  "stability ai",
  "runway ai",
  "google ai",
  "microsoft ai",
  "meta ai",
  "amazon ai",
  "perplexity ai",

  // AI Applications
  "chatbot",
  "sohbet botu",
  "ai assistant",
  "ai asistan",
  "yapay zeka asistan",
  "ai tool",
  "ai araç",
  "ai arac",
  "ai agent",
  "ai coding",
  "code generation",
  "image generation",
  "text-to-image",
  "text-to-video",

  // AI Ethics & Regulation
  "ai ethics",
  "ai etik",
  "yapay zeka etiği",
  "yapay zeka etigi",
  "ai regulation",
  "ai düzenleme",
  "ai duzenleme",
  "ai safety",
  "ai güvenlik",
  "ai guvenlik",
  "ai bias",
  "ai önyargı",
  "ai onyargi",
  "agi",
  "artificial general intelligence",
];

/**
 * Filter articles by AI keywords
 * Only keeps articles that contain at least one AI keyword
 */
function filterByAIKeywords(items: RSSItem[]): RSSItem[] {
  return items.filter((item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return AI_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
  });
}

/**
 * Convert RSS items to NewsArticle format
 */
function convertRSSToNews(items: RSSItem[]): NewsArticle[] {
  return items.map((item) => ({
    title: item.title,
    description: item.description,
    url: item.link,
    publishedDate: item.pubDate,
    source: item.source,
    trendScore: (item as any).trendScore,
  }));
}

/**
 * Fetch AI news from RSS feeds with trend analysis
 */
export async function fetchAINews(
  categoryFilter?: string,
): Promise<NewsArticle[]> {
  console.log(
    `📰 AI haberleri toplanıyor${categoryFilter ? ` (${categoryFilter})` : ""}...`,
  );

  try {
    // Step 1: Fetch all RSS feeds
    const rssItems = await fetchAllRSSFeeds();

    if (rssItems.length === 0) {
      console.log("⚠️  RSS'den haber alınamadı");
      return [];
    }

    console.log(`📥 RSS: ${rssItems.length} haber`);

    // URL Filtering (son 12 saat)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const recentUrls = await db.article.findMany({
      where: {
        publishedAt: { gte: twelveHoursAgo },
      },
      select: { sourceUrl: true },
    });

    const recentUrlSet = new Set(
      recentUrls
        .filter((a): a is { sourceUrl: string } => a.sourceUrl !== null)
        .map((a) => normalizeUrl(a.sourceUrl)),
    );

    // Filter RSS items - ONLY NEW URLs
    const newRssItems = rssItems.filter((item) => {
      const normalized = normalizeUrl(item.link);
      return !recentUrlSet.has(normalized);
    });

    console.log(
      `🔍 URL filter: ${recentUrlSet.size} known, ${newRssItems.length}/${rssItems.length} new`,
    );

    if (newRssItems.length === 0) {
      console.log("⚠️ Tüm haberler zaten yayınlanmış");
      return [];
    }

    // Filter by category keywords if specified
    let filteredItems = newRssItems;
    if (categoryFilter) {
      const categoryKeywords = getCategoryKeywords(categoryFilter);
      console.log(
        `🔍 Kategori filtresi: "${categoryFilter}" (${categoryKeywords.length} keyword)`,
      );

      filteredItems = newRssItems.filter((item) => {
        const text = `${item.title} ${item.description}`.toLowerCase();
        return categoryKeywords.some((keyword) => text.includes(keyword));
      });

      console.log(
        `✅ Kategori: ${filteredItems.length}/${newRssItems.length} uygun`,
      );

      if (filteredItems.length === 0) {
        console.log("⚠️ Kategoriye uygun haber yok, tümü kullanılacak");
        filteredItems = newRssItems;
      }
    }

    // Filter recent articles (last 48 hours)
    const recentItems = filterRecentArticles(filteredItems, 48);
    console.log(`📅 Son 48 saat: ${recentItems.length} haber`);

    // SMART SAMPLING: Prioritize recent + diverse sources
    let itemsToAnalyze = recentItems.length > 0 ? recentItems : filteredItems;

    // Filter Reddit discussion posts
    const REDDIT_DISCUSSION_PATTERNS =
      /^\s*\[(D|R|P|Discussion|Research|Project)\]/i;
    itemsToAnalyze = itemsToAnalyze.filter(
      (item) => !REDDIT_DISCUSSION_PATTERNS.test(item.title),
    );

    // Smart sampling if too many articles
    const MAX_ARTICLES_TO_ANALYZE = 100;
    if (itemsToAnalyze.length > MAX_ARTICLES_TO_ANALYZE) {
      itemsToAnalyze = itemsToAnalyze
        .sort(
          (a, b) =>
            new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
        )
        .slice(0, MAX_ARTICLES_TO_ANALYZE);
    }

    console.log(
      `✅ ${itemsToAnalyze.length} haber trend puanlamaya gönderilecek`,
    );

    // Step 3: Multi-signal trend scoring v3.0 (NO external API dependency)
    console.log(
      `📊 ${itemsToAnalyze.length} haber için trend puanlama (7-signal v3)...`,
    );

    const trendRankings = rankArticlesByTrendScore(
      itemsToAnalyze.map((item) => ({
        title: item.title,
        description: item.description,
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        source: item.source,
        url: item.link,
      })),
    );

    // v3.0: No SearXNG verification — all signals are local
    const verifiedRankings = trendRankings;

    // Step 4: Sort by trend score and take top articles with EARLY DB CHECK
    // 🎯 OPTIMIZED: Progressive DB Check (09.02.2026 - V2)
    // Duplicate olanları eleyip KALAN haberlerden devam et
    // Top 10 duplicate olsa bile 11-77 arasından unique bul

    const BATCH_SIZE = 2; // Her seferinde 2 makale kontrol et
    const MIN_UNIQUE_NEEDED = 2; // En az 2 unique makale bul
    const TOTAL_ARTICLES = verifiedRankings.length;
    const MAX_BATCHES = Math.ceil(TOTAL_ARTICLES / BATCH_SIZE); // TÜM listeyi tara
    // Extended type: RSSItem + trendScore (for sorting & display)
    type RSSItemWithScore = (typeof itemsToAnalyze)[0] & {
      trendScore?: number;
    };
    let topArticles: RSSItemWithScore[] = [];
    let batchIndex = 0;

    while (topArticles.length < MIN_UNIQUE_NEEDED && batchIndex < MAX_BATCHES) {
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = startIdx + BATCH_SIZE;
      const batchRankings = verifiedRankings.slice(startIdx, endIdx);

      if (batchRankings.length === 0) break;

      // Her makale için veritabanında var mı kontrol et
      const uniqueArticles: RSSItemWithScore[] = [];

      for (const ranking of batchRankings) {
        const item = itemsToAnalyze[ranking.index];
        const normalizedUrl = normalizeUrl(item.link);

        // DB'de bu URL veya benzer başlık var mı kontrol et
        const existingArticle = await db.article.findFirst({
          where: {
            OR: [{ sourceUrl: normalizedUrl }, { sourceUrl: item.link }],
          },
          select: { id: true, title: true },
        });

        if (existingArticle) {
          // Skip — already in DB
        } else {
          const itemWithScore: RSSItemWithScore = {
            ...item,
            trendScore: ranking.score,
          };
          uniqueArticles.push(itemWithScore);
        }
      }

      if (uniqueArticles.length > 0) {
        topArticles.push(...uniqueArticles);
      }

      // Her zaman sonraki batch'e geç (MIN_UNIQUE_NEEDED'a ulaşana kadar)
      batchIndex++;
    }

    // Hiç unique makale bulunamadıysa
    if (topArticles.length === 0) {
      console.log(`⚠️ ${TOTAL_ARTICLES} makalede hiçbiri unique değil`);
      return [];
    }

    // Sıralama
    topArticles = topArticles.sort(
      (a, b) => (b.trendScore || 0) - (a.trendScore || 0),
    );

    console.log(
      `✅ ${topArticles.length} unique trend haber seçildi (${batchIndex} batch tarandı)`,
    );

    return convertRSSToNews(topArticles);
  } catch (error) {
    console.error("❌ Haber toplama hatası:", error);
    throw error;
  }
}

/**
 * Get category-specific keywords for filtering
 */
function getCategoryKeywords(categorySlug: string): string[] {
  const keywordMap: Record<string, string[]> = {
    "makine-ogrenmesi": [
      "machine learning",
      "ml",
      "deep learning",
      "neural network",
      "training",
      "model",
      "dataset",
      "supervised",
      "unsupervised",
      "reinforcement",
      "tensorflow",
      "pytorch",
      "scikit",
    ],
    "dogal-dil-isleme": [
      "nlp",
      "natural language",
      "language model",
      "llm",
      "gpt",
      "bert",
      "transformer",
      "chatbot",
      "text",
      "translation",
      "sentiment",
    ],
    "bilgisayarli-goru": [
      "computer vision",
      "image",
      "video",
      "object detection",
      "face recognition",
      "segmentation",
      "opencv",
      "yolo",
      "cnn",
      "visual",
    ],
    robotik: [
      "robot",
      "robotics",
      "autonomous",
      "drone",
      "automation",
      "sensor",
      "actuator",
      "ros",
      "manipulation",
    ],
    "yapay-zeka-etigi": [
      "ethics",
      "bias",
      "fairness",
      "privacy",
      "regulation",
      "responsible ai",
      "explainable",
      "transparency",
      "safety",
    ],
    "yapay-zeka-araclari": [
      "tool",
      "framework",
      "library",
      "api",
      "platform",
      "sdk",
      "service",
      "cloud",
      "openai",
      "anthropic",
      "google ai",
    ],
    "sektor-haberleri": [
      "company",
      "startup",
      "funding",
      "acquisition",
      "partnership",
      "market",
      "industry",
      "business",
      "investment",
    ],
    arastirma: [
      "research",
      "paper",
      "study",
      "arxiv",
      "conference",
      "breakthrough",
      "discovery",
      "experiment",
      "academic",
    ],
  };

  return keywordMap[categorySlug] || [];
}

/**
 * Validate content quality - detect Jina Reader errors and garbage content
 * Returns true if content is valid, false if it contains error patterns
 */
function isValidContent(content: string): { valid: boolean; reason?: string } {
  const lowerContent = content.toLowerCase();

  // Critical error patterns that indicate scraping failure
  const errorPatterns = [
    { pattern: "shadow dom", reason: "Shadow DOM barrier detected" },
    { pattern: "warning:", reason: "Warning message in content" },
    { pattern: "published time:", reason: "Raw metadata instead of content" },
    { pattern: "unable to access", reason: "Access restriction" },
    { pattern: "javascript required", reason: "JS-only site" },
    { pattern: "enable javascript", reason: "JS-only site" },
    { pattern: "cookies must be enabled", reason: "Cookie wall" },
    { pattern: "please enable cookies", reason: "Cookie wall" },
    { pattern: "access denied", reason: "Access denied" },
    { pattern: "403 forbidden", reason: "403 Forbidden" },
    { pattern: "captcha", reason: "CAPTCHA challenge" },
    { pattern: "robot verification", reason: "Bot detection" },
  ];

  for (const { pattern, reason } of errorPatterns) {
    if (lowerContent.includes(pattern)) {
      return { valid: false, reason };
    }
  }

  // Check for gibberish: too many special characters relative to alphanumeric
  const alphanumeric = (
    content.match(/[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g) || []
  ).length;
  const total = content.length;
  const alphaRatio = alphanumeric / total;

  if (alphaRatio < 0.5 && total > 100) {
    return {
      valid: false,
      reason: `Low text quality (${Math.round(alphaRatio * 100)}% alphanumeric)`,
    };
  }

  return { valid: true };
}

/**
 * Fetch article content from URL using Jina Reader API
 * ENHANCED: Now validates content quality and rejects garbage content
 */
export async function fetchArticleContent(url: string): Promise<string> {
  try {
    console.log(`📄 Makale içeriği alınıyor: ${url}`);

    // Try Jina Reader first (AI-powered content extraction)
    if (process.env.JINA_READER_API_KEY) {
      try {
        console.log("🔄 Jina Reader ile içerik çekiliyor...");
        const jinaUrl = `https://r.jina.ai/${url}`;
        const jinaResponse = await axios.get(jinaUrl, {
          timeout: 15000,
          headers: {
            Authorization: `Bearer ${process.env.JINA_READER_API_KEY}`,
            "X-Return-Format": "text",
          },
        });

        let jinaContent = jinaResponse.data;

        // Clean up Jina output (markdown links etc)
        jinaContent = jinaContent.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1"); // Remove links

        // 🛡️ VALIDATE CONTENT QUALITY - Detect Jina Reader errors
        const validation = isValidContent(jinaContent);
        if (!validation.valid) {
          console.warn(`⚠️ Jina Reader içerik geçersiz: ${validation.reason}`);
          console.warn(`   URL: ${url}`);
          console.warn(
            `   İçerik önizleme: ${jinaContent.substring(0, 100)}...`,
          );
          throw new Error(`Invalid content: ${validation.reason}`);
        }

        if (jinaContent.length > 200) {
          console.log(
            `✅ Jina Reader ile içerik alındı: ${jinaContent.length} karakter`,
          );
          return jinaContent.substring(0, 10000);
        }
      } catch (jinaError) {
        console.warn(
          "⚠️  Jina Reader başarısız, fallback yöntemi deneniyor...",
        );
      }
    }

    // Fallback: Direct fetch with browser-like headers
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];
    const randomUserAgent =
      userAgents[Math.floor(Math.random() * userAgents.length)];

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": randomUserAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
        Referer: "https://www.google.com/",
        Connection: "keep-alive",
        "Sec-Ch-Ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-User": "?1",
      },
    });

    const html = response.data;

    let content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    content = content.substring(0, 10000);

    if (content.length < 200) {
      throw new Error("Content too short, likely blocked or empty");
    }

    // 🛡️ VALIDATE FALLBACK CONTENT QUALITY
    const fallbackValidation = isValidContent(content);
    if (!fallbackValidation.valid) {
      console.warn(`⚠️ Fallback içerik geçersiz: ${fallbackValidation.reason}`);
      throw new Error(`Invalid fallback content: ${fallbackValidation.reason}`);
    }

    console.log(
      `✅ Direct fetch ile içerik alındı: ${content.length} karakter`,
    );
    return content;
  } catch (error: any) {
    console.error(
      `❌ İçerik alma hatası (${url}):`,
      error.message || error.code,
    );

    // 🚨 CRITICAL: Throw error instead of returning garbage
    // This allows the caller to skip this article instead of processing bad content
    throw new Error(
      `Content fetch failed: ${error.message || "Unknown error"}`,
    );
  }
}

export default {
  fetchAINews,
  fetchArticleContent,
};
