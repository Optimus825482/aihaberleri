/**
 * Centralized Queue Manager for Multi-Agent News Pipeline
 *
 * Pipeline: Collector → Duplicate → Relevance → Trend → SourceGatherer → ContentSynthesizer
 *   → ContentValidator → VisualGenerator → SEO Optimizer → DatabasePublisher → SocialShare.
 * Each agent has its own queue with specific concurrency and rate limits.
 */

import { Queue, QueueEvents, ConnectionOptions } from "bullmq";
import { getRedis } from "./redis";
import { createModuleLogger } from "./agent-log-stream";

const logger = createModuleLogger("queue-manager");

// Helper to format error for logger
function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { error: error.message, stack: error.stack };
  }
  return { error: String(error) };
}

// Queue names
export const QUEUE_NAMES = {
  COLLECTED_ARTICLES: "collected-articles",
  RELEVANT_ARTICLES: "relevant-articles",
  UNIQUE_ARTICLES: "unique-articles",
  TREND_ENRICHMENT: "trend-enrichment", // NEW: Trend matching & enrichment
  ENRICHED_ARTICLES: "enriched-articles",
  CONTENT_SYNTHESIS: "content-synthesis",
  CONTENT_VALIDATION: "content-validation",
  ARTICLES_WITH_VISUALS: "articles-with-visuals",
  DATABASE_PUBLISHER: "database-publisher", // Final publishing step
  SOCIAL_SHARE: "social-share", // NEW: Social media sharing (split from publisher) (2026-02-12)
  SEO_CALCULATION: "seo-calculation", // Bulk SEO calculation
  SEO_OPTIMIZATION: "seo-optimization", // Bulk SEO optimization
  SLUG_RECOVERY: "slug-recovery", // 404 slug recovery pipeline
} as const;

// Queue instances (lazy initialization)
const queues = new Map<string, Queue>();
const queueEvents = new Map<string, QueueEvents>();

/**
 * Get Redis connection for BullMQ
 */
function getRedisConnection(): ConnectionOptions | null {
  const redis = getRedis();
  if (!redis) {
    logger.error("Redis not available for queue manager");
    return null;
  }

  return {
    host: redis.options.host,
    port: redis.options.port,
    password: redis.options.password,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  };
}

/**
 * Queue configuration with concurrency and rate limits
 * FAZ 3: Added jobTimeout for deadlock prevention
 */
// ⚡ RESOURCE-OPTIMIZED concurrency settings
// Total concurrent jobs reduced: 58 → 22 to prevent server OOM.
// Throughput is barely affected since these queues are rarely ALL active at once.
const QUEUE_CONFIG = {
  [QUEUE_NAMES.COLLECTED_ARTICLES]: {
    concurrency: 5, // was 10 — halved; collector is I/O-bound, not CPU
    rateLimit: {
      max: 10, // was 20
      duration: 1000,
    },
    lockDuration: 60000,
    jobTimeout: 120000,
    attempts: 3,
  },
  [QUEUE_NAMES.RELEVANT_ARTICLES]: {
    concurrency: 3, // was 5 — AI calls are slow anyway
    rateLimit: {
      max: 5, // was 10
      duration: 1000,
    },
    lockDuration: 120000,
    jobTimeout: 180000,
    attempts: 3,
  },
  [QUEUE_NAMES.UNIQUE_ARTICLES]: {
    concurrency: 4, // was 8 — duplicate detection is fast, 4 is enough
    rateLimit: {
      max: 8, // was 15
      duration: 1000,
    },
    lockDuration: 90000,
    jobTimeout: 120000,
    attempts: 3,
  },
  [QUEUE_NAMES.TREND_ENRICHMENT]: {
    concurrency: 4, // was 10 — local DB lookup, 4 is plenty
    rateLimit: {
      max: 8, // was 20
      duration: 1000,
    },
    lockDuration: 30000,
    jobTimeout: 60000,
    attempts: 3,
  },
  [QUEUE_NAMES.ENRICHED_ARTICLES]: {
    concurrency: 2, // was 3 — external API calls (Tavily, Jina) — keep low
    rateLimit: {
      max: 3, // was 5
      duration: 1000,
    },
    lockDuration: 300000,
    jobTimeout: 480000,
    attempts: 3,
  },
  [QUEUE_NAMES.CONTENT_SYNTHESIS]: {
    concurrency: 1, // was 2 — LLM calls are slow and expensive, 1 is safe
    rateLimit: {
      max: 2, // was 3
      duration: 1000,
    },
    lockDuration: 600000,
    jobTimeout: 720000,
    attempts: 3,
  },
  [QUEUE_NAMES.CONTENT_VALIDATION]: {
    concurrency: 3, // was 5 — no external calls, but reduce CPU bursts
    rateLimit: {
      max: 5, // was 10
      duration: 1000,
    },
    lockDuration: 60000,
    jobTimeout: 120000,
    attempts: 3,
  },
  [QUEUE_NAMES.ARTICLES_WITH_VISUALS]: {
    concurrency: 2, // was 5 — image gen is memory-heavy
    rateLimit: {
      max: 4, // was 10
      duration: 1000,
    },
    lockDuration: 180000,
    jobTimeout: 300000,
    attempts: 3,
  },
  [QUEUE_NAMES.DATABASE_PUBLISHER]: {
    concurrency: 2, // was 3 — DB writes, keep modest
    rateLimit: {
      max: 3, // was 5
      duration: 1000,
    },
    lockDuration: 120000,
    jobTimeout: 180000,
    attempts: 3,
  },
  [QUEUE_NAMES.SOCIAL_SHARE]: {
    concurrency: 1, // was 2 — social APIs are rate-limited anyway
    rateLimit: {
      max: 2, // was 3
      duration: 1000,
    },
    lockDuration: 300000,
    jobTimeout: 300000,
    attempts: 3,
  },
  [QUEUE_NAMES.SEO_CALCULATION]: {
    concurrency: 1, // was 2 — heavy CPU calculation
    rateLimit: {
      max: 3, // was 5
      duration: 1000,
    },
    lockDuration: 600000,
    jobTimeout: 600000,
    attempts: 3,
  },
  [QUEUE_NAMES.SEO_OPTIMIZATION]: {
    concurrency: 2, // was 3 — LLM-based, keep low
    rateLimit: {
      max: 3, // was 5
      duration: 1000,
    },
    lockDuration: 1200000,
    jobTimeout: 900000,
    attempts: 3,
  },
  [QUEUE_NAMES.SLUG_RECOVERY]: {
    concurrency: 3, // Exa + DeepSeek + image — 3 paralel yeterli
    rateLimit: { max: 5, duration: 1000 },
    lockDuration: 300000, // 5 dk — AI+görsel üretimi uzun sürebilir
    jobTimeout: 300000,
    attempts: 2,
  },
};

/**
 * Get or create a queue
 */
export function getQueue(queueName: string): Queue | null {
  // Return existing queue
  if (queues.has(queueName)) {
    return queues.get(queueName)!;
  }

  // Create new queue
  const connection = getRedisConnection();
  if (!connection) {
    return null;
  }

  const config = QUEUE_CONFIG[queueName as keyof typeof QUEUE_CONFIG];
  if (!config) {
    logger.error(`Unknown queue: ${queueName}`);
    return null;
  }

  try {
    const queue = new Queue(queueName, {
      connection,
      streams: {
        events: { maxLen: 100 }, // Prevent event stream bloat
      },
      defaultJobOptions: {
        attempts: config.attempts,
        backoff: {
          type: "exponential",
          delay: 5000, // Start with 5s, then 10s, 20s
        },
        removeOnComplete: {
          count: 20, // Keep last 20 completed jobs (was 50) — reduces Redis memory
          age: 6 * 3600, // 6 hours (was 12h)
        },
        removeOnFail: {
          count: 10, // Keep last 10 failed jobs (was 20)
          age: 24 * 3600, // 24h max retention for debugging
        },
        // Note: Job timeouts are handled at Worker level via lockDuration
        // The actual timeout is controlled by worker's job processing timeout
      },
    });

    queues.set(queueName, queue);
    logger.info(`Queue created: ${queueName}`);

    // Setup event listeners
    setupQueueEvents(queueName, queue);

    return queue;
  } catch (error) {
    logger.error(`Failed to create queue ${queueName}:`, formatError(error));
    return null;
  }
}

/**
 * Setup event listeners for a queue
 */
function setupQueueEvents(queueName: string, queue: Queue): void {
  const connection = getRedisConnection();
  if (!connection) return;

  try {
    const events = new QueueEvents(queueName, { connection });

    events.on("completed", ({ jobId, returnvalue }) => {
      logger.info(`[${queueName}] Job ${jobId} completed`);
    });

    events.on("failed", ({ jobId, failedReason }) => {
      logger.error(`[${queueName}] Job ${jobId} failed: ${failedReason}`);
    });

    events.on("stalled", ({ jobId }) => {
      logger.warn(`[${queueName}] Job ${jobId} stalled`);
    });

    events.on("error", (error) => {
      // Suppress NOAUTH errors
      if (error.message && error.message.includes("NOAUTH")) {
        return;
      }
      logger.error(`[${queueName}] Queue error:`, formatError(error));
    });

    queueEvents.set(queueName, events);
  } catch (error) {
    logger.error(
      `Failed to setup events for ${queueName}:`,
      formatError(error),
    );
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: string) {
  const queue = getQueue(queueName);
  if (!queue) {
    return null;
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    logger.error(`Failed to get stats for ${queueName}:`, formatError(error));
    return null;
  }
}

/**
 * Get all queue statistics
 */
export async function getAllQueueStats() {
  const stats = await Promise.all(
    Object.values(QUEUE_NAMES).map((name) => getQueueStats(name)),
  );

  return stats.filter((s) => s !== null);
}

/**
 * Pause a queue
 */
export async function pauseQueue(queueName: string): Promise<boolean> {
  const queue = getQueue(queueName);
  if (!queue) return false;

  try {
    await queue.pause();
    logger.info(`Queue paused: ${queueName}`);
    return true;
  } catch (error) {
    logger.error(`Failed to pause queue ${queueName}:`, formatError(error));
    return false;
  }
}

/**
 * Resume a queue
 */
export async function resumeQueue(queueName: string): Promise<boolean> {
  const queue = getQueue(queueName);
  if (!queue) return false;

  try {
    await queue.resume();
    logger.info(`Queue resumed: ${queueName}`);
    return true;
  } catch (error) {
    logger.error(`Failed to resume queue ${queueName}:`, formatError(error));
    return false;
  }
}

/**
 * Clean a queue (remove completed/failed jobs)
 */
export async function cleanQueue(
  queueName: string,
  grace: number = 3600000, // 1 hour
): Promise<boolean> {
  const queue = getQueue(queueName);
  if (!queue) return false;

  try {
    await queue.clean(grace, 100, "completed");
    await queue.clean(grace, 50, "failed");
    logger.info(`Queue cleaned: ${queueName}`);
    return true;
  } catch (error) {
    logger.error(`Failed to clean queue ${queueName}:`, formatError(error));
    return false;
  }
}

/**
 * Obliterate a queue (remove all jobs and data)
 */
export async function obliterateQueue(queueName: string): Promise<boolean> {
  const queue = getQueue(queueName);
  if (!queue) return false;

  try {
    await queue.obliterate({ force: true });
    logger.info(`Queue obliterated: ${queueName}`);
    return true;
  } catch (error) {
    logger.error(
      `Failed to obliterate queue ${queueName}:`,
      formatError(error),
    );
    return false;
  }
}

/**
 * Close all queues and connections
 */
export async function closeAllQueues(): Promise<void> {
  logger.info("Closing all queues...");

  // Close queue events
  for (const [name, events] of queueEvents.entries()) {
    try {
      await events.close();
      logger.info(`Queue events closed: ${name}`);
    } catch (error) {
      logger.error(`Failed to close events for ${name}:`, formatError(error));
    }
  }

  // Close queues
  for (const [name, queue] of queues.entries()) {
    try {
      await queue.close();
      logger.info(`Queue closed: ${name}`);
    } catch (error) {
      logger.error(`Failed to close queue ${name}:`, formatError(error));
    }
  }

  queues.clear();
  queueEvents.clear();
}

/**
 * Get queue configuration
 */
export function getQueueConfig(queueName: string) {
  return QUEUE_CONFIG[queueName as keyof typeof QUEUE_CONFIG] || null;
}

/**
 * Initialize all queues (call this on startup)
 */
export function initializeQueues(): void {
  logger.info("Initializing all queues...");

  for (const queueName of Object.values(QUEUE_NAMES)) {
    getQueue(queueName);
  }

  logger.info("All queues initialized");
}

let __queueShutdownRegistered = false;

/**
 * Register graceful shutdown handlers for queues.
 * Call explicitly from orchestrator.worker.ts, not at import time.
 */
export function setupQueueShutdown(): void {
  if (__queueShutdownRegistered) return;
  __queueShutdownRegistered = true;

  process.once("SIGTERM", async () => {
    logger.info("SIGTERM received, closing queues...");
    await closeAllQueues();
  });

  process.once("SIGINT", async () => {
    logger.info("SIGINT received, closing queues...");
    await closeAllQueues();
  });
}
