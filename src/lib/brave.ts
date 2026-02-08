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
// IN-MEMORY CACHE (WITH AUTO CLEANUP)
// ============================================
interface CacheEntry {
  score: number;
  timestamp: number;
}

const trendCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour (TTL)
const CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
let cleanupIntervalId: NodeJS.Timeout | null = null;

function getCachedScore(cacheKey: string): number | null {
  const cached = trendCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.score;
  }
  // Remove expired entry
  if (cached) {
    trendCache.delete(cacheKey);
  }
  return null;
}

function setCachedScore(cacheKey: string, score: number): void {
  trendCache.set(cacheKey, { score, timestamp: Date.now() });
}

/**
 * Cleanup expired entries from trendCache
 * Should be called periodically to prevent memory leaks
 */
export function cleanupTrendCache(): number {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, entry] of trendCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      trendCache.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned ${cleanedCount} expired entries from trendCache (size: ${trendCache.size})`);
  }

  return cleanedCount;
}

/**
 * Start automatic cleanup interval
 * Call this on application startup
 */
export function startTrendCacheCleanup(): void {
  if (cleanupIntervalId) {
    return; // Already running
  }

  cleanupIntervalId = setInterval(() => {
    cleanupTrendCache();
  }, CACHE_CLEANUP_INTERVAL);

  console.log(`🧹 Trend cache cleanup started (interval: ${CACHE_CLEANUP_INTERVAL / 60000} min, TTL: ${CACHE_TTL / 60000} min)`);
}

/**
 * Stop automatic cleanup interval
 * Call this on graceful shutdown
 */
export function stopTrendCacheCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    console.log("🧹 Trend cache cleanup stopped");
  }
}

// Auto-start cleanup in non-build environments
if (process.env.NODE_ENV !== "build" && typeof globalThis.setInterval !== "undefined") {
  startTrendCacheCleanup();
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

/**
 * Deep Research - Gather additional context and details for an article
 * This enriches the article content before rewriting for more comprehensive coverage
 *
 * @param title - Article title to research
 * @param description - Article description/summary
 * @returns Enriched context with additional facts, quotes, and details
 */
export interface DeepResearchResult {
  additionalFacts: string[];
  relatedContext: string[];
  expertQuotes: string[];
  statistics: string[];
  timeline: string[];
  sources: Array<{ title: string; url: string }>;
}

export async function deepResearchArticle(
  title: string,
  description: string,
): Promise<DeepResearchResult> {
  console.log(`🔬 Deep research başlatılıyor: "${title.substring(0, 50)}..."`);

  const result: DeepResearchResult = {
    additionalFacts: [],
    relatedContext: [],
    expertQuotes: [],
    statistics: [],
    timeline: [],
    sources: [],
  };

  try {
    // Extract key entities and topics from title
    const keywords = extractKeywords(title, description);

    // Search for additional context with different queries
    const searchQueries = [
      keywords, // Main topic search
      `${keywords} details facts`, // Detailed facts
      `${keywords} expert opinion analysis`, // Expert opinions
    ];

    const seenUrls = new Set<string>();

    for (const query of searchQueries) {
      try {
        const searchResults = await rateLimitedCall(() =>
          braveSearch(query, {
            count: 5,
            freshness: "pw", // Past week for more context
          }),
        );

        for (const item of searchResults) {
          // Skip if already seen
          if (seenUrls.has(item.url)) continue;
          seenUrls.add(item.url);

          // Add to sources
          result.sources.push({
            title: item.title,
            url: item.url,
          });

          // Try to read full content using Jina + Tavily fallback
          let fullContent = item.description || "";

          // Only try to read content for first 3 sources to avoid rate limits
          if (result.sources.length <= 3) {
            const readContent = await readUrlContentWithFallback(item.url);
            if (readContent && readContent.length > fullContent.length) {
              fullContent = readContent;
              console.log(
                `   ✅ İçerik okundu: ${item.title.substring(0, 40)}...`,
              );
            }
          }

          // Look for statistics (numbers with %, $, million, billion etc.)
          const statPattern =
            /\d+(?:\.\d+)?(?:\s*(?:%|percent|million|billion|milyar|milyon|\$|€|£))/gi;
          const stats = fullContent.match(statPattern);
          if (stats) {
            stats.forEach((stat) => {
              const context = extractStatContext(fullContent, stat);
              if (context && !result.statistics.includes(context)) {
                result.statistics.push(context);
              }
            });
          }

          // Look for quotes (text in quotation marks)
          const quotePattern = /"([^"]{20,150})"/g;
          let match;
          while ((match = quotePattern.exec(fullContent)) !== null) {
            if (!result.expertQuotes.includes(match[1])) {
              result.expertQuotes.push(match[1]);
            }
          }

          // Add general facts from content (if relevant)
          if (
            fullContent.length > 50 &&
            isRelevantToTopic(fullContent, title)
          ) {
            // Clean and add as additional context
            const cleanContent = fullContent.replace(/<[^>]*>/g, "").trim();
            // Extract first meaningful paragraph
            const paragraphs = cleanContent
              .split(/\n\n+/)
              .filter((p) => p.length > 50);
            if (
              paragraphs.length > 0 &&
              !result.relatedContext.includes(paragraphs[0])
            ) {
              result.relatedContext.push(paragraphs[0].substring(0, 500));
            }
          }
        }
      } catch (searchError) {
        console.warn(`⚠️ Search failed for query "${query}":`, searchError);
        // Continue with other queries
      }
    }

    // Limit results to prevent token overflow
    result.additionalFacts = result.additionalFacts.slice(0, 5);
    result.relatedContext = result.relatedContext.slice(0, 5);
    result.expertQuotes = result.expertQuotes.slice(0, 3);
    result.statistics = result.statistics.slice(0, 5);
    result.sources = result.sources.slice(0, 8);

    console.log(`✅ Deep research tamamlandı:`);
    console.log(`   📊 ${result.statistics.length} istatistik`);
    console.log(`   💬 ${result.expertQuotes.length} alıntı`);
    console.log(`   📚 ${result.sources.length} kaynak`);
    console.log(`   📝 ${result.relatedContext.length} ek bağlam`);

    return result;
  } catch (error) {
    console.error("❌ Deep research hatası:", error);
    return result; // Return empty result on error
  }
}

// ============================================
// CONTENT READING - Multi-provider fallback
// ============================================

const JINA_READER_URL = "https://r.jina.ai";
const JINA_TIMEOUT = 10000; // 10 seconds
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";
const TAVILY_TIMEOUT = 12000; // 12 seconds

/**
 * Read URL content with Jina Reader
 */
async function readWithJina(url: string): Promise<string | null> {
  try {
    const response = await axios.get(`${JINA_READER_URL}/${url}`, {
      headers: {
        Accept: "text/plain",
        "X-Return-Format": "markdown",
      },
      timeout: JINA_TIMEOUT,
    });

    const content = response.data;
    if (content && content.length > 100) {
      return content;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read URL content with Tavily Extract (fallback)
 */
async function readWithTavily(url: string): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await axios.post(
      TAVILY_EXTRACT_URL,
      { urls: [url] },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: TAVILY_TIMEOUT,
      },
    );

    const results = response.data?.results;
    if (results && results.length > 0 && results[0].raw_content) {
      return results[0].raw_content;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read URL content with multi-provider fallback
 * 1. Jina Reader (free, fast)
 * 2. Tavily Extract (paid, reliable)
 */
async function readUrlContentWithFallback(url: string): Promise<string> {
  // Try Jina Reader first
  let content = await readWithJina(url);

  if (!content) {
    // Fallback to Tavily
    content = await readWithTavily(url);
  }

  if (!content) {
    return "";
  }

  // Truncate if too long
  if (content.length > 3000) {
    return content.substring(0, 3000) + "...";
  }

  return content;
}

/**
 * Extract context around a statistic
 */
function extractStatContext(text: string, stat: string): string {
  const index = text.indexOf(stat);
  if (index === -1) return stat;

  // Get 50 chars before and after the stat
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + stat.length + 50);

  let context = text.substring(start, end).trim();

  // Clean up partial words at boundaries
  if (start > 0) {
    const firstSpace = context.indexOf(" ");
    if (firstSpace > 0) context = context.substring(firstSpace + 1);
  }
  if (end < text.length) {
    const lastSpace = context.lastIndexOf(" ");
    if (lastSpace > 0) context = context.substring(0, lastSpace);
  }

  return context;
}

/**
 * Check if text is relevant to the topic
 */
function isRelevantToTopic(text: string, title: string): boolean {
  const titleWords = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const textLower = text.toLowerCase();

  let matchCount = 0;
  for (const word of titleWords) {
    if (textLower.includes(word)) matchCount++;
  }

  return matchCount >= Math.min(2, titleWords.length / 2);
}

export default {
  braveSearch,
  calculateTrendScoreBrave,
  rankArticlesByTrendBrave,
  getTrendingAITopics,
  deepResearchArticle,
};
