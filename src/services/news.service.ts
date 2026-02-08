/**
 * News Service - Handles news scraping and fetching with RSS + Trend Analysis
 */

import axios from "axios";
import {
  fetchAllRSSFeeds,
  filterRecentArticles,
  type RSSItem,
} from "@/lib/rss";
import { rankArticlesByTrendHybrid } from "@/lib/hybrid-search";
import { distance } from "fastest-levenshtein";
import { db } from "@/lib/db";
import { normalizeUrl } from "@/lib/url-utils";

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
  "palm",
  "dall-e",
  "midjourney",
  "stable diffusion",
  "sora",

  // AI Techniques
  "nlp",
  "natural language",
  "doğal dil",
  "dogal dil",
  "computer vision",
  "bilgisayarlı görü",
  "bilgisayarli goru",
  "transformer",
  "language model",
  "dil modeli",
  "generative ai",
  "üretken yapay zeka",
  "uretken yapay zeka",
  "large language model",
  "llm",
  "büyük dil modeli",

  // AI Companies
  "nvidia",
  "tesla autopilot",
  "otonom sürüş",
  "otonom surus",
  "hugging face",
  "cohere",
  "stability ai",
  "runway",
  "google ai",
  "microsoft ai",
  "meta ai",
  "amazon ai",

  // AI Applications
  "chatbot",
  "sohbet botu",
  "robot",
  "robotik",
  "robotic",
  "autonomous",
  "otonom",
  "automation",
  "otomasyon",
  "ai assistant",
  "ai asistan",
  "yapay zeka asistan",
  "ai tool",
  "ai araç",
  "ai arac",

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
    `📰 AI haberleri toplanıyor (RSS + Trend Analizi)${categoryFilter ? ` - Kategori: ${categoryFilter}` : ""}...`,
  );

  try {
    // Step 1: Fetch all RSS feeds
    const rssItems = await fetchAllRSSFeeds();

    if (rssItems.length === 0) {
      console.log("⚠️  RSS'den haber alınamadı");
      return [];
    }

    console.log(`📥 RSS'den ${rssItems.length} haber alındı`);

    // ⚡ STEP 1.5: SIMPLE URL FILTERING (son 12 saat)
    // Sadece URL bazlı duplicate check - başka filtreleme YOK!
    console.log(
      `\n🔍 URL Filtering: Son 12 saatte yayınlanan URL'ler eleniyor...`,
    );

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

    console.log(
      `   Database'de ${recentUrlSet.size} unique URL bulundu (son 12 saat)`,
    );

    // Filter RSS items - ONLY NEW URLs
    const newRssItems = rssItems.filter((item) => {
      const normalized = normalizeUrl(item.link);
      return !recentUrlSet.has(normalized);
    });

    console.log(
      `   ✅ ${newRssItems.length}/${rssItems.length} haber YENİ (${((newRssItems.length / rssItems.length) * 100).toFixed(1)}% yeni)`,
    );

    if (newRssItems.length === 0) {
      console.log(
        "⚠️  Son 12 saatte tüm haberler zaten yayınlanmış! Boş array döndürülüyor.",
      );
      return [];
    }

    // Step 1.6: Filter by category keywords if specified
    let filteredItems = newRssItems;
    if (categoryFilter) {
      const categoryKeywords = getCategoryKeywords(categoryFilter);
      console.log(
        `🔍 "${categoryFilter}" kategorisi için filtreleme yapılıyor...`,
      );
      console.log(`📝 Anahtar kelimeler: ${categoryKeywords.join(", ")}`);

      filteredItems = newRssItems.filter((item) => {
        const text = `${item.title} ${item.description}`.toLowerCase();
        return categoryKeywords.some((keyword) => text.includes(keyword));
      });

      console.log(
        `✅ ${filteredItems.length}/${newRssItems.length} haber kategoriye uygun`,
      );

      if (filteredItems.length === 0) {
        console.log(
          "⚠️  Kategoriye uygun haber bulunamadı, tüm haberler kullanılacak",
        );
        filteredItems = newRssItems;
      }
    }

    // Step 2: Filter recent articles (last 48 hours)
    const recentItems = filterRecentArticles(filteredItems, 48);
    console.log(`📅 Son 48 saatte ${recentItems.length} haber`);

    // ✅ AI KEYWORD FILTERING KALDIRILDI - Gereksiz filtreleme!
    // Tüm haberler trend skorlamasına gidecek

    // SMART SAMPLING: Prioritize recent + diverse sources
    let itemsToAnalyze = recentItems.length > 0 ? recentItems : filteredItems;

    // 🆕 STEP 2.6: Filter Reddit discussion posts (not news articles)
    // Reddit tags: [D]=Discussion, [R]=Research, [P]=Project, [N]=News
    const REDDIT_DISCUSSION_PATTERNS =
      /^\s*\[(D|R|P|Discussion|Research|Project)\]/i;
    const beforeRedditFilter = itemsToAnalyze.length;
    itemsToAnalyze = itemsToAnalyze.filter((item) => {
      if (REDDIT_DISCUSSION_PATTERNS.test(item.title)) {
        console.log(
          `   ⏭️  SKIP (Reddit discussion): ${item.title.substring(0, 50)}...`,
        );
        return false;
      }
      return true;
    });
    if (beforeRedditFilter !== itemsToAnalyze.length) {
      console.log(
        `🔍 Reddit filtre: ${beforeRedditFilter - itemsToAnalyze.length} discussion post elendi`,
      );
    }

    // If too many articles, sample intelligently
    const MAX_ARTICLES_TO_ANALYZE = 100;
    if (itemsToAnalyze.length > MAX_ARTICLES_TO_ANALYZE) {
      console.log(
        `⚡ Smart Sampling: ${itemsToAnalyze.length} haber → ${MAX_ARTICLES_TO_ANALYZE} habere düşürülüyor`,
      );

      // Sort by date (most recent first) and take top 100
      itemsToAnalyze = itemsToAnalyze
        .sort(
          (a, b) =>
            new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
        )
        .slice(0, MAX_ARTICLES_TO_ANALYZE);

      console.log(`✅ En güncel ${MAX_ARTICLES_TO_ANALYZE} haber seçildi`);
    }

    // ❌ REMOVED: Early duplicate filtering (satır ~850-900)
    // Neden kaldırıldı:
    // 1. Çok yavaş (topic extraction + database query her haber için)
    // 2. Gereksiz (duplicate-detector agent zaten var)
    // 3. URL filtering yukarıda yapıldı (daha hızlı)
    //
    // Eski kod:
    // const articlesWithTopics = await extractTopicsBatch(newsArticlesForCheck, 20);
    // const uniqueArticles = await filterDuplicatesByTopicAndUrl(articlesWithTopics, 1);

    console.log(
      `\n✅ ${itemsToAnalyze.length} unique haber Brave API'ye gönderilecek`,
    );

    // Step 3: Analyze trends using Brave Search API ONLY
    console.log(
      `📊 ${itemsToAnalyze.length} haber için Trend analizi (Brave API)...`,
    );

    const trendRankings = await rankArticlesByTrendHybrid(
      itemsToAnalyze.map((item) => ({
        title: item.title,
        description: item.description,
      })),
    );

    // Step 4: Sort by trend score and take top articles
    // 🔄 INCREASED from 20 to 50 for retry mechanism pool
    // Agent will select 1-5 articles, but needs more options if duplicates found
    const topArticles = trendRankings
      .slice(0, 50) // Top 50 trending (increased for retry pool)
      .map((ranking) => {
        const item = itemsToAnalyze[ranking.index];
        return {
          ...item,
          trendScore: ranking.score,
        };
      })
      .sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0));

    console.log(
      `✅ ${topArticles.length} trend haber seçildi (retry pool için artırıldı)`,
    );
    console.log(
      "Top 5 Trend Haberler:",
      topArticles
        .slice(0, 5)
        .map(
          (a, i) =>
            `\n  ${i + 1}. ${a.title.substring(0, 60)}... (skor: ${Math.round(a.trendScore || 0)})`,
        )
        .join(""),
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
 * Fetch article content from URL using Jina Reader API
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

    console.log(
      `✅ Direct fetch ile içerik alındı: ${content.length} karakter`,
    );
    return content;
  } catch (error: any) {
    console.error(
      `❌ İçerik alma hatası (${url}):`,
      error.message || error.code,
    );

    // Ultimate Fallback: Return a meaningful error string
    return "Article content could not be fetched due to access restrictions. The AI will rewrite based on the title and description.";
  }
}

export default {
  fetchAINews,
  fetchArticleContent,
};
