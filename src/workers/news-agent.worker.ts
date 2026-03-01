/**
 * News Agent Worker - Background job processor
 * Run this with: npm run worker
 */

// Suppress BullMQ "IMPORTANT! Eviction policy" spam
// BullMQ prints this warning for EVERY Redis connection when maxmemory-policy != noeviction
// This is informational only and not a real problem for our use case
const _originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === "string" && args[0].includes("Eviction policy"))
    return;
  _originalConsoleWarn.apply(console, args);
};

import { Worker } from "bullmq";
import { getRedis } from "@/lib/redis";
import { executeNewsAgent } from "@/services/agent.service";
import {
  scheduleNewsAgentJob,
  scheduleNewsletterJob,
  getNewsletterQueue,
  getSocialBatchQueue,
} from "@/lib/queue";
import { sendDailyDigest } from "@/services/newsletter.service";
import {
  postToFacebook,
  postToFacebookEN,
  postToFacebookWithMetadata,
  postToFacebookENWithMetadata,
  type FacebookRateLimitHeaders,
} from "@/lib/social/facebook";
import { postToBluesky, postToBlueskyEN } from "@/lib/social/bluesky";
import { postToMastodon, postToMastodonEN } from "@/lib/social/mastodon";
import { db } from "@/lib/db";
import { PrismaClient, Prisma } from "@prisma/client";

// OOM log suppression — prevent thousands of identical error lines
let isRedisOOMLogged = false;
import { workerLogger } from "@/lib/logger";
import { trackWorkerError } from "@/lib/sentry";

// Multi-agent pipeline imports
import { initializeQueues } from "@/lib/queue-manager";
import { RelevanceFilterAgent } from "@/agents/relevance-filter.agent";
import { DuplicateDetectorAgent } from "@/agents/duplicate-detector.agent";
import { TrendEnricherAgent } from "@/agents/trend-enricher.agent"; // FIX: Missing agent causing pipeline break
import {
  startTrendFetcher,
  stopTrendFetcher,
} from "@/services/trend-fetcher.service";
import { SourceGathererAgent } from "@/agents/source-gatherer.agent";
import { ContentSynthesizerAgent } from "@/agents/content-synthesizer.agent";
import { ContentValidatorAgent } from "@/agents/content-validator.agent";
import { VisualGeneratorAgent } from "@/agents/visual-generator.agent";
import { SEOOptimizerAgent } from "@/agents/seo-optimizer.agent"; // NEW: SEO before publish
import { DatabasePublisherAgent } from "@/agents/database-publisher.agent";
import { SocialShareAgent } from "@/agents/social-share.agent";
import {
  startSEOCalculatorWorker,
  queuePendingSEOCalculations,
} from "@/agents/seo-calculator.agent";
import type { Worker as BullMQWorker } from "bullmq";

// ============================================================================
// WORKER CONSTANTS
// ============================================================================

const WORKER_CONSTANTS = {
  // Agent execution timeout (ms) - 25 minutes for complex processing (increased to prevent timeouts)
  AGENT_TIMEOUT_MS: 25 * 60 * 1000,
  // Progress update interval (ms) - every 2 minutes
  PROGRESS_UPDATE_INTERVAL_MS: 2 * 60 * 1000,
  // Heartbeat interval (ms) - every 30 seconds
  HEARTBEAT_INTERVAL_MS: 30000,
  // Heartbeat expiry (seconds) - 60 seconds
  HEARTBEAT_EXPIRY_SECONDS: 60,
  // Database connection retry settings
  DB_MAX_RETRIES: 10,
  DB_RETRY_DELAY_MS: 5000,
} as const;

// Multi-agent pipeline instances
let relevanceFilter: RelevanceFilterAgent;
let duplicateDetector: DuplicateDetectorAgent;
let trendEnricher: TrendEnricherAgent; // FIX: Missing agent causing pipeline break
let sourceGatherer: SourceGathererAgent;
let contentSynthesizer: ContentSynthesizerAgent;
let contentValidator: ContentValidatorAgent;
let visualGenerator: VisualGeneratorAgent;
let seoOptimizer: SEOOptimizerAgent; // NEW: SEO Optimizer before publish
let databasePublisher: DatabasePublisherAgent;
let socialShare: SocialShareAgent;
let seoCalculatorWorker: BullMQWorker | null = null;

// ============================================================================
// COMPACT LOGGER - Less verbose, more informative
// ============================================================================
const log = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  success: (msg: string) => console.log(`[OK] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string, err?: any) => {
    console.error(`[ERROR] ${msg}`);
    if (err) console.error(`  └─ ${err instanceof Error ? err.message : err}`);
  },
  job: (id: string, name: string, info: Record<string, any>) => {
    const parts = Object.entries(info)
      .map(([k, v]) => `${k}=${v}`)
      .join(" | ");
    console.log(`\n[JOB:${id}] ${name} | ${parts}`);
  },
  summary: (title: string, data: Record<string, any>) => {
    console.log(`\n[SUMMARY] ${title}`);
    Object.entries(data).forEach(([k, v]) => console.log(`  └─ ${k}: ${v}`));
  },
};

/**
 * Initialize multi-agent pipeline agents (10 agents total)
 * Pipeline: Relevance → Duplicate → Trend → SourceGather → Synthesize → Validate → Visual → SEO → Publish → Social
 */
async function initializeMultiAgentPipeline(): Promise<void> {
  log.info("Initializing multi-agent pipeline...");

  try {
    await initializeQueues();

    // Create agent instances
    relevanceFilter = new RelevanceFilterAgent();
    duplicateDetector = new DuplicateDetectorAgent();
    trendEnricher = new TrendEnricherAgent();
    sourceGatherer = new SourceGathererAgent();
    contentSynthesizer = new ContentSynthesizerAgent();
    contentValidator = new ContentValidatorAgent();
    visualGenerator = new VisualGeneratorAgent();
    seoOptimizer = new SEOOptimizerAgent(); // NEW: SEO before publish
    databasePublisher = new DatabasePublisherAgent();
    socialShare = new SocialShareAgent();

    // Start all agents
    const agents = [
      { name: "Relevance", agent: relevanceFilter },
      { name: "Duplicate", agent: duplicateDetector },
      { name: "Trend", agent: trendEnricher },
      { name: "SourceGatherer", agent: sourceGatherer },
      { name: "ContentSynthesizer", agent: contentSynthesizer },
      { name: "ContentValidator", agent: contentValidator },
      { name: "Visual", agent: visualGenerator },
      { name: "SEO", agent: seoOptimizer },
      { name: "Publish", agent: databasePublisher },
      { name: "Social", agent: socialShare },
    ];

    const results = await Promise.allSettled(
      agents.map(async ({ name, agent }) => {
        await agent.start();
        return name;
      }),
    );

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");

    if (failed.length > 0) {
      failed.forEach((r, i) => {
        if (r.status === "rejected") {
          log.error(`Agent[${agents[i]?.name}] start failed`, r.reason);
        }
      });
    }

    log.success(
      `Pipeline ready: ${ok}/10 agents | Relevance→Duplicate→Trend→SourceGather→Synthesize→Validate→Visual→SEO→Publish→Social`,
    );

    // FIX (12.02.2026): Clear stale recovery mode states on worker startup
    // Prevents agents from starting in recovery mode due to previous session failures
    try {
      const { getRedis } = await import("@/lib/redis");
      const redisClient = getRedis();
      if (redisClient) {
        const healthKeys = await redisClient.keys("agent:health:status:*");
        if (healthKeys.length > 0) {
          await redisClient.del(...healthKeys);
          log.info(`Cleared ${healthKeys.length} stale agent health states`);
        }
      }
    } catch {
      // Non-critical — agents will recover naturally
    }
  } catch (error) {
    log.error("Pipeline init failed", error);
    throw error;
  }
}

/**
 * Stop multi-agent pipeline agents
 */
async function stopMultiAgentPipeline(): Promise<void> {
  log.info("Stopping pipeline...");
  await Promise.all([
    relevanceFilter?.stop(),
    duplicateDetector?.stop(),
    trendEnricher?.stop(),
    sourceGatherer?.stop(),
    contentSynthesizer?.stop(),
    contentValidator?.stop(),
    visualGenerator?.stop(),
    seoOptimizer?.stop(),
    databasePublisher?.stop(),
    socialShare?.stop(),
    seoCalculatorWorker?.close(),
  ]);
  log.success("Pipeline stopped");
}

/**
 * Cleanup memory resources before shutdown
 */
async function cleanupMemoryResources(): Promise<void> {
  log.info("Cleaning up resources...");

  try {
    stopTrendFetcher();
  } catch {
    // Silent - not critical
  }

  try {
    const { stopTrendCacheCleanup } = await import("@/lib/brave");
    stopTrendCacheCleanup();
  } catch (error) {
    // Silent - not critical
  }

  try {
    const { stopSourceReliabilityCleanup } = await import("@/lib/rss");
    stopSourceReliabilityCleanup();
  } catch (error) {
    // Silent - not critical
  }

  try {
    const { closeAllQueues } = await import("@/lib/queue-manager");
    await closeAllQueues();
  } catch (error) {
    // Silent - not critical
  }

  log.success("Resources cleaned");
}

/**
 * Progress tracking interface for agent jobs
 */
interface ProgressUpdate {
  timestamp: string;
  agent: string;
  stage: string;
  message: string;
  progress: number; // 0-100
}

/**
 * Update job progress in AgentLog (persistent storage)
 * Updates both Redis (fast access) and Database (persistent)
 */
async function updateJobProgress(
  agentLogId: string,
  agent: string,
  stage: string,
  message: string,
  progress: number,
): Promise<void> {
  const update: ProgressUpdate = {
    timestamp: new Date().toISOString(),
    agent,
    stage,
    message,
    progress: Math.min(100, Math.max(0, progress)), // Clamp 0-100
  };

  try {
    // 1. Store in Redis for fast access (1 hour TTL)
    if (redis) {
      const progressKey = `job:progress:${agentLogId}`;
      await redis.lpush(progressKey, JSON.stringify(update));
      await redis.ltrim(progressKey, 0, 49); // Keep last 50
      await redis.expire(progressKey, 3600); // 1 hour TTL
    }
  } catch (redisError) {
    // Silent - Redis progress cache is non-critical
  }

  try {
    // 2. Persist to database (survives Redis restarts)
    const log = await db.agentLog.findUnique({
      where: { id: agentLogId },
      select: { progressUpdates: true },
    });

    if (log) {
      let updates: ProgressUpdate[] = [];
      try {
        updates = Array.isArray(log.progressUpdates)
          ? (log.progressUpdates as unknown as ProgressUpdate[])
          : JSON.parse(String(log.progressUpdates || "[]"));
      } catch {
        updates = [];
      }

      // Add new update
      updates.push(update);

      // Keep only last 100 updates in DB (prevent unlimited growth)
      if (updates.length > 100) {
        updates = updates.slice(-100);
      }

      await db.agentLog.update({
        where: { id: agentLogId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { progressUpdates: updates as any },
      });
    }
  } catch {
    // Silent - progress updates are non-critical
  }
}

/**
 * Get job progress from Redis or database
 */
async function getJobProgress(agentLogId: string): Promise<ProgressUpdate[]> {
  try {
    if (!redis) return [];

    // Try Redis first (fast)
    const progressKey = `job:progress:${agentLogId}`;
    const redisProgress = await redis.lrange(progressKey, 0, 49);

    if (redisProgress.length > 0) {
      return redisProgress.map((p) => JSON.parse(p));
    }

    // Fallback to database
    const log = await db.agentLog.findUnique({
      where: { id: agentLogId },
      select: { progressUpdates: true },
    });

    if (log?.progressUpdates) {
      try {
        return Array.isArray(log.progressUpdates)
          ? (log.progressUpdates as unknown as ProgressUpdate[])
          : JSON.parse((log.progressUpdates as string) || "[]");
      } catch {
        return [];
      }
    }

    return [];
  } catch {
    return []; // Silent - non-critical
  }
}

workerLogger.start();
log.info("Starting News Agent Worker...");

const redis = getRedis();

if (!redis) {
  workerLogger.connection("redis", "failed");
  log.error("Redis not available. Exiting.");
  process.exit(1);
}

// Ensure Redis is connected before proceeding
async function ensureRedisConnection() {
  if (!redis) return false;

  try {
    if (redis.status === "wait") await redis.connect();
    const pong = await redis.ping();
    if (pong === "PONG") {
      log.success("Redis connected");
      return true;
    }
    log.error("Redis ping failed");
    return false;
  } catch (error) {
    log.error("Redis connection failed", error);
    return false;
  }
}

async function testDatabaseConnection() {
  try {
    await (db as PrismaClient).$connect();
    await db.$queryRaw`SELECT 1`;
    workerLogger.connection("database", "connected");
    return true;
  } catch (error) {
    workerLogger.connection("database", "failed");
    log.error("Database connection failed", error);
    return false;
  }
}

async function waitForDatabase(
  maxRetries = WORKER_CONSTANTS.DB_MAX_RETRIES,
  delayMs = WORKER_CONSTANTS.DB_RETRY_DELAY_MS,
) {
  for (let i = 1; i <= maxRetries; i++) {
    log.info(`DB connection attempt ${i}/${maxRetries}`);
    if (await testDatabaseConnection()) {
      log.success("Database connected");
      return true;
    }
    if (i < maxRetries) await new Promise((r) => setTimeout(r, delayMs));
  }
  log.error("Database connection failed after all retries");
  return false;
}

async function initializeWorker() {
  const redisReady = await ensureRedisConnection();
  if (!redisReady) {
    log.error("Cannot start - Redis unavailable");
    process.exit(1);
  }

  const dbReady = await waitForDatabase();
  if (!dbReady) {
    log.error("Cannot start - Database unavailable");
    process.exit(1);
  }

  log.success("All systems ready");
  startHeartbeat();
  await startWorker();
}

// Heartbeat function to indicate worker is alive
function startHeartbeat() {
  const updateHeartbeat = async () => {
    try {
      if (redis) {
        await redis.set(
          "worker:heartbeat",
          Date.now().toString(),
          "EX",
          WORKER_CONSTANTS.HEARTBEAT_EXPIRY_SECONDS,
        );
        workerLogger.heartbeat();
      }
    } catch (error) {
      workerLogger.connection("redis", "failed");
    }
  };

  updateHeartbeat();
  setInterval(updateHeartbeat, WORKER_CONSTANTS.HEARTBEAT_INTERVAL_MS);
}

async function startWorker() {
  log.info("Initializing BullMQ Worker (news-agent, concurrency=1)");

  // Initialize multi-agent pipeline agents BEFORE creating worker
  let pipelineReady = false;
  try {
    await initializeMultiAgentPipeline();
    log.success("Multi-agent pipeline ready");
    pipelineReady = true;
  } catch (error) {
    log.error("Multi-agent pipeline init failed", error);
    log.warn("Articles will be queued but NOT processed!");
    // Don't exit - main worker can still run for other tasks
  }

  // Log pipeline status
  log.info(`Pipeline: ${pipelineReady ? "READY" : "NOT READY"}`);

  // Create worker
  const worker = new Worker(
    "news-agent",
    async (job) => {
      // OOM guard — don't start heavy processing if Redis is under memory pressure
      const { isRedisMemoryFull } = await import("@/lib/redis");
      if (isRedisMemoryFull()) {
        log.warn("⏸️ News agent job deferred — Redis OOM");
        throw new Error("Redis OOM — job will retry with backoff");
      }

      workerLogger.jobStart(job.id!, job.name);
      log.job(job.id!, job.name, {
        priority: job.opts.priority || "default",
        attempt: `${job.attemptsMade + 1}/${job.opts.attempts || 3}`,
      });

      // P1-7: Smart cycle timing — progressive delay + nighttime awareness
      try {
        const redis = (await import("@/lib/redis")).getRedis();
        if (redis) {
          const emptyCount = parseInt(
            (await redis.get("pipeline:consecutive_empties")) || "0",
            10,
          );

          // ── Nighttime check: 00:00-06:00 TRT (UTC+3) ──
          const now = new Date();
          const turkeyHour = (now.getUTCHours() + 3) % 24;
          const isNighttime = turkeyHour >= 0 && turkeyHour < 6;

          let totalDelayMin = 0;
          const reasons: string[] = [];

          // Empty cycle progressive delay (threshold: 2+ empties)
          if (emptyCount >= 2) {
            const emptyDelay = Math.min(emptyCount * 3, 30); // max 30min (was 15)
            totalDelayMin += emptyDelay;
            reasons.push(`${emptyCount} boş döngü (+${emptyDelay}dk)`);
          }

          // Nighttime base delay: 15 min extra between 00-06 TRT
          if (isNighttime) {
            totalDelayMin += 15;
            reasons.push(`gece modu ${turkeyHour}:xx TRT (+15dk)`);
          }

          if (totalDelayMin > 0) {
            // Cap total delay at 45 minutes
            totalDelayMin = Math.min(totalDelayMin, 45);
            log.info(
              `⏳ P1-7: ${reasons.join(" + ")} — toplam ${totalDelayMin}dk bekleniyor...`,
            );
            await new Promise((r) => setTimeout(r, totalDelayMin * 60 * 1000));
          }
        }
      } catch {
        // Non-critical — don't block execution
      }

      let result;
      try {
        // 🚀 PERFORMANCE (FAZ 2): No need for explicit $connect()
        // Prisma's connection pool handles connection lifecycle automatically
        // This prevents unnecessary reconnection overhead

        // Update job progress to prevent stalling
        await job.updateProgress(10);
        log.info("Job started (10%)");

        // Execute the news agent with timeout protection
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  `Agent execution timeout (${Math.round(WORKER_CONSTANTS.AGENT_TIMEOUT_MS / 60000)} minutes)`,
                ),
              ),
            WORKER_CONSTANTS.AGENT_TIMEOUT_MS,
          );
        });

        // Progress update interval (every 2 minutes)
        // FIXED: Store interval ID for proper cleanup in finally block
        let progressInterval: NodeJS.Timeout | null = null;

        const createProgressInterval = () => {
          return setInterval(async () => {
            try {
              const currentProgress = (await job.progress) as number;
              if (currentProgress < 80) {
                await job.updateProgress(Math.min(currentProgress + 10, 80));
              }
            } catch {
              /* silent */
            }
          }, WORKER_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
        };

        progressInterval = createProgressInterval();

        try {
          result = (await Promise.race([
            executeNewsAgent(),
            timeoutPromise,
          ])) as any;
        } finally {
          clearInterval(progressInterval);
        }

        // Mark as nearly complete
        await job.updateProgress(90);

        workerLogger.jobComplete(job.id!, result);

        log.summary("Job Complete", {
          scraped: result.articlesScraped,
          created: result.articlesCreated,
          duration: `${result.duration}s`,
          status: result.success ? "SUCCESS" : "FAILED",
          errors:
            result.errors.length > 0 ? result.errors.join(", ") : undefined,
        });

        // P1-7: Track consecutive empty cycles for smart timing
        try {
          const redis = (await import("@/lib/redis")).getRedis();
          if (redis) {
            const key = "pipeline:consecutive_empties";
            if (result.articlesCreated === 0) {
              const newCount = await redis.incr(key);
              await redis.expire(key, 3600); // 1h TTL
              log.info(`📊 P1-7: Boş döngü #${newCount} kaydedildi`);
            } else {
              await redis.del(key);
              log.info(`📊 P1-7: Verimli döngü — boş sayaç sıfırlandı`);
            }
          }
        } catch {
          // Non-critical
        }
      } catch (error) {
        workerLogger.jobFailed(job.id!, error as Error);
        trackWorkerError(job.id!, error as Error, {
          jobName: job.name,
          attempt: job.attemptsMade,
        });

        log.error("Agent execution failed", error);
        // Create a failed result object
        result = {
          success: false,
          articlesCreated: 0,
          articlesScraped: 0,
          duration: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
          publishedArticles: [],
        };
      } finally {
        // Prisma connection pool kept alive for efficiency

        // Log next execution time
        try {
          const enabledSetting = await db.setting.findUnique({
            where: { key: "agent.enabled" },
          });
          if (enabledSetting?.value !== "false") {
            const nextRunSetting = await db.setting.findUnique({
              where: { key: "agent.nextRun" },
            });
            if (nextRunSetting) {
              log.info(
                `Next run: ${new Date(nextRunSetting.value).toLocaleString()}`,
              );
            }
          }
        } catch {
          /* silent */
        }
      }

      return result;
    },
    {
      connection: redis!,
      concurrency: 1, // Process one job at a time
      limiter: {
        max: 1,
        duration: 1000, // Max 1 job per second
      },
      lockDuration: 1800000, // Lock job for 30 minutes (1800000ms) - increased from 20min to prevent stuck jobs
      maxStalledCount: 2, // Allow 2 stalls before failing
      stalledInterval: 60000, // Check for stalled jobs every 60 seconds
    },
  );

  // Worker event handlers (compact)
  worker.on("ready", () => log.success("Worker ready"));
  worker.on("active", (job) => log.info(`Job ${job.id} active`));
  worker.on("completed", (job) => log.success(`Job ${job.id} completed`));
  worker.on("failed", (job, err) => {
    // Suppress OOM retry noise — already logged once by OOM guard
    if (err.message?.includes("Redis OOM")) return;
    log.error(`Job ${job?.id} failed`, err);
  });
  worker.on("error", (err) => {
    if (err.message?.includes("NOAUTH")) return;
    // Suppress OOM error spam — handled by redis.ts memory monitor
    if (err.message?.includes("OOM")) {
      if (!isRedisOOMLogged) {
        log.error(
          "[ERROR] Worker error\n  └─ Redis OOM — suppressing further logs",
        );
        isRedisOOMLogged = true;
        setTimeout(() => {
          isRedisOOMLogged = false;
        }, 60_000);
      }
      return;
    }
    log.error("Worker error", err);
  });
  worker.on("stalled", (jobId) => log.warn(`Job ${jobId} stalled`));

  log.success("Worker started - listening on queue: news-agent");

  // Worker closing event
  worker.on("closing", async () => {
    log.info("Worker closing...");
    try {
      await (db as PrismaClient).$disconnect();
    } catch {
      /* silent */
    }
  });

  // Graceful shutdown with active job waiting
  async function gracefulShutdown(signal: string): Promise<void> {
    log.info(`${signal} received - shutting down...`);

    const SHUTDOWN_TIMEOUT = 30000;
    const startTime = Date.now();

    try {
      await worker.pause();
      log.info("Waiting for active jobs...");

      let attempts = 0;
      const maxAttempts = Math.ceil(SHUTDOWN_TIMEOUT / 1000);
      const queue = (worker as any).queue;

      while (attempts < maxAttempts) {
        const activeCount = queue ? await queue.getActiveCount() : 0;

        if (activeCount === 0) break;

        const elapsed = Date.now() - startTime;
        if (elapsed >= SHUTDOWN_TIMEOUT) {
          log.warn(`Shutdown timeout: ${activeCount} jobs incomplete`);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      // 3. Stop multi-agent pipeline
      await stopMultiAgentPipeline();

      // 3.5. Cleanup memory resources
      await cleanupMemoryResources();

      // 4. Close worker
      await worker.close();

      // 5. Disconnect from database
      await (db as PrismaClient).$disconnect();

      // 6. Close Redis connection
      if (redis) await redis.quit();

      log.success(`Shutdown completed (${Date.now() - startTime}ms)`);
      process.exit(0);
    } catch (error) {
      log.error("Shutdown error", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      process.exit(1);
    }
  }

  // Graceful shutdown handlers
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Initial scheduling check and system sync on startup
  async function initStartupSync() {
    try {
      log.info("Startup sync started");

      // 0. Start Trend Fetcher (Twitter/Mastodon/Bluesky trend collection cron)
      try {
        startTrendFetcher();
        log.success("Trend Fetcher started");
      } catch (trendErr) {
        log.warn(
          "Trend Fetcher start failed — trend enrichment will degrade gracefully",
        );
      }

      // 1. IndexNow Sync
      try {
        const { submitPendingArticlesToIndexNow } =
          await import("@/lib/seo/indexnow");
        const result = await submitPendingArticlesToIndexNow();
        if (result.count > 0)
          log.success(`IndexNow: ${result.count} articles submitted`);
      } catch (seoErr) {
        log.warn("IndexNow sync failed");
      }

      // 1.5 Google Indexing API — Startup'ta toplu bildirim devre dışı.
      // Her haber paylaşıldığında zaten tek tek bildiriliyor, startup sync kotayı gereksiz tüketiyor.
      // Manuel gerekirse: /api/indexing/batch endpoint'i kullanılabilir.
      // try {
      //   ... (disabled to preserve daily quota)
      // }

      // 1.6 GA4 → DB Views Sync — DEVRE DIŞI
      // Artık kendi view tracking sistemimiz (ArticleView + /api/articles/[id]/view) kullanılıyor.
      // GA4 sync Article.views değerlerini override ediyordu, bu yüzden kaldırıldı.

      // 2. Agent Schedule Check - Repeatable Job Setup
      const [enabledSetting, nextRunSetting] = await Promise.all([
        db.setting.findUnique({ where: { key: "agent.enabled" } }),
        db.setting.findUnique({ where: { key: "agent.nextRun" } }),
      ]);

      const isEnabled = enabledSetting
        ? enabledSetting.value !== "false"
        : true;

      if (isEnabled) {
        const { getNewsAgentQueue } = await import("@/lib/queue");
        const newsAgentQueue = getNewsAgentQueue();
        if (newsAgentQueue) {
          const repeatableJobs = await newsAgentQueue.getRepeatableJobs();
          const hasRepeatable = repeatableJobs.some(
            (j) => j.name === "scrape-and-publish",
          );
          const nextRunStr = nextRunSetting?.value;
          const missedRun = nextRunStr && new Date(nextRunStr) <= new Date();

          if (!hasRepeatable || missedRun) {
            if (missedRun) {
              log.warn("Missed job detected - running catchup");
              await newsAgentQueue.add(
                "scrape-and-publish",
                {},
                {
                  jobId: `immediate-catchup-${Date.now()}`,
                  removeOnComplete: true,
                },
              );
            }
            await scheduleNewsAgentJob();
            log.success("Repeatable job configured");
          } else {
            const setting = await db.setting.findUnique({
              where: { key: "agent.intervalHours" },
            });
            const intervalHours = setting ? parseFloat(setting.value) : 0.167;
            log.info(
              `Schedule: every ${intervalHours < 1 ? Math.round(intervalHours * 60) + "min" : intervalHours + "h"}, next: ${nextRunStr ? new Date(nextRunStr).toLocaleString() : "pending"}`,
            );
          }
        }
      } else {
        log.info("Agent disabled - skipping schedule");
      }
    } catch (err) {
      log.error("Startup sync failed", err);
    }
  }

  initStartupSync();

  // GA4 Periodic Sync — DEVRE DIŞI
  // Artık kendi view tracking sistemimiz kullanılıyor.
  // Article.views değerleri /api/articles/[id]/view endpoint'i tarafından artırılıyor.

  // NEWSLETTER WORKER - Daily at 19:00 Turkey Time
  const newsletterQueue = getNewsletterQueue();
  if (newsletterQueue) {
    log.info("Initializing Newsletter Worker");

    const newsletterWorker = new Worker(
      "newsletter",
      async (job) => {
        // OOM guard — don't process if Redis is under memory pressure
        const { isRedisMemoryFull } = await import("@/lib/redis");
        if (isRedisMemoryFull()) {
          console.warn("⏸️ Newsletter job deferred — Redis OOM");
          throw new Error("Redis OOM — job will retry with backoff");
        }

        log.job(job.id!, "newsletter", { manual: job.data?.manual || false });

        try {
          const result = await sendDailyDigest();

          log.summary("Newsletter", {
            articles: result.articlesCount,
            subscribers: result.subscribersCount,
            sent: result.sent,
            failed: result.failed,
            push: result.pushSent,
          });

          return result;
        } catch (error) {
          log.error("Newsletter job failed", error);
          throw error;
        }
      },
      {
        connection: redis!,
        concurrency: 1,
        lockDuration: 300000, // 5 minutes
      },
    );

    newsletterWorker.on("completed", (job, result) => {
      log.success(`Newsletter ${job.id}: ${result?.sent || 0} sent`);
    });

    newsletterWorker.on("failed", (job, error) => {
      if (error.message?.includes("Redis OOM")) return;
      log.error(`Newsletter ${job?.id} failed`, error);
    });

    scheduleNewsletterJob().then(() =>
      log.success("Newsletter scheduler ready"),
    );
    log.success("Newsletter worker started");
  } else {
    log.warn("Newsletter queue not available");
  }

  // SOCIAL BATCH WORKER - Background social media sharing
  const socialBatchQueue = getSocialBatchQueue();
  if (socialBatchQueue) {
    log.info("Initializing Social Batch Worker");

    // Platform posting functions map
    const platformPosters: Record<
      string,
      (article: any) => Promise<string | null>
    > = {
      FACEBOOK: postToFacebook,
      FACEBOOK_EN: postToFacebookEN,
      BLUESKY: postToBluesky,
      BLUESKY_EN: postToBlueskyEN,
      MASTODON: postToMastodon,
      MASTODON_EN: postToMastodonEN,
    };

    // Platform language mapping
    const platformLanguage: Record<string, string> = {
      FACEBOOK: "tr",
      FACEBOOK_EN: "en",
      BLUESKY: "tr",
      BLUESKY_EN: "en",
      MASTODON: "tr",
      MASTODON_EN: "en",
    };

    const safeParseJson = (value?: string) => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };

    const getAdaptiveFacebookInterval = (
      headers?: FacebookRateLimitHeaders,
    ): number | null => {
      if (!headers) return null;

      const xAppUsage = safeParseJson(headers.xAppUsage);
      const xBusinessUsage = safeParseJson(headers.xBusinessUseCaseUsage);

      const appUsageValues = [
        Number(xAppUsage?.call_count || 0),
        Number(xAppUsage?.total_time || 0),
        Number(xAppUsage?.total_cputime || 0),
      ];

      const businessUsageEntries = xBusinessUsage
        ? Object.values(xBusinessUsage).flatMap((entry: any) =>
            Array.isArray(entry) ? entry : [entry],
          )
        : [];

      const businessUsageValues = businessUsageEntries.flatMap((entry: any) => [
        Number(entry?.call_count || 0),
        Number(entry?.total_time || 0),
        Number(entry?.total_cputime || 0),
      ]);

      const peakUsage = Math.max(...appUsageValues, ...businessUsageValues, 0);

      let suggestedInterval = 30;
      if (peakUsage >= 95) suggestedInterval = 180;
      else if (peakUsage >= 90) suggestedInterval = 120;
      else if (peakUsage >= 80) suggestedInterval = 90;
      else if (peakUsage >= 70) suggestedInterval = 60;
      else if (peakUsage >= 60) suggestedInterval = 45;

      const retryAfter = Number(headers.retryAfter || 0);
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        suggestedInterval = Math.max(suggestedInterval, retryAfter);
      }

      return suggestedInterval;
    };

    const socialBatchWorker = new Worker(
      "social-batch",
      async (job) => {
        // OOM guard — don't process if Redis is under memory pressure
        const { isRedisMemoryFull } = await import("@/lib/redis");
        if (isRedisMemoryFull()) {
          console.warn("⏸️ Social batch job deferred — Redis OOM");
          throw new Error("Redis OOM — job will retry with backoff");
        }

        const { batchId, platforms, intervalSeconds, batchSize } = job.data;
        const articleIds = job.data.articleIds;

        log.job(job.id!, "social-batch", {
          batch: batchId,
          platforms: platforms.join(","),
          interval: `${intervalSeconds}s`,
          size: batchSize,
          targets: articleIds?.length || "all",
        });

        try {
          // Prepare where clause
          const whereClause: any = {
            status: "PUBLISHED",
          };

          // Filter by specific IDs if provided
          if (
            articleIds &&
            Array.isArray(articleIds) &&
            articleIds.length > 0
          ) {
            whereClause.id = { in: articleIds };
          }

          const allArticles = await db.article.findMany({
            where: whereClause,
            include: {
              category: true,
              translations: true,
            },
            orderBy: { publishedAt: "asc" },
            take: batchSize,
          });

          log.info(`Found ${allArticles.length} articles to process`);

          if (allArticles.length === 0) {
            await db.socialShareBatch.update({
              where: { id: batchId },
              data: {
                status: "COMPLETED",
                processedItems: 0,
                completedAt: new Date(),
              },
            });
            return { success: true, processed: 0, failed: 0 };
          }

          // Update batch status
          await db.socialShareBatch.update({
            where: { id: batchId },
            data: {
              status: "PROCESSING",
              startedAt: new Date(),
            },
          });

          let processed = 0;
          let failed = 0;
          let skipped = 0;
          let totalChecked = 0;
          let adaptiveIntervalSeconds = Math.max(intervalSeconds, 5);

          for (let i = 0; i < allArticles.length; i++) {
            // Check if job was cancelled
            const batch = await db.socialShareBatch.findUnique({
              where: { id: batchId },
            });
            if (batch?.status === "CANCELLED") {
              log.warn("Social batch cancelled by user");
              return {
                success: false,
                processed,
                failed,
                skipped,
                cancelled: true,
              };
            }

            const article = allArticles[i];
            const enTranslation = article.translations?.find(
              (t: any) => t.locale === "en",
            );

            // Get existing shares for this article
            // Include both SHARED and permanently FAILED (3+ retries) to avoid infinite retry loops
            const existingShares = await db.socialShare.findMany({
              where: {
                articleId: article.id,
                platform: { in: platforms as any[] },
                OR: [
                  { status: "SHARED" },
                  { status: "FAILED", retryCount: { gte: 3 } },
                ],
              },
            });

            const sharedPlatforms = new Set(
              existingShares.map((s) => `${s.platform}_${s.language}`),
            );

            // Determine which platforms need posting
            const platformsToPost: string[] = [];
            for (const platform of platforms) {
              const language = platformLanguage[platform] || "tr";
              const key = `${platform}_${language}`;
              if (sharedPlatforms.has(key)) {
                skipped++;
                continue;
              }
              const isEnglish = platform.endsWith("_EN");
              if (isEnglish && !enTranslation) {
                skipped++;
                continue;
              }
              platformsToPost.push(platform);
            }

            if (platformsToPost.length === 0) continue;

            // Post to all platforms in PARALLEL
            const postPromises = platformsToPost.map(async (platform) => {
              const isFacebookPlatform =
                platform === "FACEBOOK" || platform === "FACEBOOK_EN";
              const poster = isFacebookPlatform
                ? platform === "FACEBOOK"
                  ? postToFacebookWithMetadata
                  : postToFacebookENWithMetadata
                : platformPosters[platform];

              if (!poster)
                return { platform, success: false, error: "No poster" };

              const isEnglish = platform.endsWith("_EN");
              const language = isEnglish ? "en" : "tr";

              const postPayload: {
                title: string;
                slug: string;
                excerpt: string;
                imageUrl?: string | null;
                categoryName?: string;
              } =
                isEnglish && enTranslation
                  ? {
                      title: enTranslation.title,
                      slug: enTranslation.slug,
                      excerpt: enTranslation.excerpt ?? "",
                      imageUrl: article.imageUrl,
                      categoryName: article.category?.name ?? undefined,
                    }
                  : {
                      title: article.title,
                      slug: article.slug,
                      excerpt: article.excerpt ?? "",
                      imageUrl: article.imageUrl,
                      categoryName: article.category?.name ?? undefined,
                    };

              // Prepare article data
              try {
                const postResult = await poster(postPayload);
                const postId =
                  typeof postResult === "string" || postResult === null
                    ? postResult
                    : postResult.postId;
                const rateLimitHeaders =
                  typeof postResult === "object" && postResult
                    ? postResult.rateLimitHeaders
                    : undefined;

                if (postId) {
                  // Save successful share
                  await db.socialShare.upsert({
                    where: {
                      articleId_platform_language: {
                        articleId: article.id,
                        platform: platform as any,
                        language,
                      },
                    },
                    create: {
                      articleId: article.id,
                      platform: platform as any,
                      language,
                      status: "SHARED",
                      postId,
                      sharedAt: new Date(),
                    },
                    update: {
                      status: "SHARED",
                      postId,
                      sharedAt: new Date(),
                      error: null,
                    },
                  });
                  return { platform, success: true, postId, rateLimitHeaders };
                } else {
                  // Save failed share
                  await db.socialShare.upsert({
                    where: {
                      articleId_platform_language: {
                        articleId: article.id,
                        platform: platform as any,
                        language,
                      },
                    },
                    create: {
                      articleId: article.id,
                      platform: platform as any,
                      language,
                      status: "FAILED",
                      error: "No post ID returned",
                    },
                    update: {
                      status: "FAILED",
                      error: "No post ID returned",
                      retryCount: { increment: 1 },
                    },
                  });
                  return {
                    platform,
                    success: false,
                    error: "No post ID",
                    rateLimitHeaders,
                  };
                }
              } catch (error: any) {
                await db.socialShare.upsert({
                  where: {
                    articleId_platform_language: {
                      articleId: article.id,
                      platform: platform as any,
                      language,
                    },
                  },
                  create: {
                    articleId: article.id,
                    platform: platform as any,
                    language,
                    status: "FAILED",
                    error: error?.message || "Unknown error",
                  },
                  update: {
                    status: "FAILED",
                    error: error?.message || "Unknown error",
                    retryCount: { increment: 1 },
                  },
                });
                return { platform, success: false, error: error?.message };
              }
            });

            // Wait for all parallel posts to complete
            const results = await Promise.all(postPromises);

            // Count results
            for (const result of results) {
              totalChecked++;
              if (result.success) {
                processed++;
              } else {
                failed++;
              }
            }

            const facebookIntervals = results
              .filter(
                (result) =>
                  result.platform === "FACEBOOK" ||
                  result.platform === "FACEBOOK_EN",
              )
              .map((result) =>
                getAdaptiveFacebookInterval(result.rateLimitHeaders),
              )
              .filter((value): value is number => typeof value === "number");

            if (facebookIntervals.length > 0) {
              const nextAdaptiveInterval = Math.max(...facebookIntervals);
              if (nextAdaptiveInterval > adaptiveIntervalSeconds) {
                adaptiveIntervalSeconds = nextAdaptiveInterval;
                log.info(
                  `Facebook rate-limit adaptasyonu: interval ${adaptiveIntervalSeconds}s`,
                );
              }
            }

            // Update progress
            const progress = {
              processed,
              failed,
              skipped,
              totalChecked,
              currentArticle: i + 1,
              totalArticles: allArticles.length,
              adaptiveIntervalSeconds,
            };
            await job.updateProgress(progress);

            // Update batch in DB periodically
            await db.socialShareBatch.update({
              where: { id: batchId },
              data: {
                processedItems: processed,
                failedItems: failed,
                totalItems: totalChecked + skipped,
                intervalMinutes: adaptiveIntervalSeconds / 60,
              },
            });

            // Wait before next article (except for last one)
            if (i < allArticles.length - 1 && platformsToPost.length > 0) {
              await new Promise((resolve) =>
                setTimeout(resolve, adaptiveIntervalSeconds * 1000),
              );
            }
          }

          // Update batch as completed
          await db.socialShareBatch.update({
            where: { id: batchId },
            data: {
              status: "COMPLETED",
              processedItems: processed,
              failedItems: failed,
              totalItems: totalChecked + skipped,
              completedAt: new Date(),
            },
          });

          log.summary("Social Batch", {
            processed,
            failed,
            skipped,
            total: totalChecked + skipped,
          });

          return {
            success: true,
            processed,
            failed,
            skipped,
            total: totalChecked + skipped,
          };
        } catch (error) {
          log.error("Social batch job error", error);

          await db.socialShareBatch.update({
            where: { id: batchId },
            data: {
              status: "FAILED",
              completedAt: new Date(),
            },
          });

          throw error;
        }
      },
      {
        connection: redis!,
        concurrency: 1, // Only one batch at a time
        lockDuration: 3600000, // 60 minutes (increased for larger batches)
      },
    );

    socialBatchWorker.on("completed", (job, result) => {
      log.success(
        `Social batch ${job.id}: ${result?.processed || 0} shared, ${result?.failed || 0} failed`,
      );
    });

    socialBatchWorker.on("failed", (job, error) => {
      if (error.message?.includes("Redis OOM")) return;
      log.error(`Social batch ${job?.id} failed`, error);
    });

    socialBatchWorker.on("progress", (job, progress: any) => {
      log.info(
        `Batch ${progress.currentArticle}/${progress.totalArticles}: ${progress.processed} done, ${progress.failed} failed`,
      );
    });

    log.success("Social batch worker started");
  } else {
    log.warn("Social batch queue not available");
  }

  // Keep the process running
  process.stdin.resume();
}

// Global error handlers (don't crash)
process.on("unhandledRejection", (reason) => {
  log.error("Unhandled Rejection", reason);
});

process.on("uncaughtException", (error) => {
  log.error("Uncaught Exception", error);
  setTimeout(() => process.exit(1), 1000);
});

// Start initialization
initializeWorker().catch((error) => {
  log.error("Fatal initialization error", error);
  process.exit(1);
});
