/**
 * Trend Fetcher Service
 *
 * RESPONSIBILITIES:
 * 1. Fetch Mastodon trending tags (public API, no auth needed)
 * 2. Fetch Bluesky trending posts (AT Protocol search)
 * 3. Fetch HackerNews top AI stories (Firebase API, free)
 * 4. Fetch ArXiv latest AI papers (public API, free)
 * 5. Fetch Lobsters AI-tagged stories (JSON API, free)
 * 6. Normalize and store trends in PostgreSQL
 * 7. Extract keywords for soft matching
 * 8. Run as background cron job (every 15 minutes)
 *
 * PLATFORMS:
 * - Mastodon: /api/v1/trends/tags (public, no auth required)
 * - Bluesky: app.bsky.feed.searchPosts (AT Protocol, auth required)
 * - HackerNews: Firebase API (free, no auth, no rate limit)
 * - ArXiv: export.arxiv.org/api (free, no auth)
 * - Lobsters: lobste.rs/t/ai.json (free, no auth)
 */

import { db } from "@/lib/db";
import { createModuleLogger } from "@/lib/agent-log-stream";
import { BskyAgent } from "@atproto/api";

const logger = createModuleLogger("TrendFetcher");

// ============================================================================
// CONFIGURATION
// ============================================================================

export const TREND_CONFIG = {
  mastodon: {
    enabled: process.env.MASTODON_ENABLED === "true",
    instanceUrl:
      process.env.MASTODON_INSTANCE_URL || "https://mastodon.social",
    // No auth needed for trending API
    trendLimit: 20,
  },
  bluesky: {
    enabled: process.env.BLUESKY_ENABLED === "true",
    handle: process.env.BLUESKY_HANDLE || "",
    appPassword: process.env.BLUESKY_APP_PASSWORD || "",
    // AI/tech search queries for trend discovery
    searchQueries: [
      "artificial intelligence",
      "yapay zeka",
      "ChatGPT",
      "LLM",
      "machine learning",
      "OpenAI",
      "Claude AI",
      "Gemini AI",
    ],
    postsPerQuery: 5,
  },
  hackernews: {
    enabled: true, // Always free, no API key needed
    topStoriesLimit: 30, // Check top 30 stories
    aiKeywords: [
      "ai", "artificial intelligence", "machine learning", "deep learning",
      "llm", "gpt", "chatgpt", "openai", "anthropic", "claude", "gemini",
      "neural", "transformer", "diffusion", "generative", "copilot",
      "langchain", "rag", "vector", "embedding", "fine-tuning", "fine tuning",
      "mistral", "llama", "deepseek", "groq", "hugging face", "midjourney",
      "stable diffusion", "sora", "multimodal", "agent", "agentic",
    ],
  },
  arxiv: {
    enabled: true, // Always free, no API key needed
    categories: ["cs.AI", "cs.LG", "cs.CL", "cs.CV"],
    maxResults: 20,
  },
  lobsters: {
    enabled: true, // Always free, no API key needed
    tags: ["ai", "ml", "llm"],
    limit: 25,
  },
  // How often to fetch (in minutes)
  fetchIntervalMinutes: 15,
  // How long trends are valid (in hours)
  trendExpiryHours: 6,
  // Cleanup: delete trends older than X days
  cleanupDays: 30,
};

// ============================================================================
// TYPES
// ============================================================================

interface NormalizedTrend {
  platform: "mastodon" | "bluesky" | "hackernews" | "arxiv" | "lobsters";
  topic: string;
  hashtag?: string;
  volume: number;
  score: number;
  sentiment: "positive" | "negative" | "neutral";
  region: string;
  language: string;
  keywords: string[];
  rank?: number;
  url?: string;
}

// Mastodon trending tag shape
interface MastodonTrendingTag {
  name: string;
  url: string;
  history: Array<{
    day: string;
    uses: string;
    accounts: string;
  }>;
}

// ============================================================================
// MASTODON TREND FETCHER (Public API - No Auth Required)
// ============================================================================

/**
 * Fetch trending hashtags from Mastodon instance
 * Uses GET /api/v1/trends/tags - public endpoint, no auth needed
 */
async function fetchMastodonTrends(): Promise<NormalizedTrend[]> {
  const { instanceUrl, trendLimit } = TREND_CONFIG.mastodon;

  logger.info(`🐘 Fetching Mastodon trends from ${instanceUrl}...`);

  try {
    const response = await fetch(
      `${instanceUrl}/api/v1/trends/tags?limit=${trendLimit}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "AIHaberleri/1.0",
        },
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!response.ok) {
      logger.error(
        `Mastodon trends API returned ${response.status}: ${response.statusText}`,
      );
      return [];
    }

    const tags: MastodonTrendingTag[] = await response.json();

    const trends: NormalizedTrend[] = tags.map((tag, index) => {
      // Calculate volume from recent history
      const recentHistory = tag.history.slice(0, 2);
      const totalUses = recentHistory.reduce(
        (sum, h) => sum + parseInt(h.uses, 10),
        0,
      );
      const totalAccounts = recentHistory.reduce(
        (sum, h) => sum + parseInt(h.accounts, 10),
        0,
      );

      // Score based on usage and unique accounts
      const engagementScore = Math.min(
        100,
        Math.round((totalUses * 0.3 + totalAccounts * 0.7) / 2),
      );

      return {
        platform: "mastodon" as const,
        topic: `#${tag.name}`,
        hashtag: `#${tag.name}`,
        volume: totalUses,
        score: Math.max(10, engagementScore),
        sentiment: analyzeSentiment(tag.name),
        region: "global",
        language: "en",
        keywords: extractKeywords(tag.name, "en"),
        rank: index + 1,
        url: tag.url,
      };
    });

    logger.info(`✅ Fetched ${trends.length} Mastodon trending tags`);
    return trends;
  } catch (error) {
    logger.error(
      `❌ Mastodon trend fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

// ============================================================================
// BLUESKY TREND FETCHER (AT Protocol Search)
// ============================================================================

// Cache for Bluesky agent
let bskyAgent: BskyAgent | null = null;
let bskySessionExpiry: number = 0;

/**
 * Get or create authenticated Bluesky agent for search
 */
async function getBlueskyAgent(): Promise<BskyAgent | null> {
  const { handle, appPassword } = TREND_CONFIG.bluesky;

  if (!handle || !appPassword) {
    logger.warn("Bluesky credentials not configured");
    return null;
  }

  const now = Date.now();
  if (bskyAgent && now < bskySessionExpiry) {
    return bskyAgent;
  }

  try {
    const agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({ identifier: handle, password: appPassword });

    bskyAgent = agent;
    bskySessionExpiry = now + 90 * 60 * 1000; // 1.5 hours

    logger.info("🦋 Bluesky session created for trend fetching");
    return agent;
  } catch (error) {
    logger.error(
      `❌ Bluesky login failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    bskyAgent = null;
    bskySessionExpiry = 0;
    return null;
  }
}

/**
 * Fetch trending AI/tech posts from Bluesky
 * Uses searchPosts API to find popular AI-related content
 */
async function fetchBlueskyTrends(): Promise<NormalizedTrend[]> {
  logger.info("🦋 Fetching Bluesky trends...");

  const agent = await getBlueskyAgent();
  if (!agent) {
    logger.warn("Bluesky agent not available, skipping");
    return [];
  }

  const allTrends: NormalizedTrend[] = [];
  const seenTopics = new Set<string>();

  for (const query of TREND_CONFIG.bluesky.searchQueries) {
    try {
      const result = await agent.app.bsky.feed.searchPosts({
        q: query,
        limit: TREND_CONFIG.bluesky.postsPerQuery,
        sort: "top",
      });

      if (!result.success || !result.data.posts) continue;

      for (const post of result.data.posts) {
        const text =
          (post.record as { text?: string })?.text || "";
        if (!text || text.length < 10) continue;

        // Deduplicate by first 50 chars of text
        const topicKey = text.substring(0, 50).toLowerCase();
        if (seenTopics.has(topicKey)) continue;
        seenTopics.add(topicKey);

        // Extract topic from first sentence/line
        const topic = text.split(/[.\n]/)[0].substring(0, 100).trim();
        if (!topic) continue;

        // Engagement metrics
        const likes = post.likeCount || 0;
        const reposts = post.repostCount || 0;
        const replies = post.replyCount || 0;
        const engagement = likes + reposts * 2 + replies * 1.5;

        // Score: 0-100 based on engagement
        const score = Math.min(100, Math.round(engagement / 5));

        // Detect language
        const isTurkish =
          /[ğüşıöçĞÜŞİÖÇ]/.test(text) ||
          query === "yapay zeka";

        allTrends.push({
          platform: "bluesky" as const,
          topic,
          hashtag: extractHashtag(text),
          volume: Math.round(engagement),
          score: Math.max(10, score),
          sentiment: analyzeSentiment(text),
          region: isTurkish ? "TR" : "global",
          language: isTurkish ? "tr" : "en",
          keywords: extractKeywords(text, isTurkish ? "tr" : "en"),
          rank: allTrends.length + 1,
          url: `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split("/").pop()}`,
        });
      }

      // Rate limiting between queries
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      logger.warn(
        `Bluesky search for "${query}" failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  logger.info(`✅ Fetched ${allTrends.length} Bluesky trending posts`);
  return allTrends;
}

/**
 * Extract first hashtag from text
 */
function extractHashtag(text: string): string | undefined {
  const match = text.match(/#[\w\u00C0-\u024FğüşıöçĞÜŞİÖÇ]+/);
  return match ? match[0] : undefined;
}

// ============================================================================
// TWITTER FETCHER (Static AI topics fallback)
// ============================================================================

// ============================================================================
// HACKER NEWS FETCHER (Free API, no auth)
// ============================================================================

/**
 * Fetch AI-related trends from Hacker News top stories
 * API: https://hacker-news.firebaseio.com/v0/
 */
async function fetchHackerNewsTrends(): Promise<NormalizedTrend[]> {
  if (!TREND_CONFIG.hackernews.enabled) return [];

  try {
    logger.info("📡 HackerNews: Fetching top stories...");

    // 1. Top story ID'lerini al
    const topRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    if (!topRes.ok) throw new Error(`HN top stories failed: ${topRes.status}`);
    const topIds: number[] = await topRes.json();

    // 2. İlk N story'nin detayını paralel çek
    const limit = TREND_CONFIG.hackernews.topStoriesLimit;
    const storyPromises = topIds.slice(0, limit).map(async (id) => {
      try {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return r.ok ? await r.json() : null;
      } catch { return null; }
    });
    const stories = (await Promise.all(storyPromises)).filter(Boolean);

    // 3. AI keyword filtresi
    const aiKeywords = TREND_CONFIG.hackernews.aiKeywords;
    const aiStories = stories.filter((s: any) => {
      const text = `${s.title || ""} ${s.url || ""}`.toLowerCase();
      return aiKeywords.some((kw) => text.includes(kw));
    });

    logger.info(`📡 HackerNews: ${aiStories.length}/${stories.length} AI-related stories found`);

    // 4. NormalizedTrend'e dönüştür
    return aiStories.map((story: any, i: number) => ({
      platform: "hackernews" as const,
      topic: story.title || "HN Story",
      hashtag: undefined,
      volume: (story.score || 0) * 10 + (story.descendants || 0),
      score: Math.min(100, Math.max(10, (story.score || 0))),
      sentiment: "neutral" as const,
      region: "GLOBAL",
      language: "en",
      keywords: extractKeywords(story.title || "", "en"),
      rank: i + 1,
      url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
    }));
  } catch (error) {
    logger.error(`❌ HackerNews trend fetch error: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// ============================================================================
// ARXIV FETCHER (Free API, no auth)
// ============================================================================

/**
 * Fetch latest AI papers from ArXiv
 * API: https://export.arxiv.org/api/query
 */
async function fetchArXivTrends(): Promise<NormalizedTrend[]> {
  if (!TREND_CONFIG.arxiv.enabled) return [];

  try {
    logger.info("📡 ArXiv: Fetching latest AI papers...");

    const categories = TREND_CONFIG.arxiv.categories.map((c) => `cat:${c}`).join("+OR+");
    const maxResults = TREND_CONFIG.arxiv.maxResults;
    const url = `https://export.arxiv.org/api/query?search_query=${categories}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`ArXiv API failed: ${res.status}`);
    const xmlText = await res.text();

    // Simple XML parsing (ArXiv returns Atom XML)
    const entries: NormalizedTrend[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    let rank = 0;

    while ((match = entryRegex.exec(xmlText)) !== null) {
      rank++;
      const entry = match[1];
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, " ").trim() || "";
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, " ").trim() || "";
      const link = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() || "";

      // ArXiv paper'ların popülerliğini tarihine göre tahmini skor
      const daysSincePublish = published
        ? Math.max(0, (Date.now() - new Date(published).getTime()) / 86400000)
        : 0;
      const freshnessScore = Math.max(20, 100 - daysSincePublish * 10);

      entries.push({
        platform: "arxiv" as const,
        topic: title,
        hashtag: undefined,
        volume: Math.round(freshnessScore * 100),
        score: Math.round(freshnessScore),
        sentiment: "neutral" as const,
        region: "GLOBAL",
        language: "en",
        keywords: extractKeywords(`${title} ${summary.slice(0, 200)}`, "en"),
        rank,
        url: link,
      });
    }

    logger.info(`📡 ArXiv: ${entries.length} AI papers fetched`);
    return entries;
  } catch (error) {
    logger.error(`❌ ArXiv trend fetch error: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// ============================================================================
// LOBSTERS FETCHER (Free API, no auth)
// ============================================================================

/**
 * Fetch AI-tagged stories from Lobste.rs
 * API: https://lobste.rs/t/{tag}.json
 */
async function fetchLobstersTrends(): Promise<NormalizedTrend[]> {
  if (!TREND_CONFIG.lobsters.enabled) return [];

  try {
    logger.info("📡 Lobsters: Fetching AI-tagged stories...");

    const limit = TREND_CONFIG.lobsters.limit;
    const tags = TREND_CONFIG.lobsters.tags;

    // Her tag için paralel fetch
    const allStories: any[] = [];
    const seenUrls = new Set<string>();

    const tagPromises = tags.map(async (tag) => {
      try {
        const r = await fetch(`https://lobste.rs/t/${tag}.json`);
        if (!r.ok) return [];
        const data = await r.json();
        return Array.isArray(data) ? data.slice(0, limit) : [];
      } catch { return []; }
    });

    const tagResults = await Promise.all(tagPromises);
    for (const stories of tagResults) {
      for (const story of stories) {
        const url = story.url || story.short_id_url || "";
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          allStories.push(story);
        }
      }
    }

    logger.info(`📡 Lobsters: ${allStories.length} unique AI stories found`);

    return allStories.slice(0, limit).map((story: any, i: number) => ({
      platform: "lobsters" as const,
      topic: story.title || "Lobsters Story",
      hashtag: story.tags?.length ? `#${story.tags[0]}` : undefined,
      volume: (story.score || 0) * 15 + (story.comment_count || 0) * 5,
      score: Math.min(100, Math.max(10, (story.score || 0) * 3)),
      sentiment: "neutral" as const,
      region: "GLOBAL",
      language: "en",
      keywords: extractKeywords(story.title || "", "en"),
      rank: i + 1,
      url: story.url || story.short_id_url || `https://lobste.rs/s/${story.short_id}`,
    }));
  } catch (error) {
    logger.error(`❌ Lobsters trend fetch error: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// ============================================================================
// KEYWORD EXTRACTION
// ============================================================================

/**
 * Extract keywords from text for soft matching
 */
function extractKeywords(text: string, lang: string): string[] {
  // Remove special characters and split
  const cleanText = text
    .toLowerCase()
    .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleanText.split(" ");

  // Stop words (common words to ignore)
  const stopWordsEn = new Set([
    "the",
    "is",
    "at",
    "which",
    "on",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "to",
    "for",
    "of",
    "with",
    "as",
    "by",
    "from",
    "that",
    "this",
    "it",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
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
    "must",
    "can",
    "what",
    "how",
    "why",
    "when",
    "where",
    "who",
    "whom",
    "whose",
    "new",
    "just",
    "now",
    "here",
    "there",
  ]);

  const stopWordsTr = new Set([
    "ve",
    "ile",
    "bir",
    "bu",
    "da",
    "de",
    "için",
    "mi",
    "mı",
    "mu",
    "mü",
    "ne",
    "neden",
    "nasıl",
    "daha",
    "gibi",
    "olarak",
    "olan",
    "ama",
    "ancak",
    "fakat",
    "çok",
    "her",
    "tüm",
    "bütün",
    "kadar",
    "sonra",
    "önce",
    "artık",
    "şu",
    "o",
    "ya",
    "ki",
  ]);

  const stopWords = lang === "tr" ? stopWordsTr : stopWordsEn;

  // Filter and return unique keywords
  const keywords = words
    .filter((word) => word.length >= 3 && !stopWords.has(word))
    .slice(0, 10); // Max 10 keywords

  return [...new Set(keywords)];
}

// ============================================================================
// SENTIMENT ANALYSIS (Basic)
// ============================================================================

/**
 * Check if text is primarily Latin/Turkish script
 * Filters out CJK (Chinese/Japanese/Korean), Arabic, Cyrillic etc.
 */
function isLatinOrTurkish(text: string): boolean {
  if (!text || text.length < 3) return false;
  // Count Latin + Turkish characters vs total alphabetic characters
  const latinTurkishPattern = /[a-zA-ZğüşıöçĞÜŞİÖÇàáâãäåæèéêëìíîïòóôõöùúûüýÿñ]/g;
  const allAlphaPattern = /\p{L}/gu;
  const latinMatches = text.match(latinTurkishPattern) || [];
  const allAlphaMatches = text.match(allAlphaPattern) || [];
  if (allAlphaMatches.length === 0) return false;
  // At least 60% of alphabetic characters should be Latin/Turkish
  return latinMatches.length / allAlphaMatches.length >= 0.6;
}

/**
 * Basic sentiment analysis based on keyword matching
 */
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const lowerText = text.toLowerCase();

  const positiveWords = [
    "breakthrough",
    "amazing",
    "great",
    "awesome",
    "incredible",
    "revolutionary",
    "success",
    "win",
    "launch",
    "release",
    "harika",
    "muhteşem",
    "başarı",
    "yeni",
    "gelişme",
  ];

  const negativeWords = [
    "crash",
    "fail",
    "error",
    "bug",
    "problem",
    "issue",
    "critical",
    "layoff",
    "fired",
    "scandal",
    "lawsuit",
    "hack",
    "breach",
    "hata",
    "sorun",
    "kriz",
    "skandal",
    "tehlike",
  ];

  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of positiveWords) {
    if (lowerText.includes(word)) positiveScore++;
  }

  for (const word of negativeWords) {
    if (lowerText.includes(word)) negativeScore++;
  }

  if (positiveScore > negativeScore) return "positive";
  if (negativeScore > positiveScore) return "negative";
  return "neutral";
}

// ============================================================================
// GLOBAL TREND SCORE NORMALIZATION
// ============================================================================

/**
 * Calculate globally comparable trend scores across all platforms.
 *
 * Problem: Each platform scores on its own scale:
 *   - ArXiv: freshness-based (new papers always ~87)
 *   - HackerNews: raw upvotes (1-500+)
 *   - Lobsters: upvotes * 3 (low numbers)
 *   - Bluesky: engagement / 5
 *   - Mastodon: (uses + accounts) / 2
 *
 * Solution:
 *   1. Normalize each platform's scores to 0-1 range (within-platform)
 *   2. Combine normalized score (60%) + normalized volume (40%)
 *   3. Multiply by platform credibility ceiling
 *
 * Platform ceilings reflect signal quality:
 *   - HackerNews: 100 (real upvotes from large tech community)
 *   - Bluesky: 90 (real engagement metrics)
 *   - Lobsters: 80 (curated tech community, real upvotes)
 *   - ArXiv: 70 (academic, no real engagement metric)
 *   - Mastodon: 65 (hashtag-based, less targeted)
 */
function calculateGlobalScores(trends: NormalizedTrend[]): NormalizedTrend[] {
  const PLATFORM_CEILING: Record<string, number> = {
    hackernews: 100,
    bluesky: 90,
    lobsters: 80,
    arxiv: 70,
    mastodon: 65,
  };

  // Group by platform
  const byPlatform = new Map<string, NormalizedTrend[]>();
  for (const t of trends) {
    const group = byPlatform.get(t.platform) || [];
    group.push(t);
    byPlatform.set(t.platform, group);
  }

  for (const [platform, group] of byPlatform) {
    if (group.length === 0) continue;

    const scores = group.map((t) => t.score);
    const volumes = group.map((t) => t.volume);

    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes);

    const scoreRange = maxScore - minScore || 1;
    const volumeRange = maxVolume - minVolume || 1;
    const ceiling = PLATFORM_CEILING[platform] || 50;

    for (const t of group) {
      // Normalize to 0-1 within platform
      const normScore = (t.score - minScore) / scoreRange;
      const normVolume = (t.volume - minVolume) / volumeRange;

      // Weighted combination: engagement 60%, volume 40%
      const combined = normScore * 0.6 + normVolume * 0.4;

      // Apply platform ceiling → global score
      t.score = Math.max(1, Math.round(combined * ceiling));
    }
  }

  return trends;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Save normalized trends to database
 */
async function saveTrendsToDatabase(
  trends: NormalizedTrend[],
): Promise<number> {
  if (trends.length === 0) return 0;

  const expiresAt = new Date(
    Date.now() + TREND_CONFIG.trendExpiryHours * 60 * 60 * 1000,
  );

  const trendKey = (
    trend: Pick<NormalizedTrend, "platform" | "topic" | "region">,
  ) => `${trend.platform}::${trend.topic}::${trend.region}`;

  const deduplicatedTrends = Array.from(
    trends
      .reduce((map, trend) => {
        map.set(trendKey(trend), trend);
        return map;
      }, new Map<string, NormalizedTrend>())
      .values(),
  );

  const existingTrends = await db.socialTrend.findMany({
    where: {
      OR: deduplicatedTrends.map((trend) => ({
        platform: trend.platform,
        topic: trend.topic,
        region: trend.region,
      })),
    },
    select: {
      id: true,
      platform: true,
      topic: true,
      region: true,
    },
  });

  const existingTrendMap = new Map(
    existingTrends.map((trend) => [
      `${trend.platform}::${trend.topic}::${trend.region}`,
      trend,
    ]),
  );

  const BATCH_SIZE = 10;
  let savedCount = 0;

  for (let i = 0; i < deduplicatedTrends.length; i += BATCH_SIZE) {
    const batch = deduplicatedTrends.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (trend) => {
        const existingTrend = existingTrendMap.get(trendKey(trend));

        if (existingTrend) {
          await db.socialTrend.update({
            where: { id: existingTrend.id },
            data: {
              volume: trend.volume,
              score: trend.score,
              sentiment: trend.sentiment,
              rank: trend.rank,
              expiresAt,
              fetchedAt: new Date(),
            },
          });

          await db.trendSnapshot.create({
            data: {
              trendId: existingTrend.id,
              volume: trend.volume,
              score: trend.score,
              rank: trend.rank || 0,
            },
          });
          return;
        }

        await db.socialTrend.create({
          data: {
            platform: trend.platform,
            topic: trend.topic,
            hashtag: trend.hashtag,
            volume: trend.volume,
            score: trend.score,
            sentiment: trend.sentiment,
            region: trend.region,
            language: trend.language,
            keywords: trend.keywords,
            rank: trend.rank,
            url: trend.url,
            expiresAt,
          },
        });
      }),
    );

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        savedCount++;
      } else {
        const trend = batch[index];
        logger.error(
          `Failed to save trend: ${trend.topic} - ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
    }
  }

  return savedCount;
}

/**
 * Get active (non-expired) trends from database
 */
export async function getActiveTrends(options?: {
  platform?: "mastodon" | "bluesky" | "hackernews" | "arxiv" | "lobsters";
  region?: string;
  language?: string;
  limit?: number;
}): Promise<
  {
    id: string;
    platform: string;
    topic: string;
    hashtag: string | null;
    score: number;
    keywords: string[];
    sentiment: string;
  }[]
> {
  const now = new Date();

  return db.socialTrend.findMany({
    where: {
      expiresAt: { gt: now },
      ...(options?.platform && { platform: options.platform }),
      ...(options?.region && { region: options.region }),
      ...(options?.language && { language: options.language }),
    },
    orderBy: { score: "desc" },
    take: options?.limit || 50,
    select: {
      id: true,
      platform: true,
      topic: true,
      hashtag: true,
      score: true,
      keywords: true,
      sentiment: true,
    },
  });
}

/**
 * Cleanup expired trends (keep for dataset, but mark as expired)
 */
export async function cleanupExpiredTrends(): Promise<number> {
  const cutoffDate = new Date(
    Date.now() - TREND_CONFIG.cleanupDays * 24 * 60 * 60 * 1000,
  );

  // Delete very old trends (but keep snapshots for dataset)
  const result = await db.socialTrend.deleteMany({
    where: {
      fetchedAt: { lt: cutoffDate },
    },
  });

  return result.count;
}

// ============================================================================
// MAIN FETCH FUNCTION
// ============================================================================

/**
 * Main function to fetch all trends
 * Called by cron job every 15 minutes
 */
export async function fetchAllTrends(): Promise<{
  success: boolean;
  mastodonCount: number;
  blueskyCount: number;
  hackernewsCount: number;
  arxivCount: number;
  lobstersCount: number;
  savedCount: number;
  duration: number;
}> {
  const startTime = Date.now();

  logger.info("🚀 Starting trend fetch...");

  try {
    // Fetch from all sources in parallel
    const [
      mastodonTrends,
      blueskyTrends,
      hackerNewsTrends,
      arxivTrends,
      lobstersTrends,
    ] = await Promise.all([
      TREND_CONFIG.mastodon.enabled
        ? fetchMastodonTrends()
        : Promise.resolve([]),
      TREND_CONFIG.bluesky.enabled
        ? fetchBlueskyTrends()
        : Promise.resolve([]),
      TREND_CONFIG.hackernews.enabled
        ? fetchHackerNewsTrends()
        : Promise.resolve([]),
      TREND_CONFIG.arxiv.enabled
        ? fetchArXivTrends()
        : Promise.resolve([]),
      TREND_CONFIG.lobsters.enabled
        ? fetchLobstersTrends()
        : Promise.resolve([]),
    ]);

    const allTrendsRaw = [
      ...mastodonTrends,
      ...blueskyTrends,
      ...hackerNewsTrends,
      ...arxivTrends,
      ...lobstersTrends,
    ];

    // Filter out non-Latin/Turkish trends (CJK, Arabic, Cyrillic etc.)
    const allTrends = allTrendsRaw.filter((t) => isLatinOrTurkish(t.topic));
    const filteredCount = allTrendsRaw.length - allTrends.length;
    if (filteredCount > 0) {
      logger.info(`🔤 Filtered ${filteredCount} non-Latin/Turkish trends`);
    }

    // Calculate globally comparable scores across platforms
    calculateGlobalScores(allTrends);

    // Sort by global score descending before saving
    allTrends.sort((a, b) => b.score - a.score);

    // Save to database
    const savedCount = await saveTrendsToDatabase(allTrends);

    // Cleanup old trends
    const cleanedCount = await cleanupExpiredTrends();
    if (cleanedCount > 0) {
      logger.info(`🧹 Cleaned up ${cleanedCount} expired trends`);
    }

    const duration = Date.now() - startTime;

    logger.success(
      `✅ Trend fetch complete: ${savedCount} saved | Mastodon: ${mastodonTrends.length}, Bluesky: ${blueskyTrends.length}, HN: ${hackerNewsTrends.length}, ArXiv: ${arxivTrends.length}, Lobsters: ${lobstersTrends.length} (${duration}ms)`,
    );

    return {
      success: true,
      mastodonCount: mastodonTrends.length,
      blueskyCount: blueskyTrends.length,
      hackernewsCount: hackerNewsTrends.length,
      arxivCount: arxivTrends.length,
      lobstersCount: lobstersTrends.length,
      savedCount,
      duration,
    };
  } catch (error) {
    logger.error(
      `❌ Trend fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      success: false,
      mastodonCount: 0,
      blueskyCount: 0,
      hackernewsCount: 0,
      arxivCount: 0,
      lobstersCount: 0,
      savedCount: 0,
      duration: Date.now() - startTime,
    };
  }
}

// ============================================================================
// CRON JOB SETUP
// ============================================================================

let fetchInterval: NodeJS.Timeout | null = null;

/**
 * Start the trend fetcher cron job
 */
export function startTrendFetcher(): void {
  if (fetchInterval) {
    logger.warn("Trend fetcher already running");
    return;
  }

  logger.info(
    `🕐 Starting trend fetcher (every ${TREND_CONFIG.fetchIntervalMinutes} minutes)`,
  );

  // Fetch immediately on start
  fetchAllTrends();

  // Then fetch every X minutes
  fetchInterval = setInterval(
    () => fetchAllTrends(),
    TREND_CONFIG.fetchIntervalMinutes * 60 * 1000,
  );
}

/**
 * Stop the trend fetcher cron job
 */
export function stopTrendFetcher(): void {
  if (fetchInterval) {
    clearInterval(fetchInterval);
    fetchInterval = null;
    logger.info("🛑 Trend fetcher stopped");
  }
}

export default {
  fetchAllTrends,
  getActiveTrends,
  startTrendFetcher,
  stopTrendFetcher,
  cleanupExpiredTrends,
};
