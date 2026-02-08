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

// ============================================================================
// AGENT TIMEOUT CONFIG (FAZ 3)
// ============================================================================

const AGENT_TIMEOUTS: Record<string, number> = {
  "relevance-filter": 3 * 60 * 1000, // 3 minutes
  "duplicate-detector": 2 * 60 * 1000, // 2 minutes
  "content-enricher": 10 * 60 * 1000, // 10 minutes
  "visual-generator": 20 * 60 * 1000, // 20 minutes (INCREASED: 44 articles × ~25s = ~18 min)
  "database-publisher": 2 * 60 * 1000, // 2 minutes
  "seo-optimizer": 15 * 60 * 1000, // 15 minutes
  "trend-enricher": 1 * 60 * 1000, // 1 minute
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

    return Promise.race([
      this.process(job),
      new Promise<AgentResult<TOutput>>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Agent ${this.config.name} timed out after ${Math.round(agentTimeout / 1000)}s`,
              ),
            ),
          agentTimeout,
        ),
      ),
    ]);
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

    this.logger.info(`Starting agent: ${this.config.name}`);
    this.logger.info(`Queue: ${this.config.queueName}`);
    this.logger.info(`Concurrency: ${queueConfig.concurrency}`);

    this.worker = new Worker(
      this.config.queueName,
      async (job) => {
        const startTime = Date.now();
        const agentTimeout = getAgentTimeout(this.config.name);

        console.log(
          `\n🤖 [${this.config.name}] ========== PROCESSING JOB ==========`,
        );
        console.log(`   Job ID: ${job.id}`);
        console.log(`   Job Name: ${job.name}`);
        console.log(`   Queue: ${this.config.queueName}`);
        console.log(
          `   Data items: ${Array.isArray(job.data) ? job.data.length : 1}`,
        );
        console.log(`   Timeout: ${Math.round(agentTimeout / 1000)}s`);
        this.logger.info(
          `Processing job ${job.id} (timeout: ${Math.round(agentTimeout / 1000)}s)`,
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
          const { updateAgentHealth, exitRecoveryMode } =
            await import("@/services/multi-agent-pipeline.service");
          await updateAgentHealth(this.config.name, true);
          if (result.success) {
            await exitRecoveryMode(this.config.name);
          }

          // Log success
          this.logger.success(`Job ${job.id} completed in ${processingTime}ms`);

          // Emit to next queue if specified
          if (result.success && !result.skipNextQueue && result.data) {
            await this.emitToNextQueue(result.data, result.nextQueue);
          }

          return result;
        } catch (error) {
          const processingTime = Date.now() - startTime;
          this.logger.error(
            `Job ${job.id} failed after ${processingTime}ms:`,
            this.serializeError(error),
          );

          // FAZ 3: Update agent health status on failure
          if (error instanceof Error && error.message.includes("timed out")) {
            const { updateAgentHealth } =
              await import("@/services/multi-agent-pipeline.service");
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
        maxStalledCount: 2,
        stalledInterval: 60000,
      },
    );

    // Setup event handlers
    this.setupEventHandlers();

    this.logger.success(`Agent started: ${this.config.name}`);
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

    if (!nextQueue) {
      this.logger.warn("No next queue specified, skipping emit");
      return;
    }

    const queue = getQueue(nextQueue);
    if (!queue) {
      this.logger.error(`Next queue not found: ${nextQueue}`);
      return;
    }

    try {
      await queue.add(`${this.config.name}-output`, data, {
        removeOnComplete: true,
      });

      this.logger.info(`Emitted to next queue: ${nextQueue}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit to ${nextQueue}:`,
        this.serializeError(error),
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
      console.log(
        `🟢 [${this.config.name}] Worker READY - listening for jobs on queue: ${this.config.queueName}`,
      );
      this.logger.info("Worker ready");
    });

    this.worker.on("active", (job) => {
      console.log(
        `🔄 [${this.config.name}] Job ${job.id} ACTIVE - processing...`,
      );
      this.logger.info(`Job ${job.id} active`);
    });

    this.worker.on("completed", (job) => {
      console.log(`✅ [${this.config.name}] Job ${job.id} COMPLETED`);
      this.logger.success(`Job ${job.id} completed`);
    });

    this.worker.on("failed", (job, error) => {
      console.log(`❌ [${this.config.name}] Job ${job?.id} FAILED: ${error}`);
      this.logger.error(`Job ${job?.id} failed:`, this.serializeError(error));
    });

    this.worker.on("stalled", (jobId) => {
      this.logger.warn(`Job ${jobId} stalled`);
    });

    this.worker.on("error", (error) => {
      // Suppress NOAUTH errors
      if (error.message && error.message.includes("NOAUTH")) {
        return;
      }
      this.logger.error("Worker error:", this.serializeError(error));
    });

    this.worker.on("closing", () => {
      this.logger.info("Worker closing");
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
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}
