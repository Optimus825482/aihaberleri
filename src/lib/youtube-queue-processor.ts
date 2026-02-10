/**
 * YouTube Queue Processor
 *
 * Processes queued YouTube topics one by one at specified intervals.
 * Integrates with the existing multi-agent pipeline for article creation.
 *
 * FLOW:
 * 1. Check Redis for pending YouTube topics
 * 2. Pick the next pending topic
 * 3. Feed it into the multi-agent pipeline (via executeNewsAgent-like flow)
 * 4. Update queue status
 * 5. Schedule next processing after intervalMinutes
 */

import { getRedis } from "@/lib/redis";
import { createModuleLogger } from "@/lib/agent-log-stream";

const logger = createModuleLogger("youtube-queue");

const YOUTUBE_QUEUE_KEY = "youtube:publish-queue";
const YOUTUBE_QUEUE_STATUS_KEY = "youtube:publish-status";

interface YouTubeQueueItem {
  topic: string;
  description: string;
  source: string;
  sourceUrl: string;
  keywords: string[];
  confidence: number;
  queuedAt: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

interface YouTubeQueueStatus {
  isActive: boolean;
  intervalMinutes: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  currentItem: string | null;
  startedAt: string | null;
  nextPublishAt: string | null;
}

let processorTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Process the next pending YouTube topic in the queue
 */
export async function processNextYouTubeTopic(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const [queueData, statusData] = await Promise.all([
      redis.get(YOUTUBE_QUEUE_KEY),
      redis.get(YOUTUBE_QUEUE_STATUS_KEY),
    ]);

    if (!queueData || !statusData) return false;

    const queue: YouTubeQueueItem[] = JSON.parse(queueData);
    const status: YouTubeQueueStatus = JSON.parse(statusData);

    if (!status.isActive) return false;

    // Find next pending topic
    const pendingIndex = queue.findIndex((item) => item.status === "pending");
    if (pendingIndex === -1) {
      // All done — deactivate queue
      status.isActive = false;
      status.currentItem = null;
      status.nextPublishAt = null;
      await redis.set(
        YOUTUBE_QUEUE_STATUS_KEY,
        JSON.stringify(status),
        "EX",
        86400,
      );
      logger.success("YouTube kuyruğu tamamlandı — tüm konular işlendi");
      return false;
    }

    const topic = queue[pendingIndex];

    // Mark as processing
    queue[pendingIndex].status = "processing";
    status.currentItem = topic.topic;
    await Promise.all([
      redis.set(YOUTUBE_QUEUE_KEY, JSON.stringify(queue), "EX", 86400),
      redis.set(YOUTUBE_QUEUE_STATUS_KEY, JSON.stringify(status), "EX", 86400),
    ]);

    logger.info(`YouTube konu işleniyor: ${topic.topic.substring(0, 60)}...`);

    try {
      // Feed topic into the pipeline via executeNewsAgent-like flow
      const { startMultiAgentPipeline, waitForPipelineCompletion } =
        await import("@/services/multi-agent-pipeline.service");
      const { db } = await import("@/lib/db");

      // Create agent log for this YouTube topic
      const agentLog = await db.agentLog.create({
        data: {
          status: "RUNNING",
          articlesCreated: 0,
          articlesScraped: 1,
          errors: [],
          metadata: { source: "youtube-queue", topic: topic.topic },
        },
      });

      // Create article input compatible with pipeline
      const articleInput = [
        {
          title: topic.topic,
          description: topic.description,
          url: topic.sourceUrl,
          publishedAt: topic.queuedAt,
          source: topic.source,
          topic: topic.topic,
          trendScore: topic.confidence,
        },
      ];

      await startMultiAgentPipeline(articleInput, {
        agentLogId: agentLog.id,
        targetCount: 1,
      });

      // Wait for pipeline completion (max 10 minutes per topic)
      const result = await waitForPipelineCompletion(
        agentLog.id,
        10 * 60 * 1000,
      );

      if (result.success && result.articlesPublished > 0) {
        queue[pendingIndex].status = "completed";
        status.completedItems++;
        logger.success(
          `YouTube konu yayınlandı: ${topic.topic.substring(0, 60)}...`,
        );

        await db.agentLog.update({
          where: { id: agentLog.id },
          data: {
            status: "SUCCESS",
            articlesCreated: result.articlesPublished,
            duration: Math.floor(
              (Date.now() - new Date(topic.queuedAt).getTime()) / 1000,
            ),
          },
        });
      } else {
        queue[pendingIndex].status = "failed";
        queue[pendingIndex].error =
          result.errors?.join(", ") || "Pipeline başarısız";
        status.failedItems++;
        logger.warn(
          `YouTube konu başarısız: ${topic.topic.substring(0, 60)}...`,
        );

        await db.agentLog.update({
          where: { id: agentLog.id },
          data: {
            status: "FAILED",
            errors: result.errors || ["Pipeline failed"],
          },
        });
      }
    } catch (error) {
      queue[pendingIndex].status = "failed";
      queue[pendingIndex].error =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      status.failedItems++;
      logger.error(
        `YouTube konu hatası: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Calculate next publish time
    const remainingPending = queue.filter(
      (item) => item.status === "pending",
    ).length;
    if (remainingPending > 0) {
      status.nextPublishAt = new Date(
        Date.now() + status.intervalMinutes * 60 * 1000,
      ).toISOString();
      status.currentItem = null;
    } else {
      status.isActive = false;
      status.currentItem = null;
      status.nextPublishAt = null;
    }

    // Save updated queue and status
    await Promise.all([
      redis.set(YOUTUBE_QUEUE_KEY, JSON.stringify(queue), "EX", 86400),
      redis.set(YOUTUBE_QUEUE_STATUS_KEY, JSON.stringify(status), "EX", 86400),
    ]);

    return remainingPending > 0;
  } catch (error) {
    logger.error(
      `YouTube kuyruk işleme hatası: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

/**
 * Start the YouTube queue processor loop
 * Called from cron.ts
 */
export async function checkAndProcessYouTubeQueue(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const statusData = await redis.get(YOUTUBE_QUEUE_STATUS_KEY);
    if (!statusData) return;

    const status: YouTubeQueueStatus = JSON.parse(statusData);
    if (!status.isActive || !status.nextPublishAt) return;

    const nextPublishTime = new Date(status.nextPublishAt).getTime();
    if (Date.now() < nextPublishTime) return; // Not time yet

    // Process next topic
    await processNextYouTubeTopic();
  } catch (error) {
    // Silent — cron will retry
  }
}

/**
 * Stop the processor timer
 */
export function stopYouTubeQueueProcessor(): void {
  if (processorTimer) {
    clearTimeout(processorTimer);
    processorTimer = null;
  }
}
