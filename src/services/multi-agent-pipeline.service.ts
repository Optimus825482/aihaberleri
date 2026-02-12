/**
 * Multi-Agent Pipeline Service
 *
 * Pipeline: Duplicate → Relevance → Trend → Enrich → Visual → Publish
 * Each agent is autonomous and communicates via BullMQ queues.
 */

import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";
import { createModuleLogger } from "@/lib/agent-log-stream";
import type { ArticleWithTopic } from "./topic-extraction.service";
import { getRedis } from "@/lib/redis";

const logger = createModuleLogger("multi-agent-pipeline");

// ============================================================================
// AGENT RECOVERY MECHANISM (FAZ 3)
// ============================================================================

export interface AgentHealthStatus {
  agentName: string;
  isHealthy: boolean;
  lastSeen: Date;
  consecutiveFailures: number;
  inRecoveryMode: boolean;
}

const AGENT_HEALTH_STORE_KEY = "agent:health:status";
const AGENT_RECOVERY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Update agent health status in Redis
 */
export async function updateAgentHealth(
  agentName: string,
  isHealthy: boolean,
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;

    const key = `${AGENT_HEALTH_STORE_KEY}:${agentName}`;
    const existing = await redis.get(key);

    let consecutiveFailures = 0;
    let inRecoveryMode = false;

    if (existing) {
      const status = JSON.parse(existing) as AgentHealthStatus;
      consecutiveFailures = isHealthy ? 0 : status.consecutiveFailures + 1;

      // Enter recovery mode after 3 consecutive failures
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        inRecoveryMode = true;
        logger.warn(
          `🔄 Agent ${agentName} entered RECOVERY MODE (${consecutiveFailures} consecutive failures)`,
        );
      }
    } else if (!isHealthy) {
      consecutiveFailures = 1;
    }

    const healthStatus: AgentHealthStatus = {
      agentName,
      isHealthy,
      lastSeen: new Date(),
      consecutiveFailures,
      inRecoveryMode,
    };

    await redis.set(key, JSON.stringify(healthStatus), "EX", 3600); // 1 hour TTL
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to update agent health for ${agentName}: ${errorMsg}`);
  }
}

/**
 * Check if agent is in recovery mode
 */
export async function isAgentInRecoveryMode(
  agentName: string,
): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return false;

    const key = `${AGENT_HEALTH_STORE_KEY}:${agentName}`;
    const existing = await redis.get(key);

    if (!existing) return false;

    const status = JSON.parse(existing) as AgentHealthStatus;
    return status.inRecoveryMode;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to check recovery mode for ${agentName}: ${errorMsg}`);
    return false;
  }
}

/**
 * Get all agent health statuses
 */
export async function getAllAgentHealthStatuses(): Promise<
  AgentHealthStatus[]
> {
  try {
    const redis = getRedis();
    if (!redis) return [];

    const keys = await redis.keys(`${AGENT_HEALTH_STORE_KEY}:*`);
    const statuses: AgentHealthStatus[] = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        statuses.push(JSON.parse(data) as AgentHealthStatus);
      }
    }

    return statuses;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get agent health statuses: ${errorMsg}`);
    return [];
  }
}

/**
 * Exit recovery mode for an agent (call when agent succeeds)
 */
export async function exitRecoveryMode(agentName: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;

    const key = `${AGENT_HEALTH_STORE_KEY}:${agentName}`;
    const existing = await redis.get(key);

    if (existing) {
      const status = JSON.parse(existing) as AgentHealthStatus;
      status.consecutiveFailures = 0;
      status.inRecoveryMode = false;
      status.isHealthy = true;
      status.lastSeen = new Date();

      await redis.set(key, JSON.stringify(status), "EX", 3600);
      logger.success(`✅ Agent ${agentName} exited RECOVERY MODE`);
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to exit recovery mode for ${agentName}: ${errorMsg}`);
  }
}

// ============================================================================
// END AGENT RECOVERY MECHANISM
// ============================================================================

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
    `Pipeline starting: ${articles.length} articles → duplicate-detector`,
  );

  const collectedArticles = articles.map((article) => ({
    title: article.title,
    description: article.description || "",
    url: article.url,
    publishedAt: article.publishedAt,
    source: article.source || "RSS",
    topic: article.topic,
    trendScore: article.trendScore,
    suggestedCategory: config.categorySlug || "yapay-zeka",
    agentLogId: config.agentLogId,
  }));

  const duplicateQueue = getQueue(QUEUE_NAMES.UNIQUE_ARTICLES);
  if (!duplicateQueue) {
    throw new Error("Duplicate detector queue not available");
  }

  const job = await duplicateQueue.add("filter-duplicates", collectedArticles, {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    priority: 1,
  });

  logger.success(
    `Job ${job.id} added — ${collectedArticles.length} articles queued`,
  );

  // Brief queue status check
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const activeCount = await duplicateQueue.getActiveCount();
  const waitingCount = await duplicateQueue.getWaitingCount();

  if (activeCount > 0) {
    logger.info("Job is being processed");
  } else if (waitingCount > 0) {
    logger.warn("Job waiting — agents may not have started");
  }
}

/**
 * Monitor pipeline progress
 *
 * Pipeline: Duplicate → Relevance → Trend → Enrich → Visual → Publish
 */
export async function monitorPipelineProgress(agentLogId: string): Promise<{
  stage: string;
  articlesInQueue: number;
  completed: number;
  failed: number;
  firstQueueCompleted: number;
}> {
  // Monitor all active pipeline queues (SEO removed from pipeline)
  const queues = [
    QUEUE_NAMES.UNIQUE_ARTICLES,
    QUEUE_NAMES.RELEVANT_ARTICLES,
    QUEUE_NAMES.TREND_ENRICHMENT,
    QUEUE_NAMES.ENRICHED_ARTICLES,
    QUEUE_NAMES.ARTICLES_WITH_VISUALS,
    QUEUE_NAMES.DATABASE_PUBLISHER,
  ];

  let currentStage = "unknown";
  let articlesInQueue = 0;
  let completed = 0;
  let failed = 0;
  let firstQueueCompleted = 0;

  for (let i = 0; i < queues.length; i++) {
    const queueName = queues[i];
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

    // Track first queue (duplicate-detector) completed count separately
    if (i === 0) {
      firstQueueCompleted = completedCount;
    }
  }

  return {
    stage: currentStage,
    articlesInQueue,
    completed,
    failed,
    firstQueueCompleted,
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
    `Waiting for pipeline completion (timeout: ${timeoutMs / 1000}s)`,
  );

  // CRITICAL: Wait longer for agents to pick up jobs before first check
  // This prevents false "completed" detection when queues haven't been processed yet
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Capture baseline failed count — old pipeline failures should not affect this run
  const baselineProgress = await monitorPipelineProgress(agentLogId);
  const baselineFailedCount = baselineProgress.failed;
  const baselineFirstQueueCompleted = baselineProgress.firstQueueCompleted;

  let consecutiveEmptyChecks = 0;
  const REQUIRED_EMPTY_CHECKS = 3;
  let hasSeenArticlesInQueue = false;
  let checkCount = 0;

  while (Date.now() - startTime < timeoutMs) {
    checkCount++;
    const progress = await monitorPipelineProgress(agentLogId);
    const newFailures = progress.failed - baselineFailedCount;
    const firstQueueProcessed =
      progress.firstQueueCompleted > baselineFirstQueueCompleted;

    // Track if we've seen any articles in queue OR if first queue processed new jobs
    if (
      progress.articlesInQueue > 0 ||
      progress.completed > baselineProgress.completed ||
      firstQueueProcessed
    ) {
      hasSeenArticlesInQueue = true;
    }

    // Log progress only when there's activity (avoid spam)
    if (progress.articlesInQueue > 0 || newFailures > 0 || checkCount <= 2) {
      logger.debug(
        `Check #${checkCount}: ${progress.stage} — ${progress.articlesInQueue} queued, ${progress.completed} done, ${newFailures} new failures`,
      );
    }

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

        // Also check for DRAFT articles (enrichment may have partially succeeded)
        const draftCount = await db.article.count({
          where: {
            agentLogId,
            status: "DRAFT",
          },
        });

        if (publishedCount === 0 && draftCount > 0) {
          errors.push(`${draftCount} article(s) stuck in DRAFT state`);
        }

        // Pipeline completed successfully if:
        // 1. Articles were published, OR
        // 2. Articles are in draft state, OR
        // 3. New completions were recorded, OR
        // 4. Articles were seen in queue (processed but filtered out as duplicate/irrelevant)
        const pipelineRan =
          publishedCount > 0 ||
          draftCount > 0 ||
          progress.completed > baselineProgress.completed ||
          hasSeenArticlesInQueue;

        return {
          success: pipelineRan,
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

    // Check for failures (only new ones from this pipeline run)
    if (newFailures > 0 && !errors.some((e) => e.includes("articles failed"))) {
      errors.push(`${newFailures} articles failed in pipeline`);
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
