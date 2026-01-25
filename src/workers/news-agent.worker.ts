/**
 * News Agent Worker - Background job processor
 * Run this with: npm run worker
 */

import { Worker } from "bullmq";
import redis from "@/lib/redis";
import { executeNewsAgent } from "@/services/agent.service";
import { scheduleNewsAgentJob } from "@/lib/queue";

console.log("🚀 Starting News Agent Worker...");

// Create worker
const worker = new Worker(
  "news-agent",
  async (job) => {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🤖 Processing job: ${job.name} (ID: ${job.id})`);
    console.log(`${"=".repeat(60)}\n`);

    try {
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
      if (process.env.AGENT_ENABLED !== "false") {
        const nextExecution = await scheduleNewsAgentJob();
        console.log(
          `\n⏰ Next execution: ${nextExecution.nextExecutionTime.toLocaleString()}`,
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

console.log("✅ News Agent Worker is running");
console.log("   Waiting for jobs...\n");

// Keep the process running
process.stdin.resume();
