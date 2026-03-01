/**
 * YouTube → News Pipeline Integration
 *
 * Converts YouTube discovered topics into articles
 * that can be fed into the existing multi-agent pipeline.
 *
 * FLOW:
 * YouTube Scan → Discovered Topics → gatherSources (Brave) → synthesizeContent → Publish
 */

import {
  scanAllChannels,
  type YouTubeDiscoveredTopic,
} from "./youtube-monitor";
import { isArticleDuplicate } from "@/services/intelligent-news.service";
import type { NewsArticle } from "@/services/news.service";
import { createModuleLogger } from "@/lib/agent-log-stream";
import { getRedis } from "@/lib/redis";

const liveLog = createModuleLogger("youtube");

// ─── P0-3: YouTube Redis Blacklist ───
const YT_BLACKLIST_PREFIX = "youtube:blacklist:";
const YT_BLACKLIST_TTL_SECONDS = 48 * 60 * 60; // 48 hours
const YT_FAIL_PREFIX = "youtube:fail:";
const YT_FAIL_THRESHOLD = 2; // Blacklist after 2 relevance failures

/**
 * Check if a YouTube video is blacklisted
 */
async function isBlacklisted(videoUrl: string): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return false;
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return false;
    const result = await redis.get(`${YT_BLACKLIST_PREFIX}${videoId}`);
    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Record a relevance failure for a YouTube video.
 * If failures >= threshold, auto-blacklist for 48h.
 */
export async function recordYouTubeFailure(videoUrl: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return;

    const failKey = `${YT_FAIL_PREFIX}${videoId}`;
    const count = await redis.incr(failKey);
    await redis.expire(failKey, YT_BLACKLIST_TTL_SECONDS);

    if (count >= YT_FAIL_THRESHOLD) {
      await redis.set(
        `${YT_BLACKLIST_PREFIX}${videoId}`,
        "1",
        "EX",
        YT_BLACKLIST_TTL_SECONDS,
      );
      console.log(
        `🚫 YouTube blacklisted: ${videoId} (${count} failures, 48h TTL)`,
      );
    }
  } catch {
    // Silent — don't break pipeline for blacklist errors
  }
}

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url: string): string | null {
  try {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Convert YouTube discovered topics to NewsArticle format
 * compatible with the existing pipeline
 */
function topicToNewsArticle(topic: YouTubeDiscoveredTopic): NewsArticle {
  return {
    title: topic.topic,
    description: topic.description,
    url: topic.sourceUrl,
    publishedDate: topic.publishedAt,
    source: topic.source,
    topic: topic.topic,
  };
}

/**
 * Run YouTube scan and feed unique topics into the news pipeline.
 *
 * 1. Scan all active YouTube channels
 * 2. Filter for AI-relevant videos
 * 3. Check duplicates against existing articles
 * 4. Return unique topics as NewsArticle[] for pipeline consumption
 */
export async function discoverYouTubeTopics(
  hoursAgo: number = 72,
  maxTopics: number = 15,
): Promise<NewsArticle[]> {
  console.log(`🎬 YouTube konu keşfi başlatılıyor (son ${hoursAgo} saat)...`);
  await liveLog.info(`🎬 YouTube kanalları taranıyor...`);

  const topics = await scanAllChannels(hoursAgo);
  console.log(
    `🎬 ${topics.length} AI konusu bulundu, duplicate kontrolü yapılıyor...`,
  );

  const uniqueTopics: NewsArticle[] = [];

  let blacklistedCount = 0;

  for (const topic of topics) {
    if (uniqueTopics.length >= maxTopics) break;

    // P0-3: Check Redis blacklist BEFORE expensive duplicate check
    const blacklisted = await isBlacklisted(topic.sourceUrl);
    if (blacklisted) {
      blacklistedCount++;
      console.log(
        `  🚫 YouTube blacklisted (skip): ${topic.topic.substring(0, 50)}...`,
      );
      continue;
    }

    const article = topicToNewsArticle(topic);

    // Check if this topic already exists as a published article
    const dupCheck = await isArticleDuplicate(article);
    if (dupCheck.isDuplicate) {
      console.log(
        `  ⏭️ YouTube duplicate: ${topic.topic.substring(0, 50)}... (${dupCheck.reason})`,
      );
      continue;
    }

    uniqueTopics.push(article);
    console.log(
      `  ✅ Unique YouTube topic: ${topic.topic.substring(0, 50)}...`,
    );
  }

  if (blacklistedCount > 0) {
    console.log(
      `  🚫 ${blacklistedCount} YouTube video blacklist nedeniyle atlandı`,
    );
  }

  console.log(
    `🎬 ${uniqueTopics.length} benzersiz YouTube konusu pipeline'a hazır`,
  );
  await liveLog.success(
    `🎬 ${uniqueTopics.length} benzersiz YouTube konusu bulundu`,
  );

  return uniqueTopics;
}
