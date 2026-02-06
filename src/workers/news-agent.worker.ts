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
import {
  scheduleNewsAgentJob,
  scheduleNewsletterJob,
  getNewsletterQueue,
  getSocialBatchQueue,
} from "@/lib/queue";
import { sendDailyDigest } from "@/services/newsletter.service";
import { postToFacebook, postToFacebookEN } from "@/lib/social/facebook";
import { postToBluesky, postToBlueskyEN } from "@/lib/social/bluesky";
import { postToMastodon, postToMastodonEN } from "@/lib/social/mastodon";
import { postToTumblr, postToTumblrEN } from "@/lib/social/tumblr";
import { db } from "@/lib/db";
import { PrismaClient } from "@prisma/client";
import { workerLogger } from "@/lib/logger";
import { trackWorkerError } from "@/lib/sentry";

// Multi-agent pipeline imports
import { initializeQueues } from "@/lib/queue-manager";
import { RelevanceFilterAgent } from "@/agents/relevance-filter.agent";
import { DuplicateDetectorAgent } from "@/agents/duplicate-detector.agent";
import { ContentEnricherAgent } from "@/agents/content-enricher.agent";
import { VisualGeneratorAgent } from "@/agents/visual-generator.agent";
import { DatabasePublisherAgent } from "@/agents/database-publisher.agent";

// Multi-agent pipeline instances
let relevanceFilter: RelevanceFilterAgent;
let duplicateDetector: DuplicateDetectorAgent;
let contentEnricher: ContentEnricherAgent;
let visualGenerator: VisualGeneratorAgent;
let databasePublisher: DatabasePublisherAgent;

/**
 * Initialize multi-agent pipeline agents
 */
async function initializeMultiAgentPipeline(): Promise<void> {
  console.log("🤖 Initializing multi-agent pipeline agents...");

  try {
    // Initialize queue manager first
    console.log("   📦 Initializing queue manager...");
    await initializeQueues();
    console.log("   ✅ Queue manager initialized");

    // Create and start all agents
    console.log("   🔧 Creating agent instances...");
    relevanceFilter = new RelevanceFilterAgent();
    duplicateDetector = new DuplicateDetectorAgent();
    contentEnricher = new ContentEnricherAgent();
    visualGenerator = new VisualGeneratorAgent();
    databasePublisher = new DatabasePublisherAgent();
    console.log("   ✅ Agent instances created");

    console.log("   🚀 Starting all agents...");
    await Promise.all([
      relevanceFilter
        .start()
        .then(() => console.log("   ✅ RelevanceFilter started")),
      duplicateDetector
        .start()
        .then(() => console.log("   ✅ DuplicateDetector started")),
      contentEnricher
        .start()
        .then(() => console.log("   ✅ ContentEnricher started")),
      visualGenerator
        .start()
        .then(() => console.log("   ✅ VisualGenerator started")),
      databasePublisher
        .start()
        .then(() => console.log("   ✅ DatabasePublisher started")),
    ]);

    console.log("✅ Multi-agent pipeline (5 agents) started successfully");
  } catch (error) {
    console.error("❌ Failed to initialize multi-agent pipeline:");
    console.error(
      "   Error:",
      error instanceof Error ? error.message : String(error),
    );
    if (error instanceof Error && error.stack) {
      console.error(
        "   Stack:",
        error.stack.split("\n").slice(0, 5).join("\n"),
      );
    }
    throw error;
  }
}

/**
 * Stop multi-agent pipeline agents
 */
async function stopMultiAgentPipeline(): Promise<void> {
  console.log("🛑 Stopping multi-agent pipeline agents...");

  await Promise.all([
    relevanceFilter?.stop(),
    duplicateDetector?.stop(),
    contentEnricher?.stop(),
    visualGenerator?.stop(),
    databasePublisher?.stop(),
  ]);

  console.log("✅ Multi-agent pipeline stopped");
}

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

  // CRITICAL: await startWorker to ensure multi-agent pipeline is initialized
  await startWorker();
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

async function startWorker() {
  console.log("\n🎯 Initializing BullMQ Worker...");
  console.log(`   Queue Name: news-agent`);
  console.log(`   Redis Status: ${redis!.status}`);
  console.log(`   Concurrency: 1`);
  console.log(`   Lock Duration: 10 minutes`);

  // Initialize multi-agent pipeline agents BEFORE creating worker
  // CRITICAL: Must await to ensure agents are ready before processing jobs
  let pipelineReady = false;
  try {
    await initializeMultiAgentPipeline();
    console.log("✅ Multi-agent pipeline ready");
    pipelineReady = true;
  } catch (error) {
    console.error("❌ Multi-agent pipeline initialization failed:");
    console.error("   Error:", error instanceof Error ? error.message : error);
    console.error("   Stack:", error instanceof Error ? error.stack : "N/A");
    console.error("⚠️ Pipeline agents will not process articles!");
    console.error("⚠️ Articles will be added to queue but NOT processed!");
    // Don't exit - main worker can still run for other tasks
  }

  // Log pipeline status
  console.log(
    `\n📊 Pipeline Status: ${pipelineReady ? "✅ READY" : "❌ NOT READY"}`,
  );

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
    await stopMultiAgentPipeline();
    await worker.close();
    await (db as PrismaClient).$disconnect();
    await redis!.quit();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("\n🛑 SIGINT received, closing worker...");
    await stopMultiAgentPipeline();
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

      // 1.5 Google Indexing API Senkronizasyonu (PENDING olan haberler - günlük limit: 200)
      try {
        const { notifyGoogleBatchWithLimit, getRemainingDailyQuota } =
          await import("@/lib/seo/google-indexing-api");

        // Önce kalan kotayı kontrol et
        const remainingQuota = await getRemainingDailyQuota();

        if (remainingQuota === 0) {
          console.log("⚠️ Günlük Google Indexing limiti doldu, atlanıyor.");
        } else {
          const baseUrl =
            process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

          // PENDING olan haberleri bul (sadece bugünkü - günlük limitten tasarruf için)
          const pendingArticles = await db.article.findMany({
            where: {
              googleIndexStatus: "PENDING",
              status: "PUBLISHED",
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Son 24 saat
            },
            select: { id: true, slug: true },
            take: Math.min(remainingQuota, 50), // Kota veya 50, hangisi küçükse
          });

          if (pendingArticles.length > 0) {
            const urls = pendingArticles.map((a) => ({
              url: `${baseUrl}/news/${a.slug}`,
              type: "URL_UPDATED" as const,
            }));

            const result = await notifyGoogleBatchWithLimit(urls);

            if (result.successCount > 0) {
              // Başarılı olanları güncelle
              const successfulSlugs = result.results
                .filter((r: any) => r.success)
                .map((r: any) => r.url.replace(`${baseUrl}/news/`, ""));

              await db.article.updateMany({
                where: { slug: { in: successfulSlugs } },
                data: {
                  googleIndexStatus: "SUBMITTED",
                  googleIndexedAt: new Date(),
                },
              });

              console.log(
                `✅ ${result.successCount} haber Google Indexing API'ye bildirildi. Kalan kota: ${result.remainingQuota}`,
              );
            }

            if (result.failCount > 0) {
              console.log(
                `⚠️ ${result.failCount} haber Google'a bildirilemedi.`,
              );
            }

            if (result.skipped > 0) {
              console.log(
                `⏭️ ${result.skipped} haber limit nedeniyle atlandı.`,
              );
            }
          } else {
            console.log("ℹ️ Google Indexing için bekleyen haber bulunmadı.");
          }
        }
      } catch (googleErr) {
        console.error("⚠️ Google Indexing senkronizasyon hatası:", googleErr);
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

  // =====================================================
  // NEWSLETTER WORKER - Daily at 19:00 Turkey Time
  // =====================================================
  const newsletterQueue = getNewsletterQueue();
  if (newsletterQueue) {
    console.log("\n📧 Initializing Newsletter Worker...");

    const newsletterWorker = new Worker(
      "newsletter",
      async (job) => {
        console.log(`\n${"=".repeat(60)}`);
        console.log(
          `📧 Processing newsletter job: ${job.name} (ID: ${job.id})`,
        );
        console.log(`   Manual: ${job.data?.manual ? "Yes" : "No"}`);
        console.log(
          `   Timestamp: ${new Date(job.timestamp).toLocaleString("tr-TR")}`,
        );
        console.log(`${"=".repeat(60)}\n`);

        try {
          const result = await sendDailyDigest();

          console.log(`\n📧 Newsletter result:`);
          console.log(`   Articles: ${result.articlesCount}`);
          console.log(`   Subscribers: ${result.subscribersCount}`);
          console.log(`   Sent: ${result.sent}`);
          console.log(`   Failed: ${result.failed}`);
          console.log(`   Push sent: ${result.pushSent}`);

          return result;
        } catch (error) {
          console.error("❌ Newsletter job failed:", error);
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
      console.log(
        `✅ Newsletter job ${job.id} completed: ${result?.sent || 0} emails sent`,
      );
    });

    newsletterWorker.on("failed", (job, error) => {
      console.error(`❌ Newsletter job ${job?.id} failed:`, error.message);
    });

    // Schedule daily newsletter
    scheduleNewsletterJob().then(() => {
      console.log("✅ Newsletter scheduler initialized");
    });

    console.log("✅ Newsletter worker started");
  } else {
    console.warn("⚠️ Newsletter queue not available");
  }

  // =====================================================
  // SOCIAL BATCH WORKER - Background social media sharing
  // =====================================================
  // NEW: Improved parallel posting system
  // - Checks each platform-language combination separately
  // - Posts TR and EN simultaneously for Bluesky, Tumblr, Mastodon
  // - 10 second interval between articles (not between posts)
  // - Processes all platforms in parallel per article
  const socialBatchQueue = getSocialBatchQueue();
  if (socialBatchQueue) {
    console.log("\n📤 Initializing Social Batch Worker...");

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
      TUMBLR: postToTumblr,
      TUMBLR_EN: postToTumblrEN,
    };

    // Platform language mapping
    const platformLanguage: Record<string, string> = {
      FACEBOOK: "tr",
      FACEBOOK_EN: "en",
      BLUESKY: "tr",
      BLUESKY_EN: "en",
      MASTODON: "tr",
      MASTODON_EN: "en",
      TUMBLR: "tr",
      TUMBLR_EN: "en",
    };

    const socialBatchWorker = new Worker(
      "social-batch",
      async (job) => {
        const { batchId, platforms, intervalSeconds, batchSize } = job.data;

        console.log(`\n${"=".repeat(60)}`);
        console.log(`📤 Processing social batch job: ${job.id}`);
        console.log(`   Batch ID: ${batchId}`);
        console.log(`   Platforms: ${platforms.join(", ")}`);
        console.log(`   Interval: ${intervalSeconds} seconds`);
        console.log(`   Batch Size: ${batchSize}`);
        console.log(`${"=".repeat(60)}\n`);

        try {
          // Get ALL published articles ordered by date (oldest first to share chronologically)
          const allArticles = await db.article.findMany({
            where: {
              status: "PUBLISHED",
            },
            include: {
              category: true,
              translations: true,
            },
            orderBy: { publishedAt: "asc" }, // Start from oldest
            take: batchSize,
          });

          console.log(
            `📰 Found ${allArticles.length} published articles to check`,
          );

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

          for (let i = 0; i < allArticles.length; i++) {
            // Check if job was cancelled
            const batch = await db.socialShareBatch.findUnique({
              where: { id: batchId },
            });
            if (batch?.status === "CANCELLED") {
              console.log("🛑 Batch cancelled by user");
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
              (t: any) => t.language === "en",
            );

            console.log(
              `\n📰 [${i + 1}/${allArticles.length}] ${article.title}`,
            );

            // Get existing shares for this article
            const existingShares = await db.socialShare.findMany({
              where: {
                articleId: article.id,
                platform: { in: platforms as any[] },
                status: "SHARED",
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

              // Skip if already shared
              if (sharedPlatforms.has(key)) {
                console.log(
                  `   ✓ ${platform} (${language}) - zaten paylaşıldı`,
                );
                skipped++;
                continue;
              }

              // For EN platforms, check if translation exists
              const isEnglish = platform.endsWith("_EN");
              if (isEnglish && !enTranslation) {
                console.log(
                  `   ⚠️ ${platform} - İngilizce çeviri yok, atlanıyor`,
                );
                skipped++;
                continue;
              }

              platformsToPost.push(platform);
            }

            if (platformsToPost.length === 0) {
              console.log(`   ✓ Tüm platformlarda zaten paylaşıldı`);
              continue;
            }

            console.log(
              `   📤 Paylaşılacak platformlar: ${platformsToPost.join(", ")}`,
            );

            // Post to all platforms in PARALLEL
            const postPromises = platformsToPost.map(async (platform) => {
              const poster = platformPosters[platform];
              if (!poster) {
                console.log(`   ⚠️ No poster for platform: ${platform}`);
                return { platform, success: false, error: "No poster" };
              }

              const isEnglish = platform.endsWith("_EN");
              const language = isEnglish ? "en" : "tr";

              // Prepare article data
              const articleData =
                isEnglish && enTranslation
                  ? {
                      title: enTranslation.title,
                      slug: enTranslation.slug,
                      excerpt: enTranslation.excerpt,
                      imageUrl: article.imageUrl,
                      categoryName: article.category?.name,
                    }
                  : {
                      title: article.title,
                      slug: article.slug,
                      excerpt: article.excerpt,
                      imageUrl: article.imageUrl,
                      categoryName: article.category?.name,
                    };

              try {
                console.log(`   📤 Posting to ${platform} (${language})...`);
                const postId = await poster(articleData);

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
                  console.log(`   ✅ ${platform}: ${postId}`);
                  return { platform, success: true, postId };
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
                  console.log(`   ❌ ${platform}: No post ID`);
                  return { platform, success: false, error: "No post ID" };
                }
              } catch (error: any) {
                console.error(`   ❌ ${platform} error:`, error?.message);
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

            // Update progress
            const progress = {
              processed,
              failed,
              skipped,
              totalChecked,
              currentArticle: i + 1,
              totalArticles: allArticles.length,
            };
            await job.updateProgress(progress);

            // Update batch in DB periodically
            await db.socialShareBatch.update({
              where: { id: batchId },
              data: {
                processedItems: processed,
                failedItems: failed,
                totalItems: totalChecked + skipped,
              },
            });

            // Wait before next article (except for last one)
            if (i < allArticles.length - 1 && platformsToPost.length > 0) {
              console.log(
                `   ⏳ Waiting ${intervalSeconds} seconds before next article...`,
              );
              await new Promise((resolve) =>
                setTimeout(resolve, intervalSeconds * 1000),
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

          console.log(`\n📊 Social Batch Summary:`);
          console.log(`   ✅ Processed: ${processed}`);
          console.log(`   ❌ Failed: ${failed}`);
          console.log(`   ⏭️ Skipped (already shared): ${skipped}`);
          console.log(`   📊 Total Checked: ${totalChecked + skipped}`);

          return {
            success: true,
            processed,
            failed,
            skipped,
            total: totalChecked + skipped,
          };
        } catch (error) {
          console.error("❌ Social batch job error:", error);

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
      console.log(
        `✅ Social batch ${job.id} completed: ${result?.processed || 0} shared, ${result?.failed || 0} failed, ${result?.skipped || 0} skipped`,
      );
    });

    socialBatchWorker.on("failed", (job, error) => {
      console.error(`❌ Social batch ${job?.id} failed:`, error.message);
    });

    socialBatchWorker.on("progress", (job, progress: any) => {
      console.log(
        `📊 Batch progress: Article ${progress.currentArticle}/${progress.totalArticles}, Posts: ${progress.processed} done, ${progress.failed} failed, ${progress.skipped} skipped`,
      );
    });

    console.log("✅ Social batch worker started");
  } else {
    console.warn("⚠️ Social batch queue not available");
  }

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
