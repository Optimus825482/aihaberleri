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
const AGENT_RECOVERY_TIMEOUT = 3 * 60 * 1000; // 3 minutes (was 5min — shorter recovery for faster pipeline)
const MAX_CONSECUTIVE_FAILURES = 5; // 5 failures before recovery mode (was 3 — too sensitive, caused cycling)

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
): Promise<{ jobId: string }> {
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

  return { jobId: job.id! };
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
  initialJobId?: string,
): Promise<{
  success: boolean;
  articlesPublished: number;
  errors: string[];
}> {
  const startTime = Date.now();
  const errors: string[] = [];

  logger.info(
    `Waiting for pipeline completion (timeout: ${timeoutMs / 1000}s${initialJobId ? `, tracking job ${initialJobId}` : ""})`,
  );

  // RELIABLE DETECTION: Track the initial job directly via BullMQ
  // This eliminates all race conditions with global counter baselines
  let initialJobCompleted = false;
  if (initialJobId) {
    const duplicateQueue = getQueue(QUEUE_NAMES.UNIQUE_ARTICLES);
    if (duplicateQueue) {
      const jobPollStart = Date.now();
      while (Date.now() - jobPollStart < 120_000) {
        const job = await duplicateQueue.getJob(initialJobId);
        if (!job) {
          // Job removed by removeOnComplete — it completed
          initialJobCompleted = true;
          logger.info(
            `Initial job ${initialJobId} completed (removed from queue)`,
          );
          break;
        }
        const state = await job.getState();
        if (state === "completed") {
          initialJobCompleted = true;
          logger.info(`Initial job ${initialJobId} completed`);
          break;
        }
        if (state === "failed") {
          initialJobCompleted = true;
          logger.warn(`Initial job ${initialJobId} failed`);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  } else {
    // Fallback: no job ID — wait for agents to pick up jobs
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Brief wait for downstream queues to receive forwarded articles
  await new Promise((resolve) => setTimeout(resolve, 3000));

  let consecutiveEmptyChecks = 0;
  const REQUIRED_EMPTY_CHECKS = 3;
  let hasSeenArticlesInQueue = initialJobCompleted;
  let checkCount = 0;

  while (Date.now() - startTime < timeoutMs) {
    checkCount++;
    const progress = await monitorPipelineProgress(agentLogId);

    if (progress.articlesInQueue > 0 || progress.completed > 0) {
      hasSeenArticlesInQueue = true;
    }

    if (progress.articlesInQueue > 0 || checkCount <= 2) {
      logger.debug(
        `Check #${checkCount}: ${progress.stage} — ${progress.articlesInQueue} queued, ${progress.completed} done, ${progress.failed} failed`,
      );
    }

    if (progress.articlesInQueue === 0 && progress.stage === "unknown") {
      if (!hasSeenArticlesInQueue) {
        if (consecutiveEmptyChecks < 12) {
          logger.warn(
            `⚠️ Queue appears empty but never saw articles - waiting for agents to start (${consecutiveEmptyChecks + 1}/12)`,
          );
          consecutiveEmptyChecks++;
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        } else {
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

        const { db } = await import("@/lib/db");
        const publishedCount = await db.article.count({
          where: { agentLogId, status: "PUBLISHED" },
        });

        const draftCount = await db.article.count({
          where: { agentLogId, status: "DRAFT" },
        });

        if (publishedCount === 0 && draftCount > 0) {
          errors.push(`${draftCount} article(s) stuck in DRAFT state`);
        }

        const pipelineRan =
          publishedCount > 0 || draftCount > 0 || hasSeenArticlesInQueue;

        return {
          success: pipelineRan,
          articlesPublished: publishedCount,
          errors,
        };
      }
    } else {
      consecutiveEmptyChecks = 0;
    }

    if (progress.articlesInQueue > 0) {
      logger.info(
        `📊 Pipeline progress: ${progress.stage} (${progress.articlesInQueue} in queue, ${progress.completed} completed, ${progress.failed} failed)`,
      );
    }

    if (
      progress.failed > 0 &&
      !errors.some((e) => e.includes("articles failed"))
    ) {
      errors.push(`${progress.failed} articles failed in pipeline`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

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
