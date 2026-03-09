/**
 * SearXNG Search Client
 * Self-hosted metasearch engine (unlimited, free)
 * https://docs.searxng.org/dev/search_api.html
 */

import axios from "axios";

const WHOOGLE_BASE_URL =
  process.env.WHOOGLE_BASE_URL ||
  "http://whoogle-e4s8oc4kkc8sokcsco808ccw.77.42.68.4.sslip.io";

/** Public SearXNG (sslip.io). Override with SEARXNG_BASE_URL if using self-hosted. */
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

interface WhoogleResult {
  title?: string;
  href?: string;
  content?: string;
  text?: string;
}

interface WhoogleResponse {
  results?: WhoogleResult[];
}

function createParsedUrl(url: string): string[] {
  try {
    const parsed = new URL(url);
    return [parsed.protocol.replace(":", ""), parsed.hostname, parsed.pathname];
  } catch {
    return [];
  }
}

function mapWhoogleResult(result: WhoogleResult): SearXNGResult | null {
  const url = result.href?.trim();
  if (!url) {
    return null;
  }

  return {
    title: result.title?.trim() || url,
    url,
    content: (result.content || result.text || "").trim(),
    engine: "whoogle",
    parsed_url: createParsedUrl(url),
    template: "default.html",
    engines: ["whoogle"],
    positions: [],
    score: 0,
    category: "general",
  };
}

async function whoogleSearch(
  query: string,
  options: {
    count?: number;
    language?: string;
    time_range?: string;
    safesearch?: 0 | 1 | 2;
    categories?: string;
  } = {},
): Promise<SearXNGResult[]> {
  if (!WHOOGLE_BASE_URL) {
    return [];
  }

  const client = axios.create({
    baseURL: WHOOGLE_BASE_URL,
    timeout: 15000,
    maxRedirects: 5,
    headers: {
      "User-Agent": "AIHaberleri-NewsBot/1.0",
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  let cookieHeader = "";

  try {
    const sessionResponse = await client.get("/");
    const sessionCookies = sessionResponse.headers["set-cookie"];

    if (Array.isArray(sessionCookies) && sessionCookies.length > 0) {
      cookieHeader = sessionCookies
        .map((cookie) => cookie.split(";")[0])
        .filter(Boolean)
        .join("; ");
    }

    const response = await client.get<WhoogleResponse>("/search", {
      params: {
        q: query,
        format: "json",
        ...(options.language ? { lang: options.language } : {}),
      },
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });

    const results = (response.data.results || [])
      .map(mapWhoogleResult)
      .filter((result): result is SearXNGResult => result !== null)
      .slice(0, options.count || 10);

    console.log(`✅ Whoogle: ${results.length} sonuç bulundu`);
    return results;
  } catch (error: any) {
    console.warn(
      `⚠️ Whoogle search error, SearXNG fallback devrede: ${error.message}`,
    );
    throw error;
  }
}

/**
 * Search using Whoogle first, then SearXNG fallback
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
    const whoogleResults = await rateLimitedRequest(() =>
      whoogleSearch(query, options),
    );

    if (whoogleResults.length > 0) {
      return whoogleResults;
    }

    console.warn("⚠️ Whoogle 0 sonuç döndürdü, SearXNG fallback deneniyor");
  } catch {
    // Fallback below intentionally handles the request.
  }

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
 * ENHANCED ALGORITHM v3:
 * - Improved keyword extraction (AI terms, proper nouns, meaningful words)
 * - Exact title match (high priority)
 * - Keyword specificity (unique terms = higher score)
 * - Freshness indicator (recent coverage)
 * - Source diversity (different domains = trending)
 * - Position weighting (top positions = more relevant)
 * - AI term bonus (boost AI-specific content)
 */
export async function calculateTrendScoreSearXNG(
  title: string,
  description: string,
): Promise<number> {
  try {
    // Enhanced stopwords list
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
      "your",
      "they",
      "make",
      "like",
      "time",
      "year",
      "work",
      "good",
      "many",
      "much",
      "well",
      "back",
      "call",
      "come",
      "find",
      "give",
      "hand",
      "high",
      "keep",
      "last",
      "long",
      "look",
      "made",
      "part",
      "seem",
      "take",
      "tell",
      "want",
      "week",
      "show",
      "know",
      "need",
      "feel",
      "help",
      "turn",
      "move",
      "live",
      "mean",
      "leave",
      "think",
      "still",
      "every",
      "great",
      "right",
      "small",
      "large",
      "next",
      "early",
      "young",
    ];

    // AI-specific important terms (should NOT be filtered)
    const aiTerms = [
      "openai",
      "anthropic",
      "google",
      "microsoft",
      "meta",
      "deepmind",
      "chatgpt",
      "claude",
      "gemini",
      "llama",
      "grok",
      "mistral",
      "cohere",
      "nvidia",
      "agent",
      "agents",
      "agentic",
      "multimodal",
      "reasoning",
      "training",
      "inference",
      "transformer",
      "diffusion",
      "embedding",
      "robotics",
      "autonomous",
      "generative",
      "neural",
      "algorithm",
      "deployment",
      "scaling",
      "compute",
    ];

    // Extract keywords with improved logic
    const titleLower = title.toLowerCase();
    const words = titleLower
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);

    // Priority 1: AI-specific terms
    const aiKeywords = words.filter((w) =>
      aiTerms.some((term) => w.includes(term) || term.includes(w)),
    );

    // Priority 2: Capitalized words (proper nouns/brands)
    const capitalizedWords = title
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 2 &&
          w[0] === w[0].toUpperCase() &&
          w.slice(1) === w.slice(1).toLowerCase() &&
          !stopWords.includes(w.toLowerCase()),
      )
      .map((w) => w.toLowerCase());

    // Priority 3: Long meaningful words (>5 chars)
    const meaningfulWords = words.filter(
      (w) => w.length > 5 && !stopWords.includes(w),
    );

    // Priority 4: Medium words (4-5 chars)
    const mediumWords = words.filter(
      (w) => w.length >= 4 && w.length <= 5 && !stopWords.includes(w),
    );

    // Combine with priority order
    const allKeywords = [
      ...new Set([
        ...aiKeywords,
        ...capitalizedWords,
        ...meaningfulWords,
        ...mediumWords,
      ]),
    ];

    // Take top 5 keywords
    const keywords = allKeywords.slice(0, 5);

    if (keywords.length === 0) {
      console.log(`📊 SearXNG trend score: 50 (no valid keywords)`);
      return 50;
    }

    // Build smarter search query
    let searchQuery = keywords.join(" ");
    if (aiKeywords.length > 0) {
      searchQuery =
        `${aiKeywords.join(" ")} ${keywords.filter((k) => !aiKeywords.includes(k)).join(" ")}`.trim();
    }

    console.log(
      `🔍 SearXNG query: "${searchQuery}" (${keywords.length} keywords, ${aiKeywords.length} AI terms)`,
    );

    // Search for keywords in news category only
    const keywordResults = await searxngSearch(searchQuery, {
      count: 15,
      time_range: "day",
      categories: "news",
    });

    // Calculate metrics
    // 1. Result count score (0-100)
    const resultCountScore = Math.min(100, keywordResults.length * 7);

    // 2. Source diversity score (0-50)
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

    // 3. Position score (0-50)
    const avgPosition =
      keywordResults.length > 0
        ? keywordResults.reduce((sum, r) => sum + (r.positions?.[0] || 10), 0) /
          keywordResults.length
        : 10;
    const positionScore = Math.max(0, 50 - avgPosition * 5);

    // 4. Keyword specificity bonus (0-30)
    const specificityBonus = keywords.length >= 3 ? 30 : keywords.length * 10;

    // 5. Title match bonus (0-50)
    const titleMatchCount = keywordResults.filter(
      (r) =>
        r.title?.toLowerCase().includes(keywords[0]) &&
        (keywords.length < 2 || r.title?.toLowerCase().includes(keywords[1])),
    ).length;
    const titleMatchBonus = Math.min(50, titleMatchCount * 15);

    // 6. AI term bonus (0-30)
    const aiTermBonus =
      aiKeywords.length > 0 ? Math.min(30, aiKeywords.length * 15) : 0;

    // Calculate total score (0-310 range, normalized to 0-100)
    const rawScore =
      resultCountScore +
      diversityScore +
      positionScore +
      specificityBonus +
      titleMatchBonus +
      aiTermBonus;
    const normalizedScore = Math.round((rawScore / 310) * 100);

    // Add random variance (±5)
    const variance = Math.floor(Math.random() * 11) - 5;
    const finalScore = Math.max(5, Math.min(100, normalizedScore + variance));

    console.log(
      `📊 SearXNG trend score: ${finalScore} (results: ${keywordResults.length}, domains: ${uniqueDomains.size}, pos: ${avgPosition.toFixed(1)}, ai_bonus: ${aiTermBonus})`,
    );

    return finalScore;
  } catch (error: any) {
    console.error("❌ SearXNG trend score error:", error.message);
    return Math.floor(Math.random() * 41) + 20;
  }
}

export default {
  searxngSearch,
  calculateTrendScoreSearXNG,
};
