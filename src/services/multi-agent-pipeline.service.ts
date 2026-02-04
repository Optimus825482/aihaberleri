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
    removeOnComplete: 100, // Keep last 100 for debugging
    removeOnFail: 50,
    attempts: 3,
    priority: 1,
  });

  // Wait a moment for job to be picked up
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Verify job was added
  const waitingCount = await relevanceQueue.getWaitingCount();
  const activeCount = await relevanceQueue.getActiveCount();
  const completedCount = await relevanceQueue.getCompletedCount();
  const failedCount = await relevanceQueue.getFailedCount();

  logger.info(
    `📊 Queue status: waiting=${waitingCount}, active=${activeCount}, completed=${completedCount}, failed=${failedCount}`,
  );

  if (activeCount > 0) {
    logger.success(`✅ Job is being processed by an agent!`);
  } else if (waitingCount > 0) {
    logger.warn(`⚠️ Job is waiting but no agent is processing - agents may not have started`);
  } else if (completedCount > 0) {
    logger.info(`✅ Job was already completed by an agent`);
  } else {
    logger.error(`❌ CRITICAL: Job was added but queue appears empty!`);
    logger.error(`   This usually means the agent workers are not running.`);
    logger.error(`   Check if initializeMultiAgentPipeline() succeeded.`);
  }

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

  // CRITICAL: Wait longer for agents to pick up jobs before first check
  // This prevents false "completed" detection when queues haven't been processed yet
  await new Promise((resolve) => setTimeout(resolve, 5000));

  let consecutiveEmptyChecks = 0;
  const REQUIRED_EMPTY_CHECKS = 5; // Require 5 consecutive empty checks to confirm completion
  let hasSeenArticlesInQueue = false; // Track if we've ever seen articles in queue

  while (Date.now() - startTime < timeoutMs) {
    const progress = await monitorPipelineProgress(agentLogId);

    // Track if we've seen any articles in queue
    if (progress.articlesInQueue > 0 || progress.completed > 0) {
      hasSeenArticlesInQueue = true;
    }

    // Log detailed progress
    logger.info(
      `📊 Queue status: stage=${progress.stage}, inQueue=${progress.articlesInQueue}, completed=${progress.completed}, failed=${progress.failed}, hasSeenArticles=${hasSeenArticlesInQueue}`,
    );

    // Check if all queues are empty (pipeline completed)
    // Require multiple consecutive empty checks to avoid race conditions
    if (progress.articlesInQueue === 0 && progress.stage === "unknown") {
      // If we've never seen articles in queue, agents might not be running
      // Wait longer before declaring completion
      if (!hasSeenArticlesInQueue) {
        if (consecutiveEmptyChecks < 12) {
          // Wait up to 60 seconds (12 * 5s) for agents to start
          logger.warn(
            `⚠️ Queue appears empty but never saw articles - waiting for agents to start (${consecutiveEmptyChecks + 1}/12)`,
          );
          consecutiveEmptyChecks++;
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        } else {
          // After 60 seconds, assume agents are not running
          logger.error(
            `❌ CRITICAL: Agents never started processing. Pipeline cannot complete.`,
          );
          logger.error(
            `   Check worker logs for "Multi-agent pipeline ready" message.`,
          );
          return {
            success: false,
            articlesPublished: 0,
            errors: [
              "Agents never started processing - check worker initialization",
            ],
          };
        }
      }

      consecutiveEmptyChecks++;

      if (consecutiveEmptyChecks >= REQUIRED_EMPTY_CHECKS) {
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
    } else {
      consecutiveEmptyChecks = 0; // Reset counter if queue has items
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
