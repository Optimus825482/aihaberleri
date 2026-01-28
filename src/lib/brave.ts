/**
 * Brave Search API Integration
 * Used for trend analysis and popularity scoring
 *
 * OPTIMIZATIONS (migrated from Tavily):
 * - Rate limiter: 50ms between calls (safe for 20 req/sec limit)
 * - Batch processing: 10 articles per batch
 * - In-memory cache: 15 minutes TTL
 */

import axios from "axios";

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

if (!BRAVE_API_KEY) {
  console.warn("⚠️  BRAVE_API_KEY is not set");
}

// ============================================
// RATE LIMITER (20 req/sec = 50ms minimum interval)
// ============================================
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 50; // 50ms between calls (max 20 calls/second)

async function rateLimitedCall<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;

  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_CALL_INTERVAL - timeSinceLastCall),
    );
  }

  lastCallTime = Date.now();
  return fn();
}

// ============================================
// IN-MEMORY CACHE
// ============================================
interface CacheEntry {
  score: number;
  timestamp: number;
}

const trendCache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCachedScore(cacheKey: string): number | null {
  const cached = trendCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.score;
  }
  return null;
}

function setCachedScore(cacheKey: string, score: number): void {
  trendCache.set(cacheKey, { score, timestamp: Date.now() });
}

export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
  page_age?: string;
  language?: string;
}

export interface BraveSearchResponse {
  query: {
    original: string;
  };
  web?: {
    results: BraveSearchResult[];
  };
}

/**
 * Search using Brave Search API
 */
export async function braveSearch(
  query: string,
  options: {
    count?: number;
    freshness?: string;
    country?: string;
  } = {},
): Promise<BraveSearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new Error("BRAVE_API_KEY is not configured");
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: (options.count || 10).toString(),
      search_lang: "en",
      country: options.country || "US",
      safesearch: "moderate",
      text_decorations: "false",
      spellcheck: "true",
    });

    if (options.freshness) {
      params.append("freshness", options.freshness);
    }

    const response = await axios.get<BraveSearchResponse>(
      `${BRAVE_API_URL}?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
        timeout: 10000,
      },
    );

    return response.data.web?.results || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Brave Search API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    throw error;
  }
}

/**
 * Calculate trend score for an article (with caching and rate limiting)
 * Higher score = more trending
 */
export async function calculateTrendScoreBrave(
  title: string,
  description: string,
): Promise<number> {
  try {
    const searchQuery = extractKeywords(title, description);

    // Check cache first
    const cachedScore = getCachedScore(searchQuery);
    if (cachedScore !== null) {
      return cachedScore;
    }

    // Rate limited API call
    const results = await rateLimitedCall(() =>
      braveSearch(searchQuery, {
        count: 5, // Reduced from 10 to 5 to save API calls
        freshness: "pd", // Past day
      }),
    );

    let score = 0;

    // Base score from result count
    score += Math.min(results.length * 10, 100);

    // Bonus for title matches and recency
    const titleLower = title.toLowerCase();
    const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);

    for (const result of results) {
      const resultTitleLower = result.title.toLowerCase();

      // Check word overlap
      let matchCount = 0;
      for (const word of titleWords) {
        if (resultTitleLower.includes(word)) {
          matchCount++;
        }
      }

      const matchRatio = matchCount / titleWords.length;
      score += matchRatio * 30;

      // Bonus for recent results
      if (result.age) {
        if (result.age.includes("hour")) {
          score += 20;
        } else if (result.age.includes("day")) {
          score += 10;
        }
      }

      // --- TRAFFIC MAGNET LOGIC ---

      // 1. Social Discussion Boost (Reddit, Twitter/X, HackerNews)
      const socialDomains = [
        "reddit.com",
        "twitter.com",
        "x.com",
        "news.ycombinator.com",
        "quora.com",
        "medium.com",
      ];
      if (socialDomains.some((d) => result.url.includes(d))) {
        score += 40; // High boost for social discussion
      }

      // 2. Video/Visual Boost (YouTube)
      if (
        result.url.includes("youtube.com") ||
        result.url.includes("vimeo.com")
      ) {
        score += 30;
      }

      // 3. Authority Boost (Tech Giants)
      const authorityDomains = [
        "techcrunch.com",
        "theverge.com",
        "wired.com",
        "bloomberg.com",
        "reuters.com",
      ];
      if (authorityDomains.some((d) => result.url.includes(d))) {
        score += 15;
      }
    }

    // Cache the result
    setCachedScore(searchQuery, score);

    return score;
  } catch (error) {
    console.error("Brave trend score error:", error);
    return 0; // Return 0 if trend analysis fails
  }
}

/**
 * Extract keywords from title and description
 */
function extractKeywords(title: string, description: string): string {
  // Strip HTML tags from description (RSS feeds often contain HTML)
  const cleanDescription = (description || "")
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/&[a-z]+;/gi, " ") // Remove HTML entities (&amp;, &nbsp;, etc.)
    .replace(/https?:\/\/[^\s]+/g, " ") // Remove URLs
    .replace(/[^a-zA-Z0-9\s]/g, " "); // Keep only alphanumeric and spaces

  const cleanTitle = (title || "").replace(/[^a-zA-Z0-9\s]/g, " "); // Keep only alphanumeric and spaces

  // Combine cleaned title and description
  const text = `${cleanTitle} ${cleanDescription}`.toLowerCase();

  // Remove common words
  const stopWords = new Set([
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
    "this",
    "that",
    "these",
    "those",
  ]);

  // Extract words
  const words = text
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 10); // Take first 10 keywords

  return words.join(" ");
}

/**
 * Rank articles by trend using Brave Search (with smart sampling and batch processing)
 */
export async function rankArticlesByTrendBrave(
  articles: Array<{ title: string; description: string }>,
): Promise<Array<{ index: number; score: number }>> {
  // ============================================
  // STEP 1: SMART SAMPLING
  // ============================================
  const MAX_ARTICLES = 100;
  const originalCount = articles.length;

  if (articles.length > MAX_ARTICLES) {
    console.log(
      `⚡ Smart Sampling: ${articles.length} haber → ${MAX_ARTICLES} habere düşürülüyor`,
    );

    // Take first 100 (already sorted by date in news.service.ts)
    articles = articles.slice(0, MAX_ARTICLES);
  }

  console.log(`📊 Brave ile ${articles.length} haber analiz ediliyor...`);

  // ============================================
  // STEP 2: BATCH PROCESSING WITH RATE LIMITING
  // ============================================
  const BATCH_SIZE = 10;
  const BATCH_DELAY = 500; // 500ms between batches (conservative)

  const scores: Array<{ index: number; score: number }> = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(articles.length / BATCH_SIZE);

    console.log(
      `📦 Batch ${batchNumber}/${totalBatches} işleniyor (${batch.length} haber)...`,
    );

    // Process batch with rate limiting
    const batchScores = await Promise.all(
      batch.map(async (article, batchIndex) => {
        const globalIndex = i + batchIndex;

        try {
          const score = await calculateTrendScoreBrave(
            article.title,
            article.description,
          );
          return { index: globalIndex, score };
        } catch (error: any) {
          console.warn(
            `⚠️ Haber #${globalIndex + 1} analiz edilemedi (${error.message}), varsayılan skor: 0`,
          );
          return { index: globalIndex, score: 0 };
        }
      }),
    );

    scores.push(...batchScores);

    // Delay between batches (except last batch)
    if (i + BATCH_SIZE < articles.length) {
      console.log(`⏳ ${BATCH_DELAY}ms bekleniyor (rate limit protection)...`);
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  // ============================================
  // STEP 3: SORT BY SCORE
  // ============================================
  scores.sort((a, b) => b.score - a.score);

  console.log("✅ Brave trend sıralaması tamamlandı");
  console.log(`📊 İşlenen: ${articles.length}/${originalCount} haber`);
  console.log(
    "🏆 Top 5:",
    scores
      .slice(0, 5)
      .map((s) => `#${s.index + 1} (skor: ${Math.round(s.score)})`)
      .join(", "),
  );

  return scores;
}

/**
 * Get trending AI news topics
 */
export async function getTrendingAITopics(): Promise<string[]> {
  try {
    console.log("🔥 Trend AI konuları araştırılıyor...");

    const trendingQueries = [
      "artificial intelligence news today",
      "AI breakthrough",
      "machine learning latest",
      "OpenAI news",
      "Google AI",
    ];

    const allTopics = new Set<string>();

    for (const query of trendingQueries) {
      const results = await rateLimitedCall(() =>
        braveSearch(query, {
          count: 5,
          freshness: "pd",
        }),
      );

      for (const result of results) {
        // Extract main topic from title
        const topic = result.title.split(/[-:|]/)[0].trim();
        if (topic.length > 10) {
          allTopics.add(topic);
        }
      }
    }

    const topics = Array.from(allTopics).slice(0, 10);
    console.log(`✅ ${topics.length} trend konu bulundu`);

    return topics;
  } catch (error) {
    console.error("Trend konular hatası:", error);
    return [];
  }
}

export default {
  braveSearch,
  calculateTrendScoreBrave,
  rankArticlesByTrendBrave,
  getTrendingAITopics,
};
