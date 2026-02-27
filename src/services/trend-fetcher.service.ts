/**
 * Trend Fetcher Service
 *
 * RESPONSIBILITIES:
 * 1. Fetch Twitter trends (static AI topics fallback)
 * 2. Fetch Mastodon trending tags (public API, no auth needed)
 * 3. Fetch Bluesky trending posts (AT Protocol search)
 * 4. Normalize and store trends in PostgreSQL
 * 5. Extract keywords for soft matching
 * 6. Run as background cron job (every 15 minutes)
 *
 * PLATFORMS:
 * - Twitter: static AI trend topics (free, no API key)
 * - Mastodon: /api/v1/trends/tags (public, no auth required)
 * - Bluesky: app.bsky.feed.searchPosts (AT Protocol, auth required)
 */

import { db } from "@/lib/db";
import { createModuleLogger } from "@/lib/agent-log-stream";
import { BskyAgent } from "@atproto/api";

const logger = createModuleLogger("TrendFetcher");

// ============================================================================
// CONFIGURATION
// ============================================================================

export const TREND_CONFIG = {
  twitter: {
    enabled: true,
    regions: {
      TR: 23424969,
      US: 23424977,
      global: 1,
    },
  },
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
  platform: "twitter" | "mastodon" | "bluesky";
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

/**
 * Fetch Twitter trends - static fallback since Twitter API requires paid access
 */
async function fetchTwitterTrends(region: string): Promise<NormalizedTrend[]> {
  logger.info(`📡 Twitter trends for ${region} - Using static AI topics`);

  const staticTrends: NormalizedTrend[] = [
    {
      platform: "twitter",
      topic: "ChatGPT",
      hashtag: "#ChatGPT",
      volume: 50000,
      score: 95,
      sentiment: "positive",
      region,
      language: region === "TR" ? "tr" : "en",
      keywords: ["chatgpt", "openai", "yapay zeka", "ai"],
      rank: 1,
    },
    {
      platform: "twitter",
      topic: "Gemini AI",
      hashtag: "#GeminiAI",
      volume: 30000,
      score: 85,
      sentiment: "positive",
      region,
      language: region === "TR" ? "tr" : "en",
      keywords: ["gemini", "google", "ai", "yapay zeka"],
      rank: 2,
    },
    {
      platform: "twitter",
      topic: "Claude AI",
      hashtag: "#ClaudeAI",
      volume: 25000,
      score: 80,
      sentiment: "positive",
      region,
      language: region === "TR" ? "tr" : "en",
      keywords: ["claude", "anthropic", "ai", "yapay zeka"],
      rank: 3,
    },
  ];

  return staticTrends;
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
  platform?: "twitter" | "mastodon" | "bluesky";
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
  twitterCount: number;
  mastodonCount: number;
  blueskyCount: number;
  savedCount: number;
  duration: number;
}> {
  const startTime = Date.now();

  logger.info("🚀 Starting trend fetch...");

  try {
    // Fetch from all sources in parallel
    const [mastodonTrends, blueskyTrends, twitterTrendsTR, twitterTrendsUS] =
      await Promise.all([
        TREND_CONFIG.mastodon.enabled
          ? fetchMastodonTrends()
          : Promise.resolve([]),
        TREND_CONFIG.bluesky.enabled
          ? fetchBlueskyTrends()
          : Promise.resolve([]),
        TREND_CONFIG.twitter.enabled
          ? fetchTwitterTrends("TR")
          : Promise.resolve([]),
        TREND_CONFIG.twitter.enabled
          ? fetchTwitterTrends("US")
          : Promise.resolve([]),
      ]);

    const allTrends = [
      ...mastodonTrends,
      ...blueskyTrends,
      ...twitterTrendsTR,
      ...twitterTrendsUS,
    ];

    // Save to database
    const savedCount = await saveTrendsToDatabase(allTrends);

    // Cleanup old trends
    const cleanedCount = await cleanupExpiredTrends();
    if (cleanedCount > 0) {
      logger.info(`🧹 Cleaned up ${cleanedCount} expired trends`);
    }

    const duration = Date.now() - startTime;

    logger.success(
      `✅ Trend fetch complete: ${savedCount} saved | Mastodon: ${mastodonTrends.length}, Bluesky: ${blueskyTrends.length}, Twitter: ${twitterTrendsTR.length + twitterTrendsUS.length} (${duration}ms)`,
    );

    return {
      success: true,
      twitterCount: twitterTrendsTR.length + twitterTrendsUS.length,
      mastodonCount: mastodonTrends.length,
      blueskyCount: blueskyTrends.length,
      savedCount,
      duration,
    };
  } catch (error) {
    logger.error(
      `❌ Trend fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      success: false,
      twitterCount: 0,
      mastodonCount: 0,
      blueskyCount: 0,
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
