/**
 * News Agent Worker - Background job processor
 * Run this with: npm run worker
 */

import { Worker } from "bullmq";
import { getRedis } from "@/lib/redis";
import { executeNewsAgent } from "@/services/agent.service";
import { scheduleNewsAgentJob } from "@/lib/queue";
import { db } from "@/lib/db";
import { PrismaClient } from "@prisma/client";

console.log("🚀 Starting News Agent Worker...");

const redis = getRedis();

if (!redis) {
  console.error("❌ Redis not available. Worker cannot start.");
  process.exit(1);
}

// Ensure Redis is connected before proceeding
async function ensureRedisConnection() {
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
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
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
  startWorker();
}

function startWorker() {
  console.log("\n🎯 Initializing BullMQ Worker...");
  console.log(`   Queue Name: news-agent`);
  console.log(`   Redis Status: ${redis.status}`);
  console.log(`   Concurrency: 1`);
  console.log(`   Lock Duration: 10 minutes`);

  // Create worker
  const worker = new Worker(
    "news-agent",
    async (job) => {
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

        // Execute the news agent
        result = await executeNewsAgent();

        // Mark as nearly complete
        await job.updateProgress(90);

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
        console.error("❌ Agent execution error:", error);
        // Even if failed, we should try to schedule next
      } finally {
        // Always attempt to schedule next execution
        try {
          const enabledSetting = await db.setting.findUnique({
            where: { key: "agent.enabled" },
          });
          const isEnabled = enabledSetting
            ? enabledSetting.value !== "false"
            : true;

          if (isEnabled) {
            // Check if there is already a delayed job to avoid duplicate scheduling
            const { newsAgentQueue } = await import("@/lib/queue");
            if (newsAgentQueue) {
              const delayedJobs = await newsAgentQueue.getJobs(["delayed"]);
              const existingJob = delayedJobs.find(
                (j) => j.id === "news-agent-scheduled-run",
              );

              if (!existingJob) {
                const nextExecution = await scheduleNewsAgentJob();
                if (nextExecution) {
                  console.log(
                    `\n⏰ Next execution: ${nextExecution.nextExecutionTime.toLocaleString()}`,
                  );
                }
              } else {
                console.log(
                  `\n⏰ Next execution already scheduled for: ${new Date(existingJob.timestamp + (existingJob.opts.delay || 0)).toLocaleString()}`,
                );
              }
            }
          }
        } catch (schedErr) {
          console.error("❌ Failed to schedule next job:", schedErr);
        }
      }

      return result;
    },
    {
      connection: redis,
      concurrency: 1, // Process one job at a time
      limiter: {
        max: 1,
        duration: 1000, // Max 1 job per second
      },
      settings: {
        stalledInterval: 60000, // Check for stalled jobs every 60 seconds
        maxStalledCount: 2, // Allow 2 stalls before failing
        lockDuration: 600000, // Lock job for 10 minutes (600000ms)
      },
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
    console.error("❌ Worker error:", err);
  });

  worker.on("stalled", (jobId) => {
    console.warn(`⚠️ Job ${jobId} has stalled`);
  });

  console.log("\n✅ Worker started successfully!");
  console.log("👂 Listening for jobs on queue: news-agent");
  console.log("📊 Worker stats will be logged here...\n");

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("\n🛑 SIGTERM received, closing worker...");
    await worker.close();
    await redis.quit();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("\n🛑 SIGINT received, closing worker...");
    await worker.close();
    await redis.quit();
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

      // 2. Agent İş Takvimi Kontrolü
      const [enabledSetting, nextRunSetting] = await Promise.all([
        db.setting.findUnique({ where: { key: "agent.enabled" } }),
        db.setting.findUnique({ where: { key: "agent.nextRun" } }),
      ]);

      const isEnabled = enabledSetting
        ? enabledSetting.value !== "false"
        : true;

      if (isEnabled) {
        const nextRunStr = nextRunSetting?.value;
        const now = new Date();

        // Eğer planlanan zaman geçmişse veya hiç planlanmamışsa hemen çalıştır
        // Ancak çok yakın zamanda (örn. son 1 saat içinde) çalışmışsa ve bir hata yüzünden nextRun güncellenmemişse,
        // sonsuz döngüye girmemek için son loglara bakmak gerekebilir.
        // Şimdilik basit mantık: nextRun geçmişse çalıştır.
        if (!nextRunStr || new Date(nextRunStr) <= now) {
          console.log(
            "⚡ Gecikmiş veya eksik iş tespiti. Agent hemen başlatılıyor...",
          );

          // Mevcut kuyruk işlerini temizle (jobId çakışmasını önlemek için)
          const { newsAgentQueue } = await import("@/lib/queue");
          if (newsAgentQueue) {
            const jobs = await newsAgentQueue.getJobs([
              "delayed",
              "waiting",
              "active",
            ]); // Active'i de kontrol et
            for (const job of jobs) {
              if (job.id === "news-agent-scheduled-run") {
                await job.remove();
              }
            }

            // Bekletmeden ekle (Delay: 0)
            await newsAgentQueue.add(
              "scrape-and-publish",
              {},
              {
                jobId: "news-agent-scheduled-run",
                removeOnComplete: true,
              },
            );

            console.log("✅ Acil iş kuyruğa eklendi.");
          }
        } else {
          console.log(
            `📅 Sıradaki çalışma zamanı: ${new Date(nextRunStr).toLocaleString()}`,
          );
          // Normal planlama yap (zaten varsa BullMQ jobId sayesinde eklemez)
          // Ancak burada önemli nokta: scheduleNewsAgentJob mevcut ayara göre (örn 6 saat sonraya) atar.
          // Eğer DB'deki nextRun ile BullMQ'daki delay uyumsuzsa sorun olabilir.
          // En doğrusu: BullMQ'da iş var mı bak, yoksa nextRun'a göre (veya hemen) planla.

          const { newsAgentQueue } = await import("@/lib/queue");
          if (newsAgentQueue) {
            const jobs = await newsAgentQueue.getJobs([
              "delayed",
              "waiting",
              "active",
            ]);
            const existing = jobs.find(
              (j) => j.id === "news-agent-scheduled-run",
            );

            if (!existing) {
              console.log(
                "⚠️ BullMQ'da iş bulunamadı ama DB'de nextRun var. Tekrar planlanıyor...",
              );
              // DB'deki süreye kadar beklemek yerine, standart döngüyü (interval) başlatmak daha güvenli
              await scheduleNewsAgentJob();
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

// Start initialization
initializeWorker().catch((error) => {
  console.error("❌ Fatal error during initialization:", error);
  process.exit(1);
});
