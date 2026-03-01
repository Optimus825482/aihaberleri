/**
 * Centralized Queue Manager for Multi-Agent News Pipeline
 *
 * 7-AGENT ARCHITECTURE (2026-02-12):
 * ContentCollector → DuplicateDetector → RelevanceFilter → TrendEnricher → ContentEnricher → VisualGenerator → SEO Optimizer → DatabasePublisher
 *
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
const QUEUE_CONFIG = {
  [QUEUE_NAMES.COLLECTED_ARTICLES]: {
    concurrency: 10, // Process 10 articles in parallel
    rateLimit: {
      max: 20, // Max 20 jobs
      duration: 1000, // Per second
    },
    lockDuration: 60000, // 1 minute
    jobTimeout: 120000, // FAZ 3: 2 minutes job timeout
    attempts: 3,
  },
  [QUEUE_NAMES.RELEVANT_ARTICLES]: {
    concurrency: 5, // AI scoring is slower
    rateLimit: {
      max: 10,
      duration: 1000,
    },
    lockDuration: 120000, // 2 minutes (DeepSeek calls)
    jobTimeout: 180000, // FAZ 3: 3 minutes job timeout
    attempts: 3,
  },
  [QUEUE_NAMES.UNIQUE_ARTICLES]: {
    concurrency: 8, // Duplicate detection is fast
    rateLimit: {
      max: 15,
      duration: 1000,
    },
    lockDuration: 90000, // 1.5 minutes
    jobTimeout: 120000, // FAZ 3: 2 minutes job timeout
    attempts: 3,
  },
  [QUEUE_NAMES.TREND_ENRICHMENT]: {
    concurrency: 10, // Trend matching is fast (local DB lookup)
    rateLimit: {
      max: 20,
      duration: 1000,
    },
    lockDuration: 30000, // 30 seconds
    jobTimeout: 60000, // FAZ 3: 1 minute job timeout
    attempts: 3,
  },
  [QUEUE_NAMES.ENRICHED_ARTICLES]: {
    concurrency: 3, // Source gathering is slow (Tavily, SearXNG, Jina)
    rateLimit: {
      max: 5,
      duration: 1000,
    },
    lockDuration: 300000, // 5 minutes
    jobTimeout: 480000, // 8 minutes job timeout
    attempts: 3,
  },
  [QUEUE_NAMES.CONTENT_SYNTHESIS]: {
    concurrency: 2, // LLM synthesis is slow (DeepSeek calls + retries)
    rateLimit: {
      max: 3,
      duration: 1000,
    },
    lockDuration: 600000, // 10 minutes
    jobTimeout: 720000, // 12 minutes job timeout
    attempts: 3,
  },
  [QUEUE_NAMES.CONTENT_VALIDATION]: {
    concurrency: 5, // Validation is fast (no external calls)
    rateLimit: {
      max: 10,
      duration: 1000,
    },
    lockDuration: 60000, // 1 minute
    jobTimeout: 120000, // 2 minutes job timeout
    attempts: 3,
  },
  [QUEUE_NAMES.ARTICLES_WITH_VISUALS]: {
    concurrency: 5, // Parallel image generation
    rateLimit: {
      max: 10,
      duration: 1000,
    },
    lockDuration: 180000, // 3 minutes (Pollinations can be slow)
    jobTimeout: 300000, // FAZ 3: 5 minutes job timeout
    attempts: 3,
  },
  [QUEUE_NAMES.DATABASE_PUBLISHER]: {
    concurrency: 3, // Database writes
    rateLimit: {
      max: 5,
      duration: 1000,
    },
    lockDuration: 120000, // 2 minutes
    jobTimeout: 180000, // FAZ 3: 3 minutes job timeout
    attempts: 3,
  },
  [QUEUE_NAMES.SOCIAL_SHARE]: {
    concurrency: 2, // Social media API calls (rate limited by platforms)
    rateLimit: {
      max: 3,
      duration: 1000,
    },
    lockDuration: 300000, // 5 minutes (social APIs can be slow)
    jobTimeout: 300000, // 5 minutes job timeout
    attempts: 3,
  },
  [QUEUE_NAMES.SEO_CALCULATION]: {
    concurrency: 2, // Parallel SEO calculations
    rateLimit: {
      max: 5,
      duration: 1000,
    },
    lockDuration: 600000, // 10 minutes
    jobTimeout: 600000, // FAZ 3: 10 minutes job timeout
    attempts: 3,
  },
  [QUEUE_NAMES.SEO_OPTIMIZATION]: {
    concurrency: 3, // P0-2: Increased from 1 → 3 (was bottleneck: 40-50% of pipeline time)
    rateLimit: {
      max: 5, // P0-2: Increased from 2 → 5
      duration: 1000,
    },
    lockDuration: 1200000, // 20 minutes (AI calls)
    jobTimeout: 900000, // FAZ 3: 15 minutes job timeout
    attempts: 3,
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
          count: 50, // Keep last 50 completed jobs (was 100)
          age: 12 * 3600, // 12 hours (was 24h)
        },
        removeOnFail: {
          count: 20, // Keep last 20 failed jobs (was 50)
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

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing queues...");
  await closeAllQueues();
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing queues...");
  await closeAllQueues();
});
