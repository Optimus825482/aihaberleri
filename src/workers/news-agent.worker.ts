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

// Create worker
const worker = new Worker(
  "news-agent",
  async (job) => {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🤖 Processing job: ${job.name} (ID: ${job.id})`);
    console.log(`${"=".repeat(60)}\n`);

    let result;
    try {
      // Ensure DB connection is active (prevents "Closed" error after long idle)
      await (db as PrismaClient).$connect();

      // Execute the news agent
      result = await executeNewsAgent();

      console.log("\n📊 Execution Summary:");
      console.log(`   Articles Scraped: ${result.articlesScraped}`);
      console.log(`   Articles Created: ${result.articlesCreated}`);
      console.log(`   Duration: ${result.duration}s`);
      console.log(`   Status: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);

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
          const nextExecution = await scheduleNewsAgentJob();
          if (nextExecution) {
            console.log(
              `\n⏰ Next execution: ${nextExecution.nextExecutionTime.toLocaleString()}`,
            );
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
  },
);

// Worker event handlers
worker.on("completed", (job) => {
  console.log(`\n✅ Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`\n❌ Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("❌ Worker error:", err);
});

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
        console.log(`✅ ${result.count} bekleyen haber IndexNow'a bildirildi.`);
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

    const isEnabled = enabledSetting ? enabledSetting.value !== "false" : true;

    if (isEnabled) {
      const nextRunStr = nextRunSetting?.value;
      const now = new Date();

      // Eğer planlanan zaman geçmişse veya hiç planlanmamışsa hemen çalıştır
      if (!nextRunStr || new Date(nextRunStr) <= now) {
        console.log(
          "⚡ Gecikmiş veya eksik iş tespiti. Agent hemen başlatılıyor...",
        );

        // Mevcut kuyruk işlerini temizle (jobId çakışmasını önlemek için)
        const { newsAgentQueue } = await import("@/lib/queue");
        if (newsAgentQueue) {
          const jobs = await newsAgentQueue.getJobs(["delayed", "waiting"]);
          for (const job of jobs) {
            if (job.id === "news-agent-scheduled-run") {
              await job.remove();
            }
          }

          // Bekletmeden ekle
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
        await scheduleNewsAgentJob();
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
