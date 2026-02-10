/**
 * Cron Jobs - Scheduled background tasks
 * Runs in the main Next.js process
 */

import { db } from "./db";

let cleanupInterval: NodeJS.Timeout | null = null;
let indexingInterval: NodeJS.Timeout | null = null;
let trendInterval: NodeJS.Timeout | null = null;
let isCleanupRunning = false;
let isIndexingRunning = false;
let isTrendRunning = false;

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  if (cleanupInterval && indexingInterval && trendInterval) {
    console.log("⏰ Cron jobs already running");
    return;
  }

  console.log("🚀 Starting cron jobs...");

  // Cleanup old visitors every hour
  cleanupInterval = setInterval(
    async () => {
      await cleanupOldVisitors();
    },
    60 * 60 * 1000,
  ); // Every 1 hour

  // Aggressive indexing for pending articles every 15 minutes
  indexingInterval = setInterval(
    async () => {
      await aggressiveIndexPendingArticles();
    },
    15 * 60 * 1000,
  ); // Every 15 minutes

  // Recalculate trend scores every 2 hours (view-based scoring)
  trendInterval = setInterval(
    async () => {
      await recalculateTrendScores();
    },
    2 * 60 * 60 * 1000,
  ); // Every 2 hours

  // Run immediately on startup (after 30 seconds)
  setTimeout(() => {
    cleanupOldVisitors();
    aggressiveIndexPendingArticles();
  }, 30000);

  // Run trend recalculation after 2 minutes (give DB time to settle)
  setTimeout(() => {
    recalculateTrendScores();
  }, 120000);

  console.log("✅ Cron jobs started");
}

/**
 * Stop all cron jobs
 */
export function stopCronJobs() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  if (indexingInterval) {
    clearInterval(indexingInterval);
    indexingInterval = null;
  }
  if (trendInterval) {
    clearInterval(trendInterval);
    trendInterval = null;
  }
  console.log("⏹️ Cron jobs stopped");
}

/**
 * Cleanup old visitors (older than 1 hour)
 */
async function cleanupOldVisitors() {
  // Prevent concurrent executions
  if (isCleanupRunning) {
    console.log("⏭️ Visitor cleanup already running, skipping...");
    return;
  }

  isCleanupRunning = true;

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await db.visitor.deleteMany({
      where: {
        lastActivity: {
          lt: oneHourAgo,
        },
      },
    });

    if (result.count > 0) {
      console.log(`🧹 Cleaned up ${result.count} old visitors`);
    }
  } catch (error) {
    console.error("❌ Visitor cleanup error:", error);
  } finally {
    isCleanupRunning = false;
  }
}

/**
 * Aggressive indexing for pending articles
 * Runs every 15 minutes to ensure all articles are indexed
 */
async function aggressiveIndexPendingArticles() {
  // Prevent concurrent executions
  if (isIndexingRunning) {
    console.log("⏭️ Aggressive indexing already running, skipping...");
    return;
  }

  isIndexingRunning = true;

  try {
    const { indexPendingArticlesAggressively } =
      await import("./seo/aggressive-indexing");
    const result = await indexPendingArticlesAggressively();

    if (result.count > 0) {
      console.log(`🚀 Aggressively indexed ${result.count} pending articles`);
    }
  } catch (error) {
    console.error("❌ Aggressive indexing cron error:", error);
  } finally {
    isIndexingRunning = false;
  }
}

/**
 * Recalculate trend scores for recent articles (view-based scoring)
 * Runs every 2 hours to keep trend scores fresh based on actual engagement
 */
async function recalculateTrendScores() {
  if (isTrendRunning) {
    console.log("⏭️ Trend recalculation already running, skipping...");
    return;
  }

  isTrendRunning = true;

  try {
    const { bulkRecalculateTrends } = await import("./trend-service");
    // Recalculate for articles from last 72 hours
    await bulkRecalculateTrends(72);
    console.log("📊 Trend score recalculation completed");
  } catch (error) {
    console.error("❌ Trend recalculation cron error:", error);
  } finally {
    isTrendRunning = false;
  }
}

/**
 * Manual cleanup trigger (for API endpoint)
 */
export async function triggerVisitorCleanup(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await db.visitor.deleteMany({
      where: {
        lastActivity: {
          lt: oneHourAgo,
        },
      },
    });

    return {
      success: true,
      count: result.count,
    };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Manual aggressive indexing trigger (for API endpoint)
 */
export async function triggerAggressiveIndexing(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const { indexPendingArticlesAggressively } =
      await import("./seo/aggressive-indexing");
    const result = await indexPendingArticlesAggressively();

    return {
      success: result.success,
      count: result.count,
    };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get cron job status
 */
export function getCronStatus() {
  return {
    running:
      cleanupInterval !== null &&
      indexingInterval !== null &&
      trendInterval !== null,
    jobs: [
      {
        name: "Visitor Cleanup",
        interval: "1 hour",
        enabled: cleanupInterval !== null,
      },
      {
        name: "Aggressive Indexing",
        interval: "15 minutes",
        enabled: indexingInterval !== null,
      },
      {
        name: "Trend Score Recalculation",
        interval: "2 hours",
        enabled: trendInterval !== null,
      },
    ],
  };
}
