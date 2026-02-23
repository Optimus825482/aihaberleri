/**
 * In-Process Scheduler - Fallback when worker service is not available
 * This runs inside the Next.js process and checks periodically if agent should run
 *
 * UPDATED: 2026-02-08 - Fixed 15-minute interval with node-schedule
 */

import { db } from "./db";
import { executeNewsAgent } from "@/services/agent.service";
import { scheduleJob, Job as ScheduleJob } from "node-schedule";

let schedulerInterval: NodeJS.Timeout | null = null;
let cronJob: ScheduleJob | null = null;
let isRunning = false;

/**
 * Start the in-process scheduler with FIXED 15-minute interval
 * Uses node-schedule for precise cron timing (0, 15, 30, 45 minutes)
 */
export function startInProcessScheduler() {
  // Only run if not already running
  if (cronJob) {
    console.log("⏰ Scheduler already running");
    return;
  }

  console.log("🔄 Starting in-process scheduler with 15-minute cron...");

  // Schedule job to run every 15 minutes (0, 15, 30, 45)
  cronJob = scheduleJob("*/15 * * * *", async () => {
    console.log("⏰ 15-minute cron triggered");
    await runAgentWithLimits();
  });

  console.log("✅ Cron job scheduled: */15 * * * * (every 15 minutes)");

  // Also check immediately on startup (after 5s)
  setTimeout(() => {
    console.log("🚀 Initial agent run on startup");
    runAgentWithLimits();
  }, 5000);
}

/**
 * Stop the in-process scheduler
 */
export function stopInProcessScheduler() {
  if (cronJob) {
    cronJob.cancel();
    cronJob = null;
    console.log("⏹️ Cron job stopped");
  }

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("⏹️ In-process scheduler stopped");
  }
}

/**
 * Run agent with 1-3 article limits
 * NEW: Ensures exactly 1-3 articles are published per run
 */
async function runAgentWithLimits() {
  // Prevent concurrent executions
  if (isRunning) {
    console.log("⚠️ Agent already running, skipping...");
    return;
  }

  try {
    // Check if agent is enabled
    const enabledSetting = await db.setting.findUnique({
      where: { key: "agent.enabled" },
    });

    const isEnabled = enabledSetting?.value !== "false";
    if (!isEnabled) {
      console.log("⏸️ Agent is disabled, skipping...");
      return;
    }

    isRunning = true;
    const startTime = new Date();

    console.log("🤖 Starting agent execution with 1-3 article limit...");

    // Update last run
    await db.setting.upsert({
      where: { key: "agent.lastRun" },
      update: { value: startTime.toISOString() },
      create: { key: "agent.lastRun", value: startTime.toISOString() },
    });

    // Execute agent (will handle 1-3 article limit internally)
    await executeNewsAgent();

    const duration = Math.round((Date.now() - startTime.getTime()) / 1000);
    console.log(`✅ Agent execution completed in ${duration}s`);
  } catch (error) {
    console.error("❌ Agent execution error:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Schedule the next agent run (DEPRECATED - using cron now)
 * Kept for backward compatibility with settings
 */
async function scheduleNextRun() {
  try {
    // Fixed 15-minute interval
    const intervalHours = 0.25; // 15 minutes
    const nextRun = new Date(Date.now() + 15 * 60 * 1000);

    await db.setting.upsert({
      where: { key: "agent.nextRun" },
      update: { value: nextRun.toISOString() },
      create: { key: "agent.nextRun", value: nextRun.toISOString() },
    });

    console.log(`📅 Next run: ${nextRun.toLocaleString()} (15 min from now)`);
  } catch (error) {
    console.error("❌ Failed to schedule next run:", error);
  }
}

/**
 * Check if worker service is available
 */
export async function isWorkerServiceAvailable(): Promise<boolean> {
  try {
    const { getNewsAgentQueue } = await import("./queue");
    const newsAgentQueue = getNewsAgentQueue();
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
