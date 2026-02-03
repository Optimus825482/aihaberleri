/**
 * Multi-Agent Pipeline Service
 *
 * MODERN ARCHITECTURE:
 * ContentCollector → RelevanceFilter → DuplicateDetector → ContentEnricher → VisualGenerator → Publisher
 *
 * Each agent is autonomous and communicates via BullMQ queues.
 * This replaces the monolithic processAndPublishArticles approach.
 */

import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";
import { createModuleLogger } from "@/lib/agent-log-stream";
import type { ArticleWithTopic } from "./topic-extraction.service";

const logger = createModuleLogger("multi-agent-pipeline");

export interface PipelineConfig {
  agentLogId: string;
  categorySlug?: string;
  targetCount: number;
}

/**
 * Start multi-agent pipeline with filtered articles
 */
export async function startMultiAgentPipeline(
  articles: ArticleWithTopic[],
  config: PipelineConfig,
): Promise<void> {
  logger.info(
    `🚀 Starting multi-agent pipeline with ${articles.length} articles`,
  );

  // Transform to format expected by ContentCollectorAgent
  const collectedArticles = articles.map((article) => ({
    title: article.title,
    description: article.description || "",
    url: article.url,
    publishedAt: article.publishedAt,
    source: article.source || "RSS",
    topic: article.topic,
    trendScore: article.trendScore,
    suggestedCategory: config.categorySlug || "teknoloji",
    agentLogId: config.agentLogId, // Pass agentLogId through pipeline
  }));

  // Add to relevance filter queue (skip content collector since we already have articles)
  const relevanceQueue = getQueue(QUEUE_NAMES.RELEVANT_ARTICLES);

  if (!relevanceQueue) {
    throw new Error("Relevance filter queue not available");
  }

  await relevanceQueue.add("filter-relevance", collectedArticles, {
    removeOnComplete: true,
    attempts: 3,
    priority: 1,
  });

  logger.success(
    `✅ ${articles.length} articles added to multi-agent pipeline`,
  );

  console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃        🤖 MULTI-AGENT PIPELINE STARTED            ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Articles:     ${articles.length.toString().padEnd(35)}┃
┃  Target:       ${config.targetCount.toString().padEnd(35)}┃
┃  Agent Log:    ${config.agentLogId.substring(0, 12)}...${" ".repeat(20)}┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Pipeline Flow:                                   ┃
┃  1. ✅ Content Collected (RSS + Trend)            ┃
┃  2. 🔄 Relevance Filter (AI scoring)              ┃
┃  3. 🔄 Duplicate Detection (3-layer)              ┃
┃  4. 🔄 Content Enrichment (Brave + Jina)          ┃
┃  5. 🔄 Visual Generation (Pollinations)           ┃
┃  6. 🔄 Database Publishing                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  `);
}

/**
 * Monitor pipeline progress
 */
export async function monitorPipelineProgress(agentLogId: string): Promise<{
  stage: string;
  articlesInQueue: number;
  completed: number;
  failed: number;
}> {
  const queues = [
    QUEUE_NAMES.RELEVANT_ARTICLES,
    QUEUE_NAMES.UNIQUE_ARTICLES,
    QUEUE_NAMES.ENRICHED_ARTICLES,
    QUEUE_NAMES.ARTICLES_WITH_VISUALS,
  ];

  let currentStage = "unknown";
  let articlesInQueue = 0;
  let completed = 0;
  let failed = 0;

  for (const queueName of queues) {
    const queue = getQueue(queueName);
    if (!queue) continue;

    const [waiting, active, completedCount, failedCount] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    if (active > 0 || waiting > 0) {
      currentStage = queueName;
      articlesInQueue = waiting + active;
    }

    completed += completedCount;
    failed += failedCount;
  }

  return {
    stage: currentStage,
    articlesInQueue,
    completed,
    failed,
  };
}

/**
 * Wait for pipeline completion
 */
export async function waitForPipelineCompletion(
  agentLogId: string,
  timeoutMs: number = 20 * 60 * 1000, // 20 minutes
): Promise<{
  success: boolean;
  articlesPublished: number;
  errors: string[];
}> {
  const startTime = Date.now();
  const errors: string[] = [];

  logger.info(
    `⏳ Waiting for pipeline completion (timeout: ${timeoutMs / 1000}s)`,
  );

  while (Date.now() - startTime < timeoutMs) {
    const progress = await monitorPipelineProgress(agentLogId);

    // Check if all queues are empty (pipeline completed)
    if (progress.articlesInQueue === 0 && progress.stage === "unknown") {
      logger.success(
        `✅ Pipeline completed: ${progress.completed} articles processed`,
      );

      // Get published articles count from database
      const { db } = await import("@/lib/db");
      const publishedCount = await db.article.count({
        where: {
          agentLogId,
          status: "PUBLISHED",
        },
      });

      return {
        success: true,
        articlesPublished: publishedCount,
        errors,
      };
    }

    // Log progress
    if (progress.articlesInQueue > 0) {
      logger.info(
        `📊 Pipeline progress: ${progress.stage} (${progress.articlesInQueue} in queue, ${progress.completed} completed, ${progress.failed} failed)`,
      );
    }

    // Check for failures
    if (progress.failed > 0) {
      errors.push(`${progress.failed} articles failed in pipeline`);
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5 seconds
  }

  // Timeout
  logger.error(`❌ Pipeline timeout after ${timeoutMs / 1000}s`);
  return {
    success: false,
    articlesPublished: 0,
    errors: [...errors, "Pipeline timeout"],
  };
}

export default {
  startMultiAgentPipeline,
  monitorPipelineProgress,
  waitForPipelineCompletion,
};
