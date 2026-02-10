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

const liveLog = createModuleLogger("youtube");

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

  for (const topic of topics) {
    if (uniqueTopics.length >= maxTopics) break;

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

  console.log(
    `🎬 ${uniqueTopics.length} benzersiz YouTube konusu pipeline'a hazır`,
  );
  await liveLog.success(
    `🎬 ${uniqueTopics.length} benzersiz YouTube konusu bulundu`,
  );

  return uniqueTopics;
}
