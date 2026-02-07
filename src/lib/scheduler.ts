/**
 * In-Process Scheduler - Fallback when worker service is not available
 * This runs inside the Next.js process and checks periodically if agent should run
 */

import { db } from "./db";
import { executeNewsAgent } from "@/services/agent.service";

let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Start the in-process scheduler
 * Checks every minute if it's time to run the agent
 */
export function startInProcessScheduler() {
  // Only run if not already running
  // Modified for debugging: Allow in dev mode
  if (schedulerInterval) {
    return;
  }

  console.log("🔄 Starting in-process scheduler (fallback mode)...");

  // Check every minute
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndRunAgent();
    } catch (error) {
      console.error("❌ Scheduler check error:", error);
    }
  }, 60 * 1000); // Every 1 minute

  // Also check immediately on startup
  setTimeout(() => checkAndRunAgent(), 5000); // Wait 5s for app to be ready
}

/**
 * Stop the in-process scheduler
 */
export function stopInProcessScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("⏹️ In-process scheduler stopped");
  }
}

/**
 * Check if agent should run and execute if needed
 */
async function checkAndRunAgent() {
  // Prevent concurrent executions
  if (isRunning) {
    return;
  }

  try {
    // Get settings
    const [enabledSetting, nextRunSetting, lastRunSetting] = await Promise.all([
      db.setting.findUnique({ where: { key: "agent.enabled" } }),
      db.setting.findUnique({ where: { key: "agent.nextRun" } }),
      db.setting.findUnique({ where: { key: "agent.lastRun" } }),
    ]);

    const isEnabled = enabledSetting?.value !== "false";
    if (!isEnabled) {
      return;
    }

    const nextRunStr = nextRunSetting?.value;
    if (!nextRunStr) {
      // No next run scheduled, schedule one
      await scheduleNextRun();
      return;
    }

    const nextRun = new Date(nextRunStr);
    const now = new Date();

    // Check if it's time to run (with 1 minute tolerance)
    if (nextRun <= now) {
      console.log("⏰ Time to run agent (in-process scheduler)");
      isRunning = true;

      try {
        // Update last run
        await db.setting.upsert({
          where: { key: "agent.lastRun" },
          update: { value: now.toISOString() },
          create: { key: "agent.lastRun", value: now.toISOString() },
        });

        // Execute agent
        await executeNewsAgent();

        // Schedule next run
        await scheduleNextRun();
      } finally {
        isRunning = false;
      }
    }
  } catch (error) {
    console.error("❌ Agent execution error:", error);
    isRunning = false;
  }
}

/**
 * Schedule the next agent run
 */
async function scheduleNextRun() {
  try {
    const intervalSetting = await db.setting.findUnique({
      where: { key: "agent.intervalHours" },
    });

    // DEFAULT: 0.167 hours = 10 minutes for real-time news pipeline
    const intervalHours = intervalSetting
      ? parseFloat(intervalSetting.value)
      : 0.167;
    const nextRun = new Date(
      Date.now() + Math.round(intervalHours * 60 * 60 * 1000),
    );

    await db.setting.upsert({
      where: { key: "agent.nextRun" },
      update: { value: nextRun.toISOString() },
      create: { key: "agent.nextRun", value: nextRun.toISOString() },
    });

    const intervalMinutes = Math.round(intervalHours * 60);
    console.log(
      `📅 Next agent run scheduled for: ${nextRun.toLocaleString()} (in ${intervalMinutes} min)`,
    );
  } catch (error) {
    console.error("❌ Failed to schedule next run:", error);
  }
}

/**
 * Check if worker service is available
 */
export async function isWorkerServiceAvailable(): Promise<boolean> {
  try {
    const { newsAgentQueue } = await import("./queue");
    if (!newsAgentQueue) {
      return false;
    }

    // Check if there are any workers connected
    const workers = await newsAgentQueue.getWorkers();
    return workers.length > 0;
  } catch {
    return false;
  }
}

/**
 * Initialize scheduler - use worker if available, fallback to in-process
 */
export async function initializeScheduler() {
  const hasWorker = await isWorkerServiceAvailable();

  if (hasWorker) {
    console.log("✅ Worker service detected, using BullMQ scheduler");
    stopInProcessScheduler();
  } else {
    console.log("⚠️ No worker service detected, using in-process scheduler");
    startInProcessScheduler();
  }
}
