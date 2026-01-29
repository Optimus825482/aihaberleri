/**
 * Queue Connection Test Script
 * Tests Redis and BullMQ queue connectivity
 *
 * Usage: npx tsx src/scripts/test-queue-connection.ts
 */

import { getRedis } from "@/lib/redis";
import { newsAgentQueue, getQueueStats, getUpcomingJobs } from "@/lib/queue";

async function testQueueConnection() {
  console.log("🧪 Testing Queue Connection...\n");
  console.log("=".repeat(60));

  // Test 1: Redis Connection
  console.log("\n1️⃣ Testing Redis Connection...");
  const redis = getRedis();

  if (!redis) {
    console.error("❌ Redis instance is null");
    process.exit(1);
  }

  try {
    console.log(`   Redis Status: ${redis.status}`);

    // Connect if needed
    if (redis.status === "wait") {
      console.log("   Connecting to Redis...");
      await redis.connect();
    }

    // Test ping
    const pong = await redis.ping();
    console.log(`   ✅ Redis PING: ${pong}`);

    // Test set/get
    await redis.set("test-key", "test-value", "EX", 10);
    const value = await redis.get("test-key");
    console.log(`   ✅ Redis SET/GET: ${value}`);
  } catch (error) {
    console.error("   ❌ Redis test failed:", error);
    process.exit(1);
  }

  // Test 2: Queue Instance
  console.log("\n2️⃣ Testing Queue Instance...");

  if (!newsAgentQueue) {
    console.error("   ❌ Queue instance is null");
    process.exit(1);
  }

  console.log(`   ✅ Queue Name: ${newsAgentQueue.name}`);
  console.log(
    `   ✅ Queue Client: ${newsAgentQueue.client ? "Connected" : "Not Connected"}`,
  );

  // Test 3: Queue Stats
  console.log("\n3️⃣ Testing Queue Stats...");

  try {
    const stats = await getQueueStats();
    console.log("   Queue Stats:");
    console.log(`     - Waiting: ${stats.waiting}`);
    console.log(`     - Active: ${stats.active}`);
    console.log(`     - Completed: ${stats.completed}`);
    console.log(`     - Failed: ${stats.failed}`);
    console.log(`     - Delayed: ${stats.delayed}`);
  } catch (error) {
    console.error("   ❌ Queue stats failed:", error);
  }

  // Test 4: Upcoming Jobs
  console.log("\n4️⃣ Testing Upcoming Jobs...");

  try {
    const jobs = await getUpcomingJobs();
    console.log(`   Found ${jobs.length} upcoming jobs:`);

    for (const job of jobs) {
      console.log(`     - Job ID: ${job.id}`);
      console.log(`       Name: ${job.name}`);
      console.log(
        `       Scheduled: ${new Date(job.scheduledFor).toLocaleString()}`,
      );
    }
  } catch (error) {
    console.error("   ❌ Upcoming jobs failed:", error);
  }

  // Test 5: Add Test Job
  console.log("\n5️⃣ Testing Job Addition...");

  try {
    const testJob = await newsAgentQueue.add(
      "test-job",
      { test: true },
      {
        jobId: `test-${Date.now()}`,
        removeOnComplete: true,
        delay: 0,
      },
    );

    console.log(`   ✅ Test job added: ${testJob.id}`);
    console.log(`   Job State: ${await testJob.getState()}`);

    // Remove test job
    await testJob.remove();
    console.log(`   ✅ Test job removed`);
  } catch (error) {
    console.error("   ❌ Job addition failed:", error);
  }

  // Test 6: Worker Detection
  console.log("\n6️⃣ Testing Worker Detection...");

  try {
    const workers = await newsAgentQueue.getWorkers();
    console.log(`   Active Workers: ${workers.length}`);

    if (workers.length === 0) {
      console.warn("   ⚠️ No workers detected! Worker may not be running.");
    } else {
      for (const worker of workers) {
        console.log(`     - Worker: ${worker}`);
      }
    }
  } catch (error) {
    console.error("   ❌ Worker detection failed:", error);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Queue connection test completed!\n");

  // Cleanup
  await redis.quit();
  process.exit(0);
}

// Run test
testQueueConnection().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
