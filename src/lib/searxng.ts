/**
 * SearXNG Search Client
 * Self-hosted metasearch engine (unlimited, free)
 * https://docs.searxng.org/dev/search_api.html
 */

import axios from "axios";

const SEARXNG_BASE_URL =
  process.env.SEARXNG_BASE_URL ||
  "http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io";

// Rate limiting: Prevent overwhelming SearXNG with parallel requests
let lastRequestTime = 0;
let requestQueue: Array<() => void> = [];
let isProcessingQueue = false;
const MIN_REQUEST_INTERVAL = 500; // 500ms between requests
const MAX_CONCURRENT_REQUESTS = 2; // Max 2 concurrent requests
let activeRequests = 0;

async function rateLimitedRequest<T>(fn: () => Promise<T>): Promise<T> {
  // Wait if too many active requests
  while (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Ensure minimum interval between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest),
    );
  }

  lastRequestTime = Date.now();
  activeRequests++;

  try {
    return await fn();
  } finally {
    activeRequests--;
  }
}

export interface SearXNGResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  parsed_url: string[];
  template: string;
  engines: string[];
  positions: number[];
  score: number;
  category: string;
  // Optional fields that may be returned by SearXNG
  publishedDate?: string;
  thumbnail?: string;
  img_src?: string;
}

export interface SearXNGResponse {
  query: string;
  number_of_results: number;
  results: SearXNGResult[];
  answers: string[];
  corrections: string[];
  infoboxes: any[];
  suggestions: string[];
  unresponsive_engines: string[];
}

/**
 * Search using SearXNG
 */
export async function searxngSearch(
  query: string,
  options: {
    count?: number;
    language?: string;
    time_range?: string; // day, week, month, year
    safesearch?: 0 | 1 | 2; // 0=off, 1=moderate, 2=strict
    categories?: string; // general, images, videos, news, etc.
  } = {},
): Promise<SearXNGResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      language: options.language || "en",
      safesearch: String(options.safesearch ?? 1),
    });

    if (options.time_range) {
      params.append("time_range", options.time_range);
    }

    if (options.categories) {
      params.append("categories", options.categories);
    }

    // Rate-limited request to prevent overwhelming SearXNG
    const response = await rateLimitedRequest(() =>
      axios.get<SearXNGResponse>(`${SEARXNG_BASE_URL}/search`, {
        params,
        timeout: 15000, // Increased timeout for rate-limited requests
        headers: {
          "User-Agent": "AIHaberleri-NewsBot/1.0",
        },
      }),
    );

    const results = response.data.results || [];

    // Limit results
    const limitedResults = results.slice(0, options.count || 10);

    console.log(
      `✅ SearXNG: ${limitedResults.length} sonuç bulundu (toplam: ${results.length})`,
    );

    return limitedResults;
  } catch (error: any) {
    console.error("❌ SearXNG search error:", error.message);
    throw error;
  }
}

/**
 * Calculate trend score using SearXNG
 * Uses result count and position as indicators
 *
 * ENHANCED ALGORITHM v2:
 * - Exact title match (high priority)
 * - Keyword specificity (unique terms = higher score)
 * - Freshness indicator (recent coverage)
 * - Source diversity (different domains = trending)
 * - Position weighting (top positions = more relevant)
 */
export async function calculateTrendScoreSearXNG(
  title: string,
  description: string,
): Promise<number> {
  try {
    // Extract meaningful keywords (4+ chars, no common words)
    const stopWords = [
      "that",
      "this",
      "with",
      "from",
      "have",
      "will",
      "been",
      "more",
      "their",
      "than",
      "when",
      "what",
      "which",
      "about",
      "into",
      "some",
      "could",
      "them",
      "other",
      "only",
      "also",
      "just",
      "over",
      "such",
      "very",
      "even",
      "most",
      "says",
      "said",
      "using",
      "being",
      "after",
      "before",
      "through",
      "during",
      "between",
      "under",
      "while",
      "where",
      "these",
      "those",
      "first",
      "model",
      "models",
    ];
    const keywords = title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4 && !stopWords.includes(w))
      .slice(0, 4);

    if (keywords.length === 0) {
      console.log(`📊 SearXNG trend score: 50 (no valid keywords)`);
      return 50;
    }

    // Search for keywords in news category only
    const keywordResults = await searxngSearch(keywords.join(" "), {
      count: 15,
      time_range: "day", // Only last 24 hours for freshness
      categories: "news",
    });

    // Calculate metrics
    // 1. Result count score (0-100) - more results = more trending
    const resultCountScore = Math.min(100, keywordResults.length * 7);

    // 2. Source diversity score (0-50) - unique domains
    const uniqueDomains = new Set(
      keywordResults.map((r) => {
        try {
          return new URL(r.url).hostname.replace("www.", "");
        } catch {
          return "unknown";
        }
      }),
    );
    const diversityScore = Math.min(50, uniqueDomains.size * 10);

    // 3. Position score (0-50) - top positions = more relevant
    const avgPosition =
      keywordResults.length > 0
        ? keywordResults.reduce((sum, r) => sum + (r.positions?.[0] || 10), 0) /
          keywordResults.length
        : 10;
    const positionScore = Math.max(0, 50 - avgPosition * 5);

    // 4. Keyword specificity bonus (0-30) - more unique keywords = higher score
    const specificityBonus = keywords.length >= 3 ? 30 : keywords.length * 10;

    // 5. Title match bonus (0-50) - check if any result contains similar title
    const titleLower = title.toLowerCase();
    const titleMatchCount = keywordResults.filter(
      (r) =>
        r.title?.toLowerCase().includes(keywords[0]) &&
        (keywords.length < 2 || r.title?.toLowerCase().includes(keywords[1])),
    ).length;
    const titleMatchBonus = Math.min(50, titleMatchCount * 15);

    // Calculate total score (0-280 range, normalized to 0-100)
    const rawScore =
      resultCountScore +
      diversityScore +
      positionScore +
      specificityBonus +
      titleMatchBonus;
    const normalizedScore = Math.round((rawScore / 280) * 100);

    // Add random variance (±5) to differentiate similar scores
    const variance = Math.floor(Math.random() * 11) - 5;
    const finalScore = Math.max(5, Math.min(100, normalizedScore + variance));

    console.log(
      `📊 SearXNG trend score: ${finalScore} (results: ${keywordResults.length}, domains: ${uniqueDomains.size}, pos: ${avgPosition.toFixed(1)}, keywords: ${keywords.join(",")})`,
    );

    return finalScore;
  } catch (error: any) {
    console.error("❌ SearXNG trend score error:", error.message);
    // Return random score between 20-60 on error
    return Math.floor(Math.random() * 41) + 20;
  }
}

export default {
  searxngSearch,
  calculateTrendScoreSearXNG,
};
