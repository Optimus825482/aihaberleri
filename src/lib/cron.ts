/**
 * Cron Jobs - Scheduled background tasks
 * Runs in the main Next.js process
 */

import { db } from "./db";

let cleanupInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  if (cleanupInterval) {
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

  // Run immediately on startup (after 30 seconds)
  setTimeout(() => {
    cleanupOldVisitors();
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
    console.log("⏹️ Cron jobs stopped");
  }
}

/**
 * Cleanup old visitors (older than 1 hour)
 */
async function cleanupOldVisitors() {
  // Prevent concurrent executions
  if (isRunning) {
    console.log("⏭️ Visitor cleanup already running, skipping...");
    return;
  }

  isRunning = true;

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
    isRunning = false;
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
 * Get cron job status
 */
export function getCronStatus() {
  return {
    running: cleanupInterval !== null,
    jobs: [
      {
        name: "Visitor Cleanup",
        interval: "1 hour",
        enabled: cleanupInterval !== null,
      },
    ],
  };
}
