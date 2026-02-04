/**
 * Cron Jobs - Scheduled background tasks
 * Runs in the main Next.js process
 */

import { db } from "./db";

let cleanupInterval: NodeJS.Timeout | null = null;
let indexingInterval: NodeJS.Timeout | null = null;
let isCleanupRunning = false;
let isIndexingRunning = false;

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  if (cleanupInterval && indexingInterval) {
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

  // Run immediately on startup (after 30 seconds)
  setTimeout(() => {
    cleanupOldVisitors();
    aggressiveIndexPendingArticles();
  }, 30000);

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
    running: cleanupInterval !== null && indexingInterval !== null,
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
    ],
  };
}
