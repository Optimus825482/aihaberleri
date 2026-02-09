/**
 * Multi-Agent Pipeline Service
 *
 * MODERN ARCHITECTURE (6 Agents):
 * ContentCollector → RelevanceFilter → DuplicateDetector → TrendEnricher → ContentEnricher → VisualGenerator → DatabasePublisher
 *
 * Each agent is autonomous and communicates via BullMQ queues.
 * This replaces the monolithic processAndPublishArticles approach.
 *
 * NOTE: SEO Optimization agent was removed from pipeline for performance.
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
    suggestedCategory: config.categorySlug || "yapay-zeka",
    agentLogId: config.agentLogId, // Pass agentLogId through pipeline
  }));

  // 🆕 Pipeline artık DUPLICATE CHECK ile başlıyor (09.02.2026)
  // Eski sıra: Relevance → Duplicate → Trend
  // Yeni sıra: Duplicate → Relevance → Trend (daha az API çağrısı)

  console.log(`\n✉ Adding job to queue: ${QUEUE_NAMES.UNIQUE_ARTICLES}`); // 🆕 Duplicate check FIRST!
  console.log(`   Articles: ${collectedArticles.length}`);
  console.log(`   AgentLogId: ${config.agentLogId}`);

  // 🆕 START WITH DUPLICATE CHECK (09.02.2026)
  // Eski sıra: Relevance → Duplicate → Trend
  // Yeni sıra: Duplicate → Relevance → Trend (daha az API call)
  const duplicateQueue = getQueue(QUEUE_NAMES.UNIQUE_ARTICLES);

  if (!duplicateQueue) {
    throw new Error("Duplicate detector queue not available");
  }

  const job = await duplicateQueue.add("filter-duplicates", collectedArticles, {
    removeOnComplete: 100, // Keep last 100 for debugging
    removeOnFail: 50,
    attempts: 3,
    priority: 1,
  });

  console.log(`✅ Job added successfully: ${job.id}`);

  // Wait a moment for job to be picked up
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Increased to 1s

  // Verify job was added
  const waitingCount = await duplicateQueue.getWaitingCount();
  const activeCount = await duplicateQueue.getActiveCount();
  const completedCount = await duplicateQueue.getCompletedCount();
  const failedCount = await duplicateQueue.getFailedCount();

  console.log(`\n📊 Queue Status (${QUEUE_NAMES.UNIQUE_ARTICLES}):`);
  console.log(`   Waiting: ${waitingCount}`);
  console.log(`   Active: ${activeCount}`);
  console.log(`   Completed: ${completedCount}`);
  console.log(`   Failed: ${failedCount}`);

  logger.info(
    `📊 Queue status: waiting=${waitingCount}, active=${activeCount}, completed=${completedCount}, failed=${failedCount}`,
  );

  if (activeCount > 0) {
    logger.success(`✅ Job is being processed by an agent!`);
  } else if (waitingCount > 0) {
    logger.warn(
      `⚠️ Job is waiting but no agent is processing - agents may not have started`,
    );
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
┃  Pipeline Flow (6 Agents) - 🆕 OPTIMIZED:         ┃
┃  1. ✅ Content Collected (RSS + Trend)            ┃
┃  2. 🔄 Duplicate Detection (3-layer) ← FIRST!    ┃
┃  3. 🔄 Relevance Filter (AI scoring)              ┃
┃  4. 🔄 Trend Enrichment                           ┃
┃  5. 🔄 Content Enrichment (SearXNG + Jina)        ┃
┃  6. 🔄 Visual Generation (Pollinations)           ┃
┃  7. 🔄 Database Publishing                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  `);
}

/**
 * Monitor pipeline progress
 *
 * PIPELINE FLOW (6 stages) - 🆕 OPTIMIZED ORDER (09.02.2026):
 * 1. UNIQUE_ARTICLES → DuplicateDetector (FIRST - saves API calls!)
 * 2. RELEVANT_ARTICLES → RelevanceFilter
 * 3. TREND_ENRICHMENT → TrendEnricher
 * 4. ENRICHED_ARTICLES → ContentEnricher
 * 5. ARTICLES_WITH_VISUALS → VisualGenerator
 * 6. DATABASE_PUBLISHER → DatabasePublisher
 *
 * NOTE: SEO Optimization was removed - articles go directly from Visual Generator to Database Publisher
 */
export async function monitorPipelineProgress(agentLogId: string): Promise<{
  stage: string;
  articlesInQueue: number;
  completed: number;
  failed: number;
}> {
  // Monitor all active pipeline queues (SEO removed from pipeline)
  const queues = [
    QUEUE_NAMES.RELEVANT_ARTICLES,
    QUEUE_NAMES.UNIQUE_ARTICLES,
    QUEUE_NAMES.TREND_ENRICHMENT,
    QUEUE_NAMES.ENRICHED_ARTICLES,
    QUEUE_NAMES.ARTICLES_WITH_VISUALS,
    QUEUE_NAMES.DATABASE_PUBLISHER,
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

  console.log(
    `\n⏳ Waiting for pipeline completion (timeout: ${timeoutMs / 1000}s)`,
  );
  logger.info(
    `⏳ Waiting for pipeline completion (timeout: ${timeoutMs / 1000}s)`,
  );

  // CRITICAL: Wait longer for agents to pick up jobs before first check
  // This prevents false "completed" detection when queues haven't been processed yet
  await new Promise((resolve) => setTimeout(resolve, 5000));

  let consecutiveEmptyChecks = 0;
  const REQUIRED_EMPTY_CHECKS = 3; // FAZ 3: Reduced from 5 to 3 for faster completion detection
  let hasSeenArticlesInQueue = false; // Track if we've ever seen articles in queue
  let checkCount = 0;

  while (Date.now() - startTime < timeoutMs) {
    checkCount++;
    const progress = await monitorPipelineProgress(agentLogId);

    // Track if we've seen any articles in queue
    if (progress.articlesInQueue > 0 || progress.completed > 0) {
      hasSeenArticlesInQueue = true;
    }

    // Log detailed progress every check
    console.log(`\n📊 [Check #${checkCount}] Pipeline Progress:`);
    console.log(`   Stage: ${progress.stage}`);
    console.log(`   In Queue: ${progress.articlesInQueue}`);
    console.log(`   Completed: ${progress.completed}`);
    console.log(`   Failed: ${progress.failed}`);
    console.log(`   Has Seen Articles: ${hasSeenArticlesInQueue}`);
    console.log(
      `   Empty Checks: ${consecutiveEmptyChecks}/${REQUIRED_EMPTY_CHECKS}`,
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
