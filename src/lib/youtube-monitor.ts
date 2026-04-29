/**
 * YouTube Channel Monitor for AI News Discovery
 *
 * Monitors AI-focused YouTube channels via RSS feeds (no API key needed).
 * Extracts video titles & descriptions, filters for AI relevance,
 * and feeds topics into the news pipeline for deep research via Google News.
 *
 * FLOW:
 * YouTube RSS → Parse Videos → AI Filter → Extract Topics → Pipeline
 *
 * CREATED: 2026-02-10
 */

import axios from "axios";
import { parseStringPromise } from "xml2js";
import { db } from "@/lib/db";

// ============================================================================
// TYPES
// ============================================================================

export interface YouTubeVideo {
  title: string;
  description: string;
  videoId: string;
  channelName: string;
  channelId: string;
  publishedAt: string;
  url: string;
  thumbnailUrl?: string;
}

export interface YouTubeDiscoveredTopic {
  topic: string;
  originalTitle: string;
  description: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  confidence: number;
  keywords: string[];
}

// ============================================================================
// DEFAULT CHANNELS (seeded on first run if DB is empty)
// ============================================================================

export const DEFAULT_YOUTUBE_CHANNELS = [
  // ═══════════════════════════════════════════════════════════════
  // TIER 1: TOP AI NEWS — En popüler, günlük/haftalık paylaşım
  // ═══════════════════════════════════════════════════════════════
  {
    channelId: "UCbfYPyITQ-7l4upoX8nvctg",
    name: "Two Minute Papers",
    language: "en",
    category: "ai_research",
    priority: 5,
  },
  {
    channelId: "UChpleBmo18P08aKCIgti38g",
    name: "Matt Wolfe",
    language: "en",
    category: "ai_news",
    priority: 5,
  },
  {
    channelId: "UCNJ1Ymd5yFuUPtn21xtRbbw",
    name: "AI Explained",
    language: "en",
    category: "ai_news",
    priority: 5,
  },
  {
    channelId: "UCsBjURrPoezykLs9EqgamOA",
    name: "Fireship",
    language: "en",
    category: "ai_tools",
    priority: 5,
  },
  {
    channelId: "UCbY9xX3_jW5c2fjlZVBI4cg",
    name: "TheAIGRID",
    language: "en",
    category: "ai_news",
    priority: 5,
  },
  {
    channelId: "UCzi5kcwU8aT4aLR7LcYhfWQ",
    name: "Matthew Berman",
    language: "en",
    category: "ai_news",
    priority: 5,
  },
  {
    channelId: "UCqcbQf6yw5KzRoDDcZ_wBSw",
    name: "Wes Roth",
    language: "en",
    category: "ai_news",
    priority: 5,
  },
  {
    channelId: "UCKelCK4ZaO6HeEI1KQjqzWA",
    name: "The AI Daily Brief",
    language: "en",
    category: "ai_news",
    priority: 5,
  },
  {
    channelId: "UCwSozl89jl2zUDzQ4jGJD3g",
    name: "Skill Leap AI",
    language: "en",
    category: "ai_tools",
    priority: 5,
  },
  // ═══════════════════════════════════════════════════════════════
  // TIER 2: AI RESEARCH & DEEP DIVES — Araştırma odaklı
  // ═══════════════════════════════════════════════════════════════
  {
    channelId: "UCZHmQk67mSJgfCCTn7xBfew",
    name: "Yannic Kilcher",
    language: "en",
    category: "ai_research",
    priority: 5,
  },
  {
    channelId: "UCXUPKJO5MZQN11PqgIvyuvQ",
    name: "Andrej Karpathy",
    language: "en",
    category: "ai_research",
    priority: 5,
  },
  {
    channelId: "UCSHZKyawb77ixDdsGog4iWA",
    name: "Lex Fridman",
    language: "en",
    category: "ai_research",
    priority: 5,
  },
  {
    channelId: "UCMLtBahI5DMrt0NPvDSoIRQ",
    name: "Machine Learning Street Talk",
    language: "en",
    category: "ai_research",
    priority: 4,
  },
  {
    channelId: "UCcIXc5mJsHVYTZR1maL5l9w",
    name: "DeepLearning.AI",
    language: "en",
    category: "ai_research",
    priority: 4,
  },
  {
    channelId: "UCP7jMXSY2xbc3KCAE0MHQ-A",
    name: "Google DeepMind",
    language: "en",
    category: "ai_research",
    priority: 4,
  },
  {
    channelId: "UCHlNU7kIZhRgSbhHvFoy72w",
    name: "Hugging Face",
    language: "en",
    category: "ai_research",
    priority: 4,
  },
  {
    channelId: "UCBpxspUNl1Th33XbugiHJzw",
    name: "MIT CSAIL",
    language: "en",
    category: "ai_research",
    priority: 3,
  },
  {
    channelId: "UChugFTK0KyrES9terTid8vA",
    name: "Stanford HAI",
    language: "en",
    category: "ai_research",
    priority: 3,
  },
  // ═══════════════════════════════════════════════════════════════
  // TIER 3: AI NEWS & COMMENTARY — Haber ve yorum
  // ═══════════════════════════════════════════════════════════════
  {
    channelId: "UCgfe2ooZD3VJPB6aJAnuQng",
    name: "bycloud",
    language: "en",
    category: "ai_news",
    priority: 4,
  },
  {
    channelId: "UCPGrgwfbkjTIgPoOh2q1BAg",
    name: "David Ondrej",
    language: "en",
    category: "ai_news",
    priority: 4,
  },
  {
    channelId: "UCCtwvVWj4lvPO573Kn8fosw",
    name: "WorldofAI",
    language: "en",
    category: "ai_news",
    priority: 4,
  },
  {
    channelId: "UCvKRFNawVcuz4b9ihUTApCg",
    name: "David Shapiro",
    language: "en",
    category: "ai_news",
    priority: 4,
  },
  {
    channelId: "UCje30KbcIb8zDJKpiVgflZA",
    name: "AI News Daily",
    language: "en",
    category: "ai_news",
    priority: 4,
  },
  {
    channelId: "UCb5nX6e246b059SXttZyq2g",
    name: "AI Andy",
    language: "en",
    category: "ai_news",
    priority: 4,
  },
  {
    channelId: "UCLB7AzTwc6VFZrBsO2ucBMg",
    name: "Robert Miles AI Safety",
    language: "en",
    category: "ai_research",
    priority: 4,
  },
  // ═══════════════════════════════════════════════════════════════
  // TIER 4: AI TOOLS & TUTORIALS — Araç ve eğitim
  // ═══════════════════════════════════════════════════════════════
  {
    channelId: "UCR9j1jqqB5Rse69wjUnbYwA",
    name: "All About AI",
    language: "en",
    category: "ai_tools",
    priority: 4,
  },
  {
    channelId: "UCDq7SjbgRKty5TgGafW8Clg",
    name: "Prompt Engineering",
    language: "en",
    category: "ai_tools",
    priority: 3,
  },
  {
    channelId: "UCfzlCWGWYyIQ0aLC5w48gBQ",
    name: "sentdex",
    language: "en",
    category: "ai_tools",
    priority: 4,
  },
  {
    channelId: "UCRJFAp0rewx8kzdhEqDHIlA",
    name: "The AI Advantage",
    language: "en",
    category: "ai_tools",
    priority: 4,
  },
  {
    channelId: "UCgH2LE7_NUF3_2EbOh9Zf2w",
    name: "AI Joe",
    language: "en",
    category: "ai_tools",
    priority: 3,
  },
  // ═══════════════════════════════════════════════════════════════
  // TIER 5: AI BUSINESS & INDUSTRY — İş dünyası
  // ═══════════════════════════════════════════════════════════════
  {
    channelId: "UCrM7B7SL_g1edFOnmj-SDKg",
    name: "Bloomberg Technology",
    language: "en",
    category: "ai_business",
    priority: 3,
  },
  {
    channelId: "UCNhoDKhYa8eMf8kxd-lCM8A",
    name: "Scale AI",
    language: "en",
    category: "ai_business",
    priority: 3,
  },
  // ═══════════════════════════════════════════════════════════════
  // TIER 6: PODCASTS & INTERVIEWS — Podcast ve röportajlar
  // ═══════════════════════════════════════════════════════════════
  {
    channelId: "UCXl4i9dYBrFOabk0xGmbkRA",
    name: "Dwarkesh Patel",
    language: "en",
    category: "ai_research",
    priority: 4,
  },
  {
    channelId: "UCuQH_mB7hj4WFyApoNP1Emw",
    name: "Eye on AI",
    language: "en",
    category: "ai_news",
    priority: 3,
  },
  {
    channelId: "UCLVskcKYZnTMyDguqEx6MNg",
    name: "TWIML AI Podcast",
    language: "en",
    category: "ai_research",
    priority: 3,
  },
  // ═══════════════════════════════════════════════════════════════
  // TIER 7: TURKISH AI — Türkçe AI kanalları (disabled — 404 errors)
  // ═══════════════════════════════════════════════════════════════
];

// ============================================================================
// AI RELEVANCE FILTERING
// ============================================================================

const AI_VIDEO_KEYWORDS = [
  "artificial intelligence",
  "yapay zeka",
  " ai ",
  "a.i.",
  "machine learning",
  "deep learning",
  "neural network",
  "gpt",
  "chatgpt",
  "openai",
  "claude",
  "anthropic",
  "gemini ai",
  "gemini pro",
  "llama",
  "mistral",
  "deepseek",
  "copilot ai",
  "dall-e",
  "midjourney",
  "stable diffusion",
  "sora",
  "perplexity",
  "cursor ai",
  "devin ai",
  "llm",
  "large language model",
  "transformer",
  "language model",
  "generative ai",
  "gen ai",
  "fine-tuning",
  "prompt engineering",
  "rag",
  "retrieval augmented",
  "embedding",
  "multimodal",
  "text-to-image",
  "text-to-video",
  "nvidia ai",
  "hugging face",
  "stability ai",
  "google ai",
  "microsoft ai",
  "meta ai",
  "ai agent",
  "ai assistant",
  "chatbot",
  "ai coding",
  "code generation",
  "image generation",
  "voice ai",
  "ai safety",
  "ai alignment",
  "ai ethics",
  "ai regulation",
  "agi",
  "superintelligence",
  "ai news",
  "ai update",
  "ai breakthrough",
];

const NON_AI_VIDEO_PATTERNS: RegExp[] = [
  /\b(unboxing|kutu açılım)\b/i,
  /\b(giveaway|çekiliş)\b/i,
  /\b(vlog|daily|günlük)\b/i,
  /\b(gaming|oyun|gameplay)\b/i,
  /\b(reaction|tepki)\b/i,
  /\b(mukbang|asmr)\b/i,
];

function isAIRelatedVideo(title: string, description: string): boolean {
  const text = ` ${title} ${description} `.toLowerCase();
  const hasAIKeyword = AI_VIDEO_KEYWORDS.some((kw) =>
    text.includes(kw.toLowerCase()),
  );
  if (!hasAIKeyword) return false;
  const isNonAI = NON_AI_VIDEO_PATTERNS.some((p) => p.test(text));
  return !isNonAI;
}

// ============================================================================
// YOUTUBE RSS FETCHING
// ============================================================================

/**
 * YouTube channel RSS URL (no API key needed)
 */
function getYouTubeRSSUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

/**
 * Fetch videos from a single YouTube channel via RSS
 */
export async function fetchChannelVideos(
  channelId: string,
  channelName: string,
  maxVideos: number = 10,
): Promise<YouTubeVideo[]> {
  try {
    const url = getYouTubeRSSUrl(channelId);
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const parsed = await parseStringPromise(response.data, {
      trim: true,
      normalize: true,
      explicitArray: false,
    });

    const entries = parsed?.feed?.entry;
    if (!entries) return [];

    const items = Array.isArray(entries) ? entries : [entries];

    return items.slice(0, maxVideos).map((entry: any) => {
      const videoId = entry["yt:videoId"] || "";
      return {
        title: entry.title || "",
        description: entry["media:group"]?.["media:description"] || "",
        videoId,
        channelName,
        channelId,
        publishedAt: entry.published || "",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl:
          entry["media:group"]?.["media:thumbnail"]?.$?.url || undefined,
      };
    });
  } catch (error: any) {
    console.error(`❌ YouTube RSS hatası (${channelName}): ${error.message}`);
    return [];
  }
}

// ============================================================================
// MAIN MONITOR FUNCTIONS
// ============================================================================

/**
 * Seed/upsert default channels into DB
 * Creates new channels and updates existing ones from DEFAULT_YOUTUBE_CHANNELS
 */
export async function seedDefaultChannels(): Promise<number> {
  let upserted = 0;
  for (const ch of DEFAULT_YOUTUBE_CHANNELS) {
    try {
      await (db as any).youTubeChannel.upsert({
        where: { channelId: ch.channelId },
        update: {
          name: ch.name,
          language: ch.language,
          category: ch.category,
          priority: ch.priority,
        },
        create: {
          channelId: ch.channelId,
          name: ch.name,
          language: ch.language,
          category: ch.category,
          priority: ch.priority,
          isActive: true,
        },
      });
      upserted++;
    } catch {
      // Skip errors
    }
  }
  console.log(`🎬 ${upserted} YouTube kanalı upsert edildi`);
  return upserted;
}

/**
 * Fetch all active channels from DB and scan for new AI videos
 * Returns discovered AI topics ready for deep research
 */
export async function scanAllChannels(
  hoursAgo: number = 24,
): Promise<YouTubeDiscoveredTopic[]> {
  // Seed defaults if needed
  await seedDefaultChannels();

  const channels = await (db as any).youTubeChannel.findMany({
    where: { isActive: true },
    orderBy: { priority: "desc" },
  });

  console.log(`🎬 ${channels.length} YouTube kanalı taranıyor...`);

  const allTopics: YouTubeDiscoveredTopic[] = [];
  const cutoffTime = Date.now() - hoursAgo * 60 * 60 * 1000;

  for (const channel of channels) {
    try {
      const videos = await fetchChannelVideos(channel.channelId, channel.name);

      // Filter: recent + AI-related
      const aiVideos = videos.filter((v) => {
        const videoTime = new Date(v.publishedAt).getTime();
        if (videoTime < cutoffTime) return false;
        return isAIRelatedVideo(v.title, v.description);
      });

      for (const video of aiVideos) {
        const keywords = extractKeywordsFromVideo(
          video.title,
          video.description,
        );
        allTopics.push({
          topic: cleanVideoTitle(video.title),
          originalTitle: video.title,
          description: video.description.substring(0, 500),
          source: `YouTube: ${video.channelName}`,
          sourceUrl: video.url,
          publishedAt: video.publishedAt,
          confidence: calculateAIConfidence(video.title, video.description),
          keywords,
        });
      }

      // Update channel stats
      const latestVideoId = videos[0]?.videoId;
      await (db as any).youTubeChannel
        .update({
          where: { id: channel.id },
          data: {
            lastFetchedAt: new Date(),
            lastVideoId: latestVideoId || channel.lastVideoId,
            totalVideos: { increment: aiVideos.length },
            failureCount: 0,
          },
        })
        .catch(() => {});

      console.log(
        `  ✅ ${channel.name}: ${aiVideos.length}/${videos.length} AI video`,
      );
    } catch (error: any) {
      console.error(`  ❌ ${channel.name}: ${error.message}`);
      await (db as any).youTubeChannel
        .update({
          where: { id: channel.id },
          data: { failureCount: { increment: 1 } },
        })
        .catch(() => {});
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  // Sort by confidence, deduplicate by similar titles
  const uniqueTopics = deduplicateTopics(allTopics);
  console.log(`🎬 Toplam ${uniqueTopics.length} benzersiz AI konusu bulundu`);
  return uniqueTopics;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Clean video title for use as a news topic
 */
function cleanVideoTitle(title: string): string {
  return title
    .replace(/\[.*?\]/g, "") // Remove [brackets]
    .replace(/\(.*?\)/g, "") // Remove (parens)
    .replace(/\|.*$/g, "") // Remove everything after |
    .replace(/#\w+/g, "") // Remove hashtags
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

/**
 * Extract search keywords from video title and description
 */
function extractKeywordsFromVideo(
  title: string,
  description: string,
): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const keywords: string[] = [];

  const importantTerms = [
    "openai",
    "chatgpt",
    "gpt-5",
    "gpt-4",
    "gpt-4o",
    "claude",
    "anthropic",
    "gemini",
    "google ai",
    "deepseek",
    "llama",
    "mistral",
    "meta ai",
    "nvidia",
    "hugging face",
    "midjourney",
    "dall-e",
    "stable diffusion",
    "sora",
    "perplexity",
    "cursor",
    "copilot",
    "devin",
    "agi",
    "ai safety",
    "ai regulation",
    "ai agent",
    "multimodal",
    "text-to-video",
    "text-to-image",
    "voice ai",
    "robotics",
  ];

  for (const term of importantTerms) {
    if (text.includes(term)) {
      keywords.push(term);
    }
  }

  return [...new Set(keywords)].slice(0, 10);
}

/**
 * Calculate AI relevance confidence score (0-100)
 */
function calculateAIConfidence(title: string, description: string): number {
  const text = ` ${title} ${description} `.toLowerCase();
  let score = 0;

  const highWeight = [
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "large language model",
    "generative ai",
    "neural network",
    "yapay zeka",
  ];
  const medWeight = [
    "openai",
    "chatgpt",
    "anthropic",
    "claude",
    "gpt-4",
    "gpt-5",
    "deepmind",
    "hugging face",
    "midjourney",
    "dall-e",
    "deepseek",
    "mistral",
  ];
  const lowWeight = [
    "ai",
    "llm",
    "transformer",
    "chatbot",
    "prompt",
    "embedding",
    "fine-tuning",
  ];

  for (const kw of highWeight) {
    if (text.includes(kw)) score += 20;
  }
  for (const kw of medWeight) {
    if (text.includes(kw)) score += 12;
  }
  for (const kw of lowWeight) {
    if (text.includes(kw)) score += 5;
  }

  // Title bonus
  const titleLower = title.toLowerCase();
  if (highWeight.some((kw) => titleLower.includes(kw))) score += 15;

  return Math.min(100, score);
}

/**
 * Deduplicate topics by similar titles (Jaccard similarity)
 */
function deduplicateTopics(
  topics: YouTubeDiscoveredTopic[],
): YouTubeDiscoveredTopic[] {
  const unique: YouTubeDiscoveredTopic[] = [];

  for (const topic of topics.sort((a, b) => b.confidence - a.confidence)) {
    const isDuplicate = unique.some((existing) => {
      const words1 = new Set(
        existing.topic
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3),
      );
      const words2 = new Set(
        topic.topic
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3),
      );
      if (words1.size === 0 || words2.size === 0) return false;
      const intersection = [...words1].filter((w) => words2.has(w)).length;
      const union = new Set([...words1, ...words2]).size;
      return intersection / union > 0.6;
    });

    if (!isDuplicate) {
      unique.push(topic);
    }
  }

  return unique;
}

/**
 * Get channel stats for admin panel
 */
export async function getChannelStats() {
  const channels = await (db as any).youTubeChannel.findMany({
    orderBy: [{ priority: "desc" }, { name: "asc" }],
  });

  const active = channels.filter((c: any) => c.isActive);
  const byCategory = channels.reduce(
    (acc: Record<string, number>, c: any) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    total: channels.length,
    active: active.length,
    inactive: channels.length - active.length,
    byCategory,
    channels,
  };
}
