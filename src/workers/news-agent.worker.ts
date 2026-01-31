/**
 * News Agent Worker - Background job processor
 * Run this with: npm run worker
 *
 * 🤖 AI AGENT ASSIGNMENT
 * Assigned Agent: @backend-specialist
 * Skills: nodejs-best-practices, performance-profiling, database-design, api-patterns
 * Documentation: See WORKER-AGENT-ASSIGNMENT.md for monitoring details
 *
 * The @backend-specialist agent automatically monitors this worker for:
 * - Performance issues (timeout, slow execution)
 * - Connection problems (Redis, PostgreSQL)
 * - Memory leaks and resource usage
 * - Job queue health and error patterns
 */

import { Worker } from "bullmq";
import { getRedis } from "@/lib/redis";
import { executeNewsAgent } from "@/services/agent.service";
import { scheduleNewsAgentJob } from "@/lib/queue";
import { db } from "@/lib/db";
import { PrismaClient } from "@prisma/client";
import { workerLogger } from "@/lib/logger";
import { trackWorkerError } from "@/lib/sentry";

workerLogger.start();
console.log("🚀 Starting News Agent Worker...");

const redis = getRedis();

if (!redis) {
  workerLogger.connection("redis", "failed");
  console.error("❌ Redis not available. Worker cannot start.");
  process.exit(1);
}

// Ensure Redis is connected before proceeding
async function ensureRedisConnection() {
  if (!redis) return false;

  try {
    console.log("🔍 Checking Redis connection...");

    // If lazyConnect was true, connect now
    if (redis.status === "wait") {
      console.log("🔄 Connecting to Redis...");
      await redis.connect();
    }

    // Test connection with ping
    const pong = await redis.ping();
    if (pong === "PONG") {
      console.log("✅ Redis connection verified (PONG received)");
      return true;
    }

    console.error("❌ Redis ping failed");
    return false;
  } catch (error) {
    console.error("❌ Redis connection check failed:", error);
    return false;
  }
}

// Test database connection before starting worker
async function testDatabaseConnection() {
  try {
    console.log("🔍 Testing database connection...");
    await (db as PrismaClient).$connect();
    await db.$queryRaw`SELECT 1`;
    workerLogger.connection("database", "connected");
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    workerLogger.connection("database", "failed");
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// Wait for database to be ready
async function waitForDatabase(maxRetries = 10, delayMs = 5000) {
  for (let i = 1; i <= maxRetries; i++) {
    console.log(`🔄 Database connection attempt ${i}/${maxRetries}...`);
    const isConnected = await testDatabaseConnection();

    if (isConnected) {
      return true;
    }

    if (i < maxRetries) {
      console.log(`⏳ Waiting ${delayMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error("❌ Failed to connect to database after all retries");
  return false;
}

// Initialize worker only after database is ready
async function initializeWorker() {
  // First check Redis connection
  const redisReady = await ensureRedisConnection();
  if (!redisReady) {
    console.error("❌ Cannot start worker without Redis connection");
    process.exit(1);
  }

  // Then check database
  const dbReady = await waitForDatabase();
  if (!dbReady) {
    console.error("❌ Cannot start worker without database connection");
    process.exit(1);
  }

  console.log("✅ All systems ready, starting worker...");

  // Start heartbeat to indicate worker is alive
  startHeartbeat();

  startWorker();
}

// Heartbeat function to indicate worker is alive
function startHeartbeat() {
  console.log("💓 Starting worker heartbeat...");

  const updateHeartbeat = async () => {
    try {
      if (redis) {
        await redis.set("worker:heartbeat", Date.now().toString(), "EX", 60);
        workerLogger.heartbeat();
        console.log(
          `💓 Heartbeat updated: ${new Date().toLocaleString("tr-TR")}`,
        );
      }
    } catch (error) {
      workerLogger.connection("redis", "failed");
      console.error("❌ Failed to update heartbeat:", error);
    }
  };

  // Update immediately
  updateHeartbeat();

  // Then update every 30 seconds
  setInterval(updateHeartbeat, 30000);
}

function startWorker() {
  console.log("\n🎯 Initializing BullMQ Worker...");
  console.log(`   Queue Name: news-agent`);
  console.log(`   Redis Status: ${redis!.status}`);
  console.log(`   Concurrency: 1`);
  console.log(`   Lock Duration: 10 minutes`);

  // Create worker
  const worker = new Worker(
    "news-agent",
    async (job) => {
      workerLogger.jobStart(job.id!, job.name);

      console.log(`\n${"=".repeat(60)}`);
      console.log(`🤖 Processing job: ${job.name} (ID: ${job.id})`);
      console.log(`   Priority: ${job.opts.priority || "default"}`);
      console.log(
        `   Attempt: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`,
      );
      console.log(`   Timestamp: ${new Date(job.timestamp).toLocaleString()}`);
      console.log(`${"=".repeat(60)}\n`);

      let result;
      try {
        // Ensure DB connection is active (prevents "Closed" error after long idle)
        await (db as PrismaClient).$connect();

        // Update job progress to prevent stalling
        await job.updateProgress(10);
        console.log("📊 Progress: 10% - Starting agent execution...");

        // Execute the news agent with timeout protection
        const AGENT_TIMEOUT = 18 * 60 * 1000; // 18 minutes (increased from 15min)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Agent execution timeout (18 minutes)")),
            AGENT_TIMEOUT,
          );
        });

        // Progress update interval (every 2 minutes)
        const progressInterval = setInterval(
          async () => {
            try {
              const currentProgress = (await job.progress) as number;
              if (currentProgress < 80) {
                await job.updateProgress(Math.min(currentProgress + 10, 80));
                console.log(
                  `📊Progress: ${Math.min(currentProgress + 10, 80)}% - Agent still running...`,
                );
              }
            } catch (err) {
              console.warn("⚠️ Progress update failed:", err);
            }
          },
          2 * 60 * 1000,
        ); // Every 2 minutes

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
        console.log("📊 Progress: 90% - Agent execution completed");

        workerLogger.jobComplete(job.id!, result);

        console.log("\n📊 Execution Summary:");
        console.log(`   Articles Scraped: ${result.articlesScraped}`);
        console.log(`   Articles Created: ${result.articlesCreated}`);
        console.log(`   Duration: ${result.duration}s`);
        console.log(
          `   Status: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`,
        );

        if (result.errors.length > 0) {
          console.log(`   Errors: ${result.errors.join(", ")}`);
        }
      } catch (error) {
        workerLogger.jobFailed(job.id!, error as Error);
        trackWorkerError(job.id!, error as Error, {
          jobName: job.name,
          attempt: job.attemptsMade,
        });

        console.error("❌ Agent execution error:", error);
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
        // CRITICAL: Disconnect after each job to prevent connection leaks
        try {
          await (db as PrismaClient).$disconnect();
          console.log("🔌 Database connection closed");
        } catch (disconnectError) {
          console.error(
            "⚠️ Error disconnecting from database:",
            disconnectError,
          );
        }
        // Repeatable jobs auto-reschedule - no manual scheduling needed
        // Just log next execution info
        try {
          const enabledSetting = await db.setting.findUnique({
            where: { key: "agent.enabled" },
          });
          const isEnabled = enabledSetting
            ? enabledSetting.value !== "false"
            : true;

          if (isEnabled) {
            // Get next run time from settings (updated by repeatable job system)
            const nextRunSetting = await db.setting.findUnique({
              where: { key: "agent.nextRun" },
            });
            if (nextRunSetting) {
              console.log(
                `\n⏰ Next execution (repeatable): ${new Date(nextRunSetting.value).toLocaleString()}`,
              );
            }
          }
        } catch (schedErr) {
          console.error("❌ Failed to get next execution time:", schedErr);
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
      lockDuration: 1200000, // Lock job for 20 minutes (1200000ms) - increased from 10min
      maxStalledCount: 2, // Allow 2 stalls before failing
      stalledInterval: 60000, // Check for stalled jobs every 60 seconds
    },
  );

  // Worker event handlers
  worker.on("ready", () => {
    console.log("\n✅ Worker is ready and listening for jobs");
  });

  worker.on("active", (job) => {
    console.log(`\n🔄 Job ${job.id} is now active`);
  });

  worker.on("completed", (job) => {
    console.log(`\n✅ Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`\n❌ Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    // Suppress NOAUTH errors (Redis info command may require auth but worker still functions)
    if (err.message && err.message.includes("NOAUTH")) {
      // Silent - not critical, worker continues to function
      return;
    }
    console.error("❌ Worker error:", err);
  });

  worker.on("stalled", (jobId) => {
    console.warn(`⚠️ Job ${jobId} has stalled`);
  });

  console.log("\n✅ Worker started successfully!");
  console.log("👂 Listening for jobs on queue: news-agent");
  console.log("📊 Worker stats will be logged here...\n");

  // Worker closing event
  worker.on("closing", async () => {
    console.log("🔄 Worker closing, disconnecting from database...");
    try {
      await (db as PrismaClient).$disconnect();
    } catch (error) {
      console.error("⚠️ Error disconnecting during worker close:", error);
    }
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("\n🛑 SIGTERM received, closing worker...");
    await worker.close();
    await (db as PrismaClient).$disconnect();
    await redis!.quit();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("\n🛑 SIGINT received, closing worker...");
    await worker.close();
    await (db as PrismaClient).$disconnect();
    await redis!.quit();
    process.exit(0);
  });

  // Initial scheduling check and system sync on startup
  async function initStartupSync() {
    try {
      console.log("\n🔄 Başlangıç senkronizasyonu başlatılıyor...");

      // 1. IndexNow Senkronizasyonu (Gönderilmemiş haberler)
      try {
        const { submitPendingArticlesToIndexNow } =
          await import("@/lib/seo/indexnow");
        const result = await submitPendingArticlesToIndexNow();
        if (result.count > 0) {
          console.log(
            `✅ ${result.count} bekleyen haber IndexNow'a bildirildi.`,
          );
        } else {
          console.log("ℹ️ IndexNow için bekleyen haber bulunmadı.");
        }
      } catch (seoErr) {
        console.error("⚠️ SEO senkronizasyon hatası:", seoErr);
      }

      // 2. Agent İş Takvimi Kontrolü - Repeatable Job Setup
      const [enabledSetting, nextRunSetting] = await Promise.all([
        db.setting.findUnique({ where: { key: "agent.enabled" } }),
        db.setting.findUnique({ where: { key: "agent.nextRun" } }),
      ]);

      const isEnabled = enabledSetting
        ? enabledSetting.value !== "false"
        : true;

      if (isEnabled) {
        console.log("🔧 Repeatable job sistemi başlatılıyor...");

        const { newsAgentQueue } = await import("@/lib/queue");
        if (newsAgentQueue) {
          // Check if repeatable job already exists
          const repeatableJobs = await newsAgentQueue.getRepeatableJobs();
          const hasRepeatable = repeatableJobs.some(
            (j) => j.name === "scrape-and-publish",
          );

          // Check if there's a missed run
          const nextRunStr = nextRunSetting?.value;
          const now = new Date();
          const missedRun =
            nextRunStr && new Date(nextRunStr) <= now ? true : false;

          if (!hasRepeatable || missedRun) {
            if (missedRun) {
              console.log(
                "⚡ Gecikmiş iş tespiti! Önce hemen bir iş çalıştırılacak...",
              );

              // Run immediately first (one-time job)
              await newsAgentQueue.add(
                "scrape-and-publish",
                {},
                {
                  jobId: `immediate-catchup-${Date.now()}`,
                  removeOnComplete: true,
                },
              );

              console.log("✅ Acil iş kuyruğa eklendi.");
            }

            // Setup repeatable job for future runs
            console.log("📅 Repeatable job kuruluyor...");
            await scheduleNewsAgentJob();
            console.log("✅ Repeatable job başarıyla kuruldu.");
          } else {
            // Repeatable job exists, just log next run
            const setting = await db.setting.findUnique({
              where: { key: "agent.intervalHours" },
            });
            const intervalHours = setting ? parseFloat(setting.value) : 6;
            console.log(
              `✅ Repeatable job mevcut (her ${intervalHours} saatte bir).`,
            );
            if (nextRunStr) {
              console.log(
                `📅 Sıradaki çalışma zamanı: ${new Date(nextRunStr).toLocaleString()}`,
              );
            }
          }
        }
      } else {
        console.log("⏸️ Agent devre dışı, takvim kontrolü atlandı.");
      }
    } catch (err) {
      console.error("❌ Başlangıç senkronizasyonunda kritik hata:", err);
    }
  }

  initStartupSync();

  // Keep the process running
  process.stdin.resume();
}

// Global error handlers to prevent crashes
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise);
  console.error("❌ Reason:", reason);
  // Don't exit - log and continue
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  // Don't exit immediately - give time to log
  setTimeout(() => {
    console.error("❌ Exiting due to uncaught exception");
    process.exit(1);
  }, 1000);
});

// Start initialization
initializeWorker().catch((error) => {
  console.error("❌ Fatal error during initialization:", error);
  process.exit(1);
});
