/**
 * News Service - Handles news scraping and fetching with RSS + Trend Analysis
 */

import axios from "axios";
import {
  fetchAllRSSFeeds,
  filterRecentArticles,
  type RSSItem,
} from "@/lib/rss";
import { rankArticlesByTrendBrave } from "@/lib/brave";
import { distance } from "fastest-levenshtein";
import { db } from "@/lib/db";

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedDate?: string;
  source?: string;
  trendScore?: number;
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
 * Extract main keywords from text (remove stop words)
 */
function extractKeywords(text: string): string[] {
  const stopWords = [
    "haber",
    "news",
    "için",
    "olan",
    "this",
    "that",
    "with",
    "from",
    "will",
    "new",
    "bir",
    "ile",
    "the",
    "and",
    "için",
    "yeni",
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

      // 2. Title Similarity Check (65%+ similar - RELAXED from 55% on 01.02.2026)
      const titleSimilarity = calculateSimilarity(title, article.title);
      if (titleSimilarity > 0.65) {
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
          const timeDiff = Date.now() - new Date(article.publishedAt).getTime();
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

          // 🆕 NEW CHECK: 2+ same entities within 24h + ANY title similarity (40%+)
          // This catches: "Nvidia CEO OpenAI yatırım X" vs "Nvidia CEO OpenAI yatırım Y"
          if (
            entityIntersection.length >= 2 &&
            hoursDiff < 24 &&
            titleSimilarity > 0.4
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

          // RELAXED: 3+ same entities within 12 hours (same story, different angle)
          // Changed from 2+ entities, 24h to 3+ entities, 12h (01.02.2026)
          if (entityIntersection.length >= 3 && hoursDiff < 12) {
            console.log(
              `❌ DUPLICATE: Multi-entity match [${entityIntersection.join(", ")}] within 12h`,
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
  "ai ",
  " ai",
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

    // Step 1.5: Filter by category keywords if specified
    let filteredItems = rssItems;
    if (categoryFilter) {
      const categoryKeywords = getCategoryKeywords(categoryFilter);
      console.log(
        `🔍 "${categoryFilter}" kategorisi için filtreleme yapılıyor...`,
      );
      console.log(`📝 Anahtar kelimeler: ${categoryKeywords.join(", ")}`);

      filteredItems = rssItems.filter((item) => {
        const text = `${item.title} ${item.description}`.toLowerCase();
        return categoryKeywords.some((keyword) => text.includes(keyword));
      });

      console.log(
        `✅ ${filteredItems.length}/${rssItems.length} haber kategoriye uygun`,
      );

      if (filteredItems.length === 0) {
        console.log(
          "⚠️  Kategoriye uygun haber bulunamadı, tüm haberler kullanılacak",
        );
        filteredItems = rssItems;
      }
    }

    // Step 2: Filter recent articles (last 48 hours)
    const recentItems = filterRecentArticles(filteredItems, 48);
    console.log(`📅 Son 48 saatte ${recentItems.length} haber`);

    // Step 2.5: CRITICAL - Filter by AI keywords to exclude non-AI news
    const aiFilteredItems = filterByAIKeywords(
      recentItems.length > 0 ? recentItems : filteredItems,
    );
    console.log(
      `🤖 AI filtreleme: ${aiFilteredItems.length}/${recentItems.length || filteredItems.length} haber AI ile ilgili`,
    );

    if (aiFilteredItems.length === 0) {
      console.log(
        "⚠️  AI ile ilgili haber bulunamadı, en az 10 haber kullanılacak",
      );
      // If no AI news found, take top 10 from recent items
      const fallbackItems = (
        recentItems.length > 0 ? recentItems : filteredItems
      ).slice(0, 10);
      return convertRSSToNews(
        fallbackItems.map((item) => ({ ...item, trendScore: 0 })),
      );
    }

    // SMART SAMPLING: Prioritize recent + diverse sources
    let itemsToAnalyze = aiFilteredItems;

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

    // 🆕 STEP 2.7: EARLY DUPLICATE FILTERING (BEFORE BRAVE API!)
    // This is the CRITICAL optimization - filter duplicates BEFORE expensive Brave API calls
    console.log(`\n🔍 EARLY DUPLICATE FILTERING (Brave API'den ÖNCE)...`);
    console.log(`   Input: ${itemsToAnalyze.length} haber`);

    // Convert RSS items to NewsArticle format for duplicate checking
    const newsArticlesForCheck = convertRSSToNews(
      itemsToAnalyze.map((item) => ({ ...item, trendScore: 0 })),
    );

    // Import duplicate filtering functions
    const { extractTopicsBatch, filterDuplicatesByTopicAndUrl } =
      await import("./topic-extraction.service");

    // Extract topics for all articles
    console.log(`🧠 Topic extraction: ${newsArticlesForCheck.length} haber...`);
    const articlesWithTopics = await extractTopicsBatch(
      newsArticlesForCheck,
      10,
    );

    // Filter duplicates
    console.log(`🔍 Duplicate check: Son 2 günde yayınlananlar eleniyor...`);
    const uniqueArticles = await filterDuplicatesByTopicAndUrl(
      articlesWithTopics,
      2,
    );

    console.log(`\n📊 Early filtering sonuçları:`);
    console.log(`   Input: ${newsArticlesForCheck.length} haber`);
    console.log(
      `   Duplicate: ${newsArticlesForCheck.length - uniqueArticles.length} haber`,
    );
    console.log(`   Unique: ${uniqueArticles.length} haber`);
    console.log(
      `   Duplicate rate: ${(((newsArticlesForCheck.length - uniqueArticles.length) / newsArticlesForCheck.length) * 100).toFixed(1)}%`,
    );

    if (uniqueArticles.length === 0) {
      console.log(`\n⚠️  Tüm haberler duplicate! Boş array döndürülüyor.`);
      return [];
    }

    // Map back to RSS items for Brave API
    const uniqueRssItems = uniqueArticles
      .map((article) => {
        const originalItem = itemsToAnalyze.find(
          (item) => item.title === article.title,
        );
        return originalItem!;
      })
      .filter(Boolean);

    console.log(
      `\n✅ ${uniqueRssItems.length} unique haber Brave API'ye gönderilecek`,
    );
    console.log(
      `   Brave API maliyet tasarrufu: ${((1 - uniqueRssItems.length / itemsToAnalyze.length) * 100).toFixed(1)}%\n`,
    );

    // Update itemsToAnalyze with unique items only
    itemsToAnalyze = uniqueRssItems;

    // Step 3: Analyze trends using Brave Search API ONLY (NOW WITH UNIQUE ARTICLES!)
    // NOTE: Google Trends removed on 01.02.2026 - all endpoints returning 404
    // Brave API is now the sole trend source
    console.log(
      `📊 ${itemsToAnalyze.length} UNIQUE haber için Trend analizi (Brave API)...`,
    );

    const trendRankings = await rankArticlesByTrendBrave(
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
