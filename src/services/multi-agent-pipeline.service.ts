/**
 * Multi-Agent Pipeline Service
 *
 * Pipeline: Duplicate → Relevance → Trend → Enrich → Visual → SEO → Publish
 * Each agent is autonomous and communicates via BullMQ queues.
 */

import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";
import { createModuleLogger } from "@/lib/agent-log-stream";
import type { ArticleWithTopic } from "./topic-extraction.service";
import { getRedis } from "@/lib/redis";

const logger = createModuleLogger("multi-agent-pipeline");

// ============================================================================
// PIPELINE STATE (Redis) — Dashboard widget'ı besler
// ============================================================================

const PIPELINE_STATE_KEY = "pipeline:current-state";
const PIPELINE_HISTORY_KEY = "pipeline:last-run";

interface PipelineStepState {
  id: string;
  name: string;
  displayName: string;
  status: "pending" | "running" | "completed" | "error" | "skipped";
  duration?: number;
  itemsProcessed?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface PipelineRedisState {
  isRunning: boolean;
  currentStep: number;
  steps: PipelineStepState[];
  startedAt?: string;
  completedAt?: string;
  articlesCreated: number;
  totalDuration?: number;
  runId?: string;
}

const PIPELINE_STEPS: Omit<PipelineStepState, "status">[] = [
  { id: "duplicate-detector", name: "duplicate-detector", displayName: "Duplikat Tespiti" },
  { id: "relevance-filter", name: "relevance-filter", displayName: "Alakalılık Filtresi" },
  { id: "trend-enrichment", name: "trend-enrichment", displayName: "Trend Zenginleştirme" },
  { id: "content-enricher", name: "content-enricher", displayName: "İçerik Zenginleştirme" },
  { id: "visual-generator", name: "visual-generator", displayName: "Görsel Oluşturma" },
  { id: "database-publisher", name: "database-publisher", displayName: "Yayınlama" },
];

const STEP_QUEUE_MAP: Record<string, string> = {
  "duplicate-detector": QUEUE_NAMES.UNIQUE_ARTICLES,
  "relevance-filter": QUEUE_NAMES.RELEVANT_ARTICLES,
  "trend-enrichment": QUEUE_NAMES.TREND_ENRICHMENT,
  "content-enricher": QUEUE_NAMES.ENRICHED_ARTICLES,
  "visual-generator": QUEUE_NAMES.ARTICLES_WITH_VISUALS,
  "database-publisher": QUEUE_NAMES.DATABASE_PUBLISHER,
};

/**
 * Write pipeline state to Redis — powers the admin dashboard widget
 */
async function writePipelineState(state: PipelineRedisState): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.set(PIPELINE_STATE_KEY, JSON.stringify(state), "EX", 3600);
  } catch (e) {
    logger.warn("Failed to write pipeline state to Redis");
  }
}

/**
 * Save pipeline run to history (shown when pipeline is idle)
 */
async function savePipelineHistory(state: PipelineRedisState): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.set(PIPELINE_HISTORY_KEY, JSON.stringify(state), "EX", 86400); // 24h
  } catch (e) {
    logger.warn("Failed to save pipeline history to Redis");
  }
}

/**
 * Build live step statuses from BullMQ queues and write to Redis
 */
async function syncPipelineStateFromQueues(
  runId: string,
  startedAt: string,
  articlesCreated: number,
): Promise<PipelineRedisState> {
  const stepStats = await Promise.all(
    PIPELINE_STEPS.map(async (step) => {
      const queueName = STEP_QUEUE_MAP[step.id];
      const queue = getQueue(queueName);
      if (!queue) return { step, active: 0, waiting: 0, completed: 0, failed: 0 };
      const [active, waiting, completed, failed] = await Promise.all([
        queue.getActiveCount(),
        queue.getWaitingCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      return { step, active, waiting, completed, failed };
    }),
  );

  const firstActiveIdx = stepStats.findIndex((s) => s.active > 0);
  const firstQueuedIdx = stepStats.findIndex((s) => s.waiting > 0);
  const currentStep = firstActiveIdx !== -1 ? firstActiveIdx : firstQueuedIdx;
  const hasWork = stepStats.some((s) => s.active > 0 || s.waiting > 0);

  const steps: PipelineStepState[] = stepStats.map(({ step, active, waiting, completed, failed }, idx) => {
    let status: PipelineStepState["status"] = "pending";
    if (active > 0) {
      status = "running";
    } else if (currentStep !== -1 && idx < currentStep) {
      status = "completed";
    } else if (waiting > 0) {
      status = "pending";
    } else if (hasWork && currentStep !== -1 && idx < currentStep) {
      status = "completed";
    }
    return { ...step, status, itemsProcessed: completed };
  });

  const state: PipelineRedisState = {
    isRunning: hasWork,
    currentStep,
    steps,
    startedAt,
    articlesCreated,
    runId,
  };

  await writePipelineState(state);
  return state;
}

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

    const keys: string[] = [];
    let cursor = "0";
    do {
      const [nextCursor, scannedKeys] = await redis.scan(
        cursor,
        "MATCH",
        `${AGENT_HEALTH_STORE_KEY}:*`,
        "COUNT",
        200,
      );
      cursor = nextCursor;
      if (scannedKeys.length > 0) {
        keys.push(...scannedKeys);
      }
    } while (cursor !== "0");

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

      // Only log if agent was actually in recovery mode
      const wasInRecovery = status.inRecoveryMode;

      status.consecutiveFailures = 0;
      status.inRecoveryMode = false;
      status.isHealthy = true;
      status.lastSeen = new Date();

      await redis.set(key, JSON.stringify(status), "EX", 3600);

      if (wasInRecovery) {
        logger.success(`✅ Agent ${agentName} exited RECOVERY MODE`);
      }
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
): Promise<{ jobId: string; runId: string }> {
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

  // Write initial pipeline state to Redis → dashboard widget shows "Çalışıyor"
  const runId = `run-${Date.now()}`;
  const initialState: PipelineRedisState = {
    isRunning: true,
    currentStep: 0,
    steps: PIPELINE_STEPS.map((s, idx) => ({
      ...s,
      status: idx === 0 ? "running" : "pending",
    })),
    startedAt: new Date().toISOString(),
    articlesCreated: 0,
    runId,
  };
  await writePipelineState(initialState);
  logger.info(`Pipeline state written to Redis (runId: ${runId})`);

  // Brief queue status check
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const activeCount = await duplicateQueue.getActiveCount();
  const waitingCount = await duplicateQueue.getWaitingCount();

  if (activeCount > 0) {
    logger.info("Job is being processed");
  } else if (waitingCount > 0) {
    logger.warn("Job waiting — agents may not have started");
  }

  return { jobId: job.id!, runId };
}

/**
 * Monitor pipeline progress
 *
 * Pipeline: Duplicate → Relevance → Trend → Enrich → Visual → SEO → Publish
 */
export async function monitorPipelineProgress(agentLogId: string): Promise<{
  stage: string;
  articlesInQueue: number;
  completed: number;
  failed: number;
  firstQueueCompleted: number;
}> {
  // Monitor all active pipeline queues
  const queues = [
    QUEUE_NAMES.UNIQUE_ARTICLES,
    QUEUE_NAMES.RELEVANT_ARTICLES,
    QUEUE_NAMES.TREND_ENRICHMENT,
    QUEUE_NAMES.ENRICHED_ARTICLES,
    QUEUE_NAMES.ARTICLES_WITH_VISUALS,
    QUEUE_NAMES.SEO_OPTIMIZATION,
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
  runId?: string,
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

  const pipelineStartedAt = new Date(startTime).toISOString();
  const effectiveRunId = runId || `run-${startTime}`;

  while (Date.now() - startTime < timeoutMs) {
    checkCount++;
    const progress = await monitorPipelineProgress(agentLogId);

    if (progress.articlesInQueue > 0 || progress.completed > 0) {
      hasSeenArticlesInQueue = true;
    }

    // Sync pipeline state to Redis every check (dashboard polls every 3-5s)
    if (hasSeenArticlesInQueue || checkCount <= 2) {
      await syncPipelineStateFromQueues(effectiveRunId, pipelineStartedAt, 0);
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
          // Write error state to Redis
          const errorState: PipelineRedisState = {
            isRunning: false,
            currentStep: -1,
            steps: PIPELINE_STEPS.map((s) => ({
              ...s,
              status: "error" as const,
              error: "Agents never started",
            })),
            startedAt: pipelineStartedAt,
            completedAt: new Date().toISOString(),
            articlesCreated: 0,
            totalDuration: Date.now() - startTime,
            runId: effectiveRunId,
          };
          await writePipelineState(errorState);
          await savePipelineHistory(errorState);

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

        // Write final completed state to Redis
        const totalDuration = Date.now() - startTime;
        const finalState: PipelineRedisState = {
          isRunning: false,
          currentStep: PIPELINE_STEPS.length - 1,
          steps: PIPELINE_STEPS.map((s) => ({
            ...s,
            status: "completed" as const,
          })),
          startedAt: pipelineStartedAt,
          completedAt: new Date().toISOString(),
          articlesCreated: publishedCount,
          totalDuration,
          runId: effectiveRunId,
        };
        await writePipelineState(finalState);
        await savePipelineHistory(finalState);
        logger.info(`Pipeline state finalized in Redis (${totalDuration}ms, ${publishedCount} published)`);

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

  // Write error state to Redis
  const timeoutState: PipelineRedisState = {
    isRunning: false,
    currentStep: -1,
    steps: PIPELINE_STEPS.map((s) => ({
      ...s,
      status: "error" as const,
      error: "Pipeline timeout",
    })),
    startedAt: pipelineStartedAt,
    completedAt: new Date().toISOString(),
    articlesCreated: 0,
    totalDuration: Date.now() - startTime,
    runId: effectiveRunId,
  };
  await writePipelineState(timeoutState);
  await savePipelineHistory(timeoutState);

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
