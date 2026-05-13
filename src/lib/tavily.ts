/**
 * Tavily Search API Integration
 * Better for trend analysis with higher rate limits
 *
 * OPTIMIZATIONS:
 * - Rate limiter: 200ms between calls
 * - Batch processing: 10 articles per batch
 * - In-memory cache: 15 minutes TTL
 */

import axios from "axios";
import {
  googleNewsSearch,
  type GoogleNewsSearchResult,
} from "@/lib/google-news-search";

const TAVILY_API_URL = "https://api.tavily.com/search";
const EXA_API_URL = "https://api.exa.ai/search";

// ============================================
// RATE LIMITER
// ============================================
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 200; // 200ms between calls (max 5 calls/second)

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

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  response_time: number;
}

interface ExaSearchResult {
  title?: string;
  url: string;
  text?: string;
  score?: number;
  publishedDate?: string;
}

interface ExaSearchResponse {
  results?: ExaSearchResult[];
}

function mapExaResult(result: ExaSearchResult): TavilySearchResult {
  return {
    title: result.title || result.url,
    url: result.url,
    content: result.text || "",
    score: result.score ?? 0,
    published_date: result.publishedDate,
  };
}

function mapGoogleNewsResult(result: GoogleNewsSearchResult): TavilySearchResult {
  return {
    title: result.title,
    url: result.url,
    content: result.content,
    score: result.score,
    published_date: result.publishedDate,
  };
}

async function googleNewsFallbackSearch(
  query: string,
  options: { max_results?: number } = {},
): Promise<TavilySearchResult[]> {
  try {
    const results = await googleNewsSearch(query, {
      count: options.max_results || 10,
      time_range: "week",
      categories: "general,news",
    });

    return results.map(mapGoogleNewsResult);
  } catch (error) {
    console.warn("⚠️ Google News RSS fallback failed", error);
    return [];
  }
}

async function exaSearch(
  query: string,
  options: {
    max_results?: number;
    include_domains?: string[];
    exclude_domains?: string[];
  } = {},
): Promise<TavilySearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ EXA_API_KEY missing, falling back to Google News RSS");
    return googleNewsFallbackSearch(query, options);
  }

  try {
    const response = await axios.post<ExaSearchResponse>(
      EXA_API_URL,
      {
        query,
        numResults: options.max_results || 10,
        includeDomains: options.include_domains,
        excludeDomains: options.exclude_domains,
        contents: { text: true },
        useAutoprompt: true,
        type: "auto",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        timeout: 10000,
      },
    );

    const results = response.data.results || [];
    if (results.length === 0) {
      console.warn("⚠️ EXA returned no results, falling back to Google News RSS");
      return googleNewsFallbackSearch(query, options);
    }

    return results.map(mapExaResult);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("EXA Search API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    console.warn("⚠️ EXA failed, falling back to Google News RSS");
    return googleNewsFallbackSearch(query, options);
  }
}

/**
 * Search using Tavily API
 */
export async function tavilySearch(
  query: string,
  options: {
    max_results?: number;
    include_domains?: string[];
    exclude_domains?: string[];
  } = {},
): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ TAVILY_API_KEY missing, falling back to EXA/Google News");
    return exaSearch(query, options);
  }

  try {
    const response = await axios.post<TavilySearchResponse>(
      TAVILY_API_URL,
      {
        api_key: apiKey,
        query,
        max_results: options.max_results || 10,
        include_domains: options.include_domains,
        exclude_domains: options.exclude_domains,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: false,
      },
      {
        timeout: 10000,
      },
    );

    const results = response.data.results || [];
    if (results.length === 0) {
      console.warn("⚠️ Tavily returned no results, falling back to EXA/Google News");
      return exaSearch(query, options);
    }

    return results;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Tavily Search API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    console.warn("⚠️ Tavily failed, falling back to EXA/Google News");
    return exaSearch(query, options);
  }
}

/**
 * Calculate trend score using Tavily (with caching)
 */
export async function calculateTrendScoreTavily(
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

    const results = await tavilySearch(searchQuery, {
      max_results: 5, // Reduced from 10 to 5 to save API calls
    });

    let score = 0;

    // Base score from result count
    score += Math.min(results.length * 10, 100);

    // Score based on relevance scores
    for (const result of results) {
      score += result.score * 50; // Tavily provides relevance score 0-1

      // Bonus for title matches
      const titleLower = title.toLowerCase();
      const resultTitleLower = result.title.toLowerCase();
      const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);

      let matchCount = 0;
      for (const word of titleWords) {
        if (resultTitleLower.includes(word)) {
          matchCount++;
        }
      }

      const matchRatio = matchCount / titleWords.length;
      score += matchRatio * 30;

      // Bonus for recent results
      if (result.published_date) {
        const pubDate = new Date(result.published_date);
        const hoursSince = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);

        if (hoursSince < 24) {
          score += 20;
        } else if (hoursSince < 48) {
          score += 10;
        }
      }

      // --- NEW TRAFFIC MAGNET LOGIC ---

      // 1. Social Discussion Boost (Reddit, Twitter/X, HackerNews)
      // These domains indicate accurate human interest and "stickiness"
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
      // High intent for visual explanation
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
    console.error("Tavily trend score error:", error);
    return 0;
  }
}

/**
 * Extract keywords from title and description
 */
function extractKeywords(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

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

  const words = text
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 10);

  return words.join(" ");
}

/**
 * Rank articles by trend using Tavily (with smart sampling and batch processing)
 */
export async function rankArticlesByTrendTavily(
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

  console.log(`📊 Tavily ile ${articles.length} haber analiz ediliyor...`);

  // ============================================
  // STEP 2: BATCH PROCESSING WITH RATE LIMITING
  // ============================================
  const BATCH_SIZE = 10;
  const BATCH_DELAY = 1000; // 1 second between batches

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
          const score = await rateLimitedCall(() =>
            calculateTrendScoreTavily(article.title, article.description),
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

  console.log("✅ Tavily trend sıralaması tamamlandı");
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

export default {
  tavilySearch,
  calculateTrendScoreTavily,
  rankArticlesByTrendTavily,
};
