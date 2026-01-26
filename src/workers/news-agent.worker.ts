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

    try {
      // Ensure DB connection is active (prevents "Closed" error after long idle)
      await (db as PrismaClient).$connect();

      // Execute the news agent
      const result = await executeNewsAgent();

      console.log("\n📊 Execution Summary:");
      console.log(`   Articles Scraped: ${result.articlesScraped}`);
      console.log(`   Articles Created: ${result.articlesCreated}`);
      console.log(`   Duration: ${result.duration}s`);
      console.log(`   Status: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);

      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.join(", ")}`);
      }

      // Schedule next execution
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
        } else {
          console.log(
            "\n⚠️  Could not schedule next execution (Queue not available)",
          );
        }
      } else {
        console.log(
          "\n⏸️  Agent is disabled in settings, skipping re-scheduling.",
        );
      }

      return result;
    } catch (error) {
      console.error("❌ Worker error:", error);
      throw error;
    }
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

// Initial scheduling check on startup
async function initStartupCheck() {
  try {
    const enabledSetting = await db.setting.findUnique({
      where: { key: "agent.enabled" },
    });
    const isEnabled = enabledSetting ? enabledSetting.value !== "false" : true;

    if (isEnabled) {
      console.log("🔍 Checking for scheduled jobs...");
      await scheduleNewsAgentJob();
    }
  } catch (err) {
    console.error("❌ Startup check failed:", err);
  }
}

initStartupCheck();

// Keep the process running
process.stdin.resume();
