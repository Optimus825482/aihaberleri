/**
 * Multi-Agent Pipeline End-to-End Test
 *
 * Tests the complete 5-agent pipeline:
 * ContentCollector → RelevanceFilter → DuplicateDetector → ContentEnricher → VisualGenerator
 *
 * Usage:
 *   npm run test:pipeline
 *   npm run test:pipeline -- --articles=10
 *   npm run test:pipeline -- --category=teknoloji
 */

import {
  getQueue,
  initializeQueues,
  getAllQueueStats,
  QUEUE_NAMES,
} from "@/lib/queue-manager";
import { getRedis } from "@/lib/redis";
import { db } from "@/lib/db";

interface TestConfig {
  maxArticles: number;
  categoryFilter?: string;
  timeout: number; // milliseconds
}

interface TestResults {
  success: boolean;
  duration: number;
  stages: {
    collected: number;
    relevant: number;
    unique: number;
    enriched: number;
    withVisuals: number;
    published: number;
  };
  metrics: {
    duplicateRate: number;
    rejectionRate: number;
    successRate: number;
  };
  errors: string[];
}

/**
 * Parse command line arguments
 */
function parseArgs(): TestConfig {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    maxArticles: 20,
    timeout: 10 * 60 * 1000, // 10 minutes
  };

  for (const arg of args) {
    if (arg.startsWith("--articles=")) {
      config.maxArticles = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--category=")) {
      config.categoryFilter = arg.split("=")[1];
    } else if (arg.startsWith("--timeout=")) {
      config.timeout = parseInt(arg.split("=")[1], 10) * 1000;
    }
  }

  return config;
}

/**
 * Wait for queue to have jobs
 */
async function waitForJobs(
  queueName: string,
  timeout: number,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const queue = getQueue(queueName);
    if (!queue) return false;

    const [waiting, active] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
    ]);

    if (waiting > 0 || active > 0) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

/**
 * Wait for queue to complete all jobs
 */
async function waitForCompletion(
  queueName: string,
  timeout: number,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const queue = getQueue(queueName);
    if (!queue) return false;

    const [waiting, active, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
    ]);

    if (waiting === 0 && active === 0 && delayed === 0) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return false;
}

/**
 * Get queue job counts
 */
async function getQueueCounts(queueName: string) {
  const queue = getQueue(queueName);
  if (!queue) return { waiting: 0, active: 0, completed: 0, failed: 0 };

  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

/**
 * Monitor pipeline progress
 */
async function monitorPipeline(config: TestConfig): Promise<void> {
  console.log("\n📊 Pipeline Monitoring (updates every 5s)...\n");

  const interval = setInterval(async () => {
    const stats = await getAllQueueStats();

    console.clear();
    console.log("📊 Multi-Agent Pipeline Status\n");
    console.log("═".repeat(80));

    for (const stat of stats) {
      if (!stat) continue;

      const total = stat.waiting + stat.active + stat.completed + stat.failed;
      const progress =
        total > 0 ? ((stat.completed / total) * 100).toFixed(1) : "0.0";

      console.log(`\n${stat.queueName}:`);
      console.log(
        `  Active: ${stat.active} | Waiting: ${stat.waiting} | Completed: ${stat.completed} | Failed: ${stat.failed}`,
      );
      console.log(`  Progress: ${progress}%`);
    }

    console.log("\n" + "═".repeat(80));
    console.log("Press Ctrl+C to stop monitoring\n");
  }, 5000);

  // Store interval ID for cleanup
  (global as any).monitorInterval = interval;
}

/**
 * Run end-to-end test
 */
async function runTest(config: TestConfig): Promise<TestResults> {
  const startTime = Date.now();
  const errors: string[] = [];

  console.log("\n🚀 Starting Multi-Agent Pipeline Test");
  console.log("═".repeat(80));
  console.log(`Max Articles: ${config.maxArticles}`);
  console.log(`Category Filter: ${config.categoryFilter || "None"}`);
  console.log(`Timeout: ${config.timeout / 1000}s`);
  console.log("═".repeat(80) + "\n");

  try {
    // Step 1: Verify Redis connection
    console.log("1️⃣  Checking Redis connection...");
    const redis = getRedis();
    if (!redis) {
      throw new Error("Redis not available");
    }
    await redis.ping();
    console.log("   ✅ Redis connected\n");

    // Step 2: Verify database connection
    console.log("2️⃣  Checking database connection...");
    await db.$queryRaw`SELECT 1`;
    console.log("   ✅ Database connected\n");

    // Step 3: Initialize queues
    console.log("3️⃣  Initializing queues...");
    initializeQueues();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for queues to initialize
    console.log("   ✅ Queues initialized\n");

    // Step 4: Clear existing jobs (optional)
    console.log("4️⃣  Clearing existing jobs...");
    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queue = getQueue(queueName);
      if (queue) {
        await queue.drain();
      }
    }
    console.log("   ✅ Queues cleared\n");

    // Step 5: Trigger content collection
    console.log("5️⃣  Triggering content collection...");
    const collectorQueue = getQueue(QUEUE_NAMES.COLLECTED_ARTICLES);
    if (!collectorQueue) {
      throw new Error("Collector queue not available");
    }

    await collectorQueue.add(
      "test-collection",
      {
        categoryFilter: config.categoryFilter,
        maxArticles: config.maxArticles,
      },
      {
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
    console.log("   ✅ Collection triggered\n");

    // Step 6: Start monitoring
    monitorPipeline(config);

    // Step 7: Wait for pipeline to complete
    console.log("6️⃣  Waiting for pipeline to complete...\n");

    // Wait for each stage
    const stages = [
      { name: "Content Collection", queue: QUEUE_NAMES.COLLECTED_ARTICLES },
      { name: "Relevance Filtering", queue: QUEUE_NAMES.RELEVANT_ARTICLES },
      { name: "Duplicate Detection", queue: QUEUE_NAMES.UNIQUE_ARTICLES },
      { name: "Content Enrichment", queue: QUEUE_NAMES.ENRICHED_ARTICLES },
      { name: "Visual Generation", queue: QUEUE_NAMES.ARTICLES_WITH_VISUALS },
    ];

    for (const stage of stages) {
      console.log(`   ⏳ ${stage.name}...`);

      // Wait for jobs to appear
      const hasJobs = await waitForJobs(stage.queue, 60000); // 1 minute timeout
      if (!hasJobs) {
        errors.push(`${stage.name}: No jobs appeared`);
        console.log(`   ⚠️  ${stage.name}: No jobs appeared`);
        continue;
      }

      // Wait for completion
      const completed = await waitForCompletion(stage.queue, config.timeout);
      if (!completed) {
        errors.push(`${stage.name}: Timeout`);
        console.log(`   ⚠️  ${stage.name}: Timeout`);
      } else {
        console.log(`   ✅ ${stage.name}: Complete`);
      }
    }

    // Step 8: Collect results
    console.log("\n7️⃣  Collecting results...\n");

    const collectedCounts = await getQueueCounts(
      QUEUE_NAMES.COLLECTED_ARTICLES,
    );
    const relevantCounts = await getQueueCounts(QUEUE_NAMES.RELEVANT_ARTICLES);
    const uniqueCounts = await getQueueCounts(QUEUE_NAMES.UNIQUE_ARTICLES);
    const enrichedCounts = await getQueueCounts(QUEUE_NAMES.ENRICHED_ARTICLES);
    const visualsCounts = await getQueueCounts(
      QUEUE_NAMES.ARTICLES_WITH_VISUALS,
    );

    // Calculate metrics
    const collected = collectedCounts.completed;
    const relevant = relevantCounts.completed;
    const unique = uniqueCounts.completed;
    const enriched = enrichedCounts.completed;
    const withVisuals = visualsCounts.completed;

    const rejectionRate =
      collected > 0 ? ((collected - relevant) / collected) * 100 : 0;
    const duplicateRate =
      relevant > 0 ? ((relevant - unique) / relevant) * 100 : 0;
    const successRate = collected > 0 ? (withVisuals / collected) * 100 : 0;

    const duration = Date.now() - startTime;

    // Stop monitoring
    if ((global as any).monitorInterval) {
      clearInterval((global as any).monitorInterval);
    }

    return {
      success: errors.length === 0,
      duration,
      stages: {
        collected,
        relevant,
        unique,
        enriched,
        withVisuals,
        published: 0, // Will be counted from database
      },
      metrics: {
        duplicateRate,
        rejectionRate,
        successRate,
      },
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unknown error");

    return {
      success: false,
      duration: Date.now() - startTime,
      stages: {
        collected: 0,
        relevant: 0,
        unique: 0,
        enriched: 0,
        withVisuals: 0,
        published: 0,
      },
      metrics: {
        duplicateRate: 0,
        rejectionRate: 0,
        successRate: 0,
      },
      errors,
    };
  }
}

/**
 * Print test results
 */
function printResults(results: TestResults, config: TestConfig): void {
  console.clear();
  console.log("\n" + "═".repeat(80));
  console.log("🎯 MULTI-AGENT PIPELINE TEST RESULTS");
  console.log("═".repeat(80) + "\n");

  // Overall status
  console.log(`Status: ${results.success ? "✅ SUCCESS" : "❌ FAILED"}`);
  console.log(`Duration: ${(results.duration / 1000).toFixed(1)}s`);
  console.log(`Target: <${config.timeout / 1000}s\n`);

  // Pipeline stages
  console.log("📊 Pipeline Stages:\n");
  console.log(
    `  1. Content Collection:    ${results.stages.collected} articles`,
  );
  console.log(
    `  2. Relevance Filtering:   ${results.stages.relevant} articles (${results.metrics.rejectionRate.toFixed(1)}% rejected)`,
  );
  console.log(
    `  3. Duplicate Detection:   ${results.stages.unique} articles (${results.metrics.duplicateRate.toFixed(1)}% duplicates)`,
  );
  console.log(
    `  4. Content Enrichment:    ${results.stages.enriched} articles`,
  );
  console.log(
    `  5. Visual Generation:     ${results.stages.withVisuals} articles`,
  );
  console.log(
    `  6. Published:             ${results.stages.published} articles\n`,
  );

  // Metrics
  console.log("📈 Performance Metrics:\n");
  console.log(
    `  Rejection Rate:  ${results.metrics.rejectionRate.toFixed(1)}% (target: 40-50%)`,
  );
  console.log(
    `  Duplicate Rate:  ${results.metrics.duplicateRate.toFixed(1)}% (target: <5%)`,
  );
  console.log(`  Success Rate:    ${results.metrics.successRate.toFixed(1)}%`);
  console.log(
    `  Throughput:      ${(results.stages.withVisuals / (results.duration / 60000)).toFixed(2)} articles/min\n`,
  );

  // Targets
  console.log("🎯 Target Comparison:\n");

  const durationTarget = results.duration < config.timeout;
  const rejectionTarget =
    results.metrics.rejectionRate >= 40 && results.metrics.rejectionRate <= 50;
  const duplicateTarget = results.metrics.duplicateRate < 5;

  console.log(
    `  Duration:        ${durationTarget ? "✅" : "❌"} ${(results.duration / 1000).toFixed(1)}s / ${config.timeout / 1000}s`,
  );
  console.log(
    `  Rejection Rate:  ${rejectionTarget ? "✅" : "⚠️"} ${results.metrics.rejectionRate.toFixed(1)}% / 40-50%`,
  );
  console.log(
    `  Duplicate Rate:  ${duplicateTarget ? "✅" : "⚠️"} ${results.metrics.duplicateRate.toFixed(1)}% / <5%\n`,
  );

  // Errors
  if (results.errors.length > 0) {
    console.log("❌ Errors:\n");
    results.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
    console.log();
  }

  console.log("═".repeat(80) + "\n");

  // Recommendations
  if (!results.success) {
    console.log("💡 Recommendations:\n");

    if (results.stages.collected === 0) {
      console.log("  - Check ContentCollectorAgent: RSS feeds may be down");
      console.log("  - Verify Brave API key is set");
    }

    if (results.metrics.rejectionRate < 40) {
      console.log("  - RelevanceFilterAgent may be too lenient");
      console.log("  - Consider raising threshold from 60 to 70");
    }

    if (results.metrics.duplicateRate > 5) {
      console.log("  - DuplicateDetectorAgent needs tuning");
      console.log("  - Check entity extraction patterns");
    }

    if (results.duration > config.timeout) {
      console.log("  - Pipeline too slow, check bottlenecks:");
      console.log("    * ContentEnricherAgent (Brave API + Jina Reader)");
      console.log("    * VisualGeneratorAgent (Pollinations API)");
    }

    console.log();
  }
}

/**
 * Main test runner
 */
async function main() {
  const config = parseArgs();

  console.log("\n🧪 Multi-Agent Pipeline Test Suite");
  console.log("═".repeat(80));

  try {
    const results = await runTest(config);
    printResults(results, config);

    // Exit with appropriate code
    process.exit(results.success ? 0 : 1);
  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n⚠️  Test interrupted by user");
  if ((global as any).monitorInterval) {
    clearInterval((global as any).monitorInterval);
  }
  process.exit(130);
});

process.on("SIGTERM", () => {
  console.log("\n\n⚠️  Test terminated");
  if ((global as any).monitorInterval) {
    clearInterval((global as any).monitorInterval);
  }
  process.exit(143);
});

// Run test
main();
