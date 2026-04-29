/**
 * Base Agent Class for Multi-Agent News Pipeline
 *
 * All agents extend this class and implement the process() method.
 * Provides common functionality: logging, metrics, error handling, retry logic.
 */

import { Job, Worker } from "bullmq";
import { getRedis } from "@/lib/redis";
import { createModuleLogger } from "@/lib/agent-log-stream";
import { getQueue, getQueueConfig } from "@/lib/queue-manager";
import {
  updateAgentHealth,
  exitRecoveryMode,
} from "@/services/multi-agent-pipeline.service";

// ============================================================================
// AGENT TIMEOUT CONFIG (FAZ 3)
// ============================================================================

const AGENT_TIMEOUTS: Record<string, number> = {
  "relevance-filter": 3 * 60 * 1000, // 3 minutes
  "duplicate-detector": 2 * 60 * 1000, // 2 minutes
  "source-gatherer": 8 * 60 * 1000, // 8 minutes (external API calls: Tavily, Google News, Jina)
  "content-synthesizer": 12 * 60 * 1000, // 12 minutes (LLM synthesis with retries)
  "content-validator": 2 * 60 * 1000, // 2 minutes (fast validation)
  "content-enricher": 12 * 60 * 1000, // 12 minutes (LEGACY — backward compat, will be removed)
  "visual-generator": 20 * 60 * 1000, // 20 minutes
  "database-publisher": 2 * 60 * 1000, // 2 minutes
  "seo-optimizer": 15 * 60 * 1000, // 15 minutes
  "trend-enricher": 2 * 60 * 1000, // 2 minutes (was 1min — too tight for API calls)
  default: 5 * 60 * 1000, // 5 minutes default
};

export function getAgentTimeout(agentName: string): number {
  return AGENT_TIMEOUTS[agentName] || AGENT_TIMEOUTS["default"];
}

// ============================================================================
// END AGENT TIMEOUT CONFIG
// ============================================================================

export interface AgentMetrics {
  processingTime: number; // milliseconds
  apiCalls: number;
  tokensUsed?: number;
  itemsProcessed: number;
  /** VisualGenerator: görsel üretilemeyen makale sayısı */
  visualFailed?: number;
}

export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  nextQueue?: string; // Queue to send result to
  error?: string;
  metrics?: AgentMetrics;
  skipNextQueue?: boolean; // If true, don't emit to next queue
}

export interface AgentConfig {
  name: string;
  queueName: string;
  nextQueueName?: string; // Optional next queue in pipeline
  concurrency?: number;
  enableMetrics?: boolean;
}

/**
 * Abstract base class for all agents
 */
export abstract class BaseAgent<TInput = any, TOutput = any> {
  protected abstract config: AgentConfig;
  protected logger: ReturnType<typeof createModuleLogger>;
  protected worker: Worker | null = null;
  protected metrics: Map<string, AgentMetrics> = new Map();

  constructor(configName: string) {
    this.logger = createModuleLogger(configName);
  }

  /**
   * Abstract method - must be implemented by each agent
   */
  protected abstract process(job: Job<TInput>): Promise<AgentResult<TOutput>>;

  /**
   * Process with timeout protection (FAZ 3)
   * Wraps the process method with a timeout to prevent hanging agents
   */
  protected async processWithTimeout(
    job: Job<TInput>,
    timeoutMs?: number,
  ): Promise<AgentResult<TOutput>> {
    const agentTimeout = timeoutMs || getAgentTimeout(this.config.name);

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        this.process(job),
        new Promise<AgentResult<TOutput>>((_, reject) => {
          timeoutHandle = setTimeout(
            () =>
              reject(
                new Error(
                  `Agent ${this.config.name} timed out after ${Math.round(agentTimeout / 1000)}s`,
                ),
              ),
            agentTimeout,
          );
        }),
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  /**
   * Start the agent worker
   */
  public async start(): Promise<void> {
    const redis = getRedis();
    if (!redis) {
      this.logger.error("Redis not available, cannot start agent");
      throw new Error("Redis not available");
    }

    const queueConfig = getQueueConfig(this.config.queueName);
    if (!queueConfig) {
      this.logger.error(`Queue config not found: ${this.config.queueName}`);
      throw new Error(`Queue config not found: ${this.config.queueName}`);
    }

    this.logger.info(
      `Starting — queue: ${this.config.queueName}, concurrency: ${queueConfig.concurrency}`,
    );

    this.worker = new Worker(
      this.config.queueName,
      async (job) => {
        // OOM guard — skip processing if Redis is under memory pressure
        const { isRedisMemoryFull } = await import("@/lib/redis");
        if (isRedisMemoryFull()) {
          this.logger.warn(`⏸️ ${this.config.name} job deferred — Redis OOM`);
          throw new Error("Redis OOM — job will retry with backoff");
        }

        const startTime = Date.now();
        const agentTimeout = getAgentTimeout(this.config.name);
        const itemCount = Array.isArray(job.data) ? job.data.length : 1;

        this.logger.info(
          `Job ${job.id} started — ${itemCount} items (timeout: ${Math.round(agentTimeout / 1000)}s)`,
        );

        try {
          // FAZ 3: Use processWithTimeout for automatic timeout protection
          const result = await this.processWithTimeout(job, agentTimeout);

          // Calculate processing time
          const processingTime = Date.now() - startTime;
          if (result.metrics) {
            result.metrics.processingTime = processingTime;
          } else {
            result.metrics = {
              processingTime,
              apiCalls: 0,
              itemsProcessed: 1,
            };
          }

          // Store metrics
          if (this.config.enableMetrics && job.id) {
            this.metrics.set(job.id, result.metrics);
          }

          // FAZ 3: Update agent health status on success
          await updateAgentHealth(this.config.name, true);
          if (result.success) {
            await exitRecoveryMode(this.config.name);
          }

          // Log success
          const secs = (processingTime / 1000).toFixed(1);
          this.logger.success(
            `Job ${job.id} done — ${result.metrics?.itemsProcessed ?? 0} items in ${secs}s`,
          );

          // Emit to next queue if specified
          if (result.success && !result.skipNextQueue && result.data) {
            await this.emitToNextQueue(result.data, result.nextQueue);
          }

          return result;
        } catch (error) {
          const processingTime = Date.now() - startTime;
          const secs = (processingTime / 1000).toFixed(1);
          this.logger.error(
            `Job ${job.id} failed after ${secs}s: ${error instanceof Error ? error.message : "Unknown"}`,
          );

          // FAZ 3: Update agent health status on failure
          if (error instanceof Error && error.message.includes("timed out")) {
            await updateAgentHealth(this.config.name, false);
            this.logger.error(
              `⏰ Agent ${this.config.name} timed out - health updated`,
            );
          }

          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            metrics: {
              processingTime,
              apiCalls: 0,
              itemsProcessed: 0,
            },
          };
        }
      },
      {
        connection: redis,
        concurrency: queueConfig.concurrency,
        limiter: queueConfig.rateLimit,
        lockDuration: queueConfig.lockDuration,
        maxStalledCount: 3, // FIX: Allow 3 stall retries (was 2 — too aggressive for slow enrichment)
        stalledInterval: 90000, // FIX: Check every 90s (was 60s — stall detection was too eager)
      },
    );

    // Setup event handlers
    this.setupEventHandlers();

    this.logger.success(`Ready`);
  }

  /**
   * Stop the agent worker
   */
  public async stop(): Promise<void> {
    if (!this.worker) {
      return;
    }

    this.logger.info(`Stopping agent: ${this.config.name}`);

    try {
      await this.worker.close();
      this.worker = null;
      this.logger.success(`Agent stopped: ${this.config.name}`);
    } catch (error) {
      this.logger.error(`Failed to stop agent:`, this.serializeError(error));
      throw error;
    }
  }

  /**
   * Emit data to next queue in pipeline
   */
  protected async emitToNextQueue(
    data: TOutput,
    customQueue?: string,
  ): Promise<void> {
    const nextQueue = customQueue || this.config.nextQueueName;

    if (!nextQueue) return;

    const queue = getQueue(nextQueue);
    if (!queue) {
      this.logger.error(`Next queue not found: ${nextQueue}`);
      return;
    }

    try {
      await queue.add(`${this.config.name}-output`, data, {
        removeOnComplete: true,
      });
      this.logger.info(`→ ${nextQueue}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit to ${nextQueue}: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }

  /**
   * Setup worker event handlers
   */
  private setupEventHandlers(): void {
    if (!this.worker) return;

    this.worker.on("ready", () => {
      this.logger.info(`Listening on queue: ${this.config.queueName}`);
    });

    // 'active' and 'completed' are already logged in the job handler — skip here

    this.worker.on("failed", (job, error) => {
      // Suppress OOM retry noise — already logged once by OOM guard
      if (error.message?.includes("Redis OOM")) return;
      this.logger.error(`Job ${job?.id} failed: ${error.message}`);
    });

    this.worker.on("stalled", (jobId) => {
      this.logger.warn(`Job ${jobId} stalled — will be retried`);
    });

    this.worker.on("error", (error) => {
      if (error.message?.includes("NOAUTH")) return;
      // Suppress OOM error spam — handled by redis.ts memory monitor
      if (error.message?.includes("OOM")) return;
      this.logger.error(`Worker error: ${error.message}`);
    });
  }

  /**
   * Get agent metrics
   */
  public getMetrics(): Map<string, AgentMetrics> {
    return this.metrics;
  }

  /**
   * Get average metrics
   */
  public getAverageMetrics(): AgentMetrics | null {
    if (this.metrics.size === 0) {
      return null;
    }

    const totals = {
      processingTime: 0,
      apiCalls: 0,
      tokensUsed: 0,
      itemsProcessed: 0,
    };

    for (const metric of this.metrics.values()) {
      totals.processingTime += metric.processingTime;
      totals.apiCalls += metric.apiCalls;
      totals.tokensUsed += metric.tokensUsed || 0;
      totals.itemsProcessed += metric.itemsProcessed;
    }

    const count = this.metrics.size;

    return {
      processingTime: Math.round(totals.processingTime / count),
      apiCalls: Math.round(totals.apiCalls / count),
      tokensUsed: Math.round(totals.tokensUsed / count),
      itemsProcessed: Math.round(totals.itemsProcessed / count),
    };
  }

  /**
   * Clear metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    queueName: string;
    workerStatus: string;
    metricsCount: number;
  }> {
    return {
      healthy: this.worker !== null,
      queueName: this.config.queueName,
      workerStatus: this.worker ? "running" : "stopped",
      metricsCount: this.metrics.size,
    };
  }

  /**
   * Serialize error for logging
   */
  protected serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    if (typeof error === "object" && error !== null) {
      return error as Record<string, unknown>;
    }
    return { error: String(error) };
  }
}

/**
 * Utility: Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
      console.warn(
        `Retry attempt ${attempt}/${maxRetries} after ${delay}ms:`,
        lastError.message,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Utility: Timeout wrapper
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out",
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(errorMessage)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
