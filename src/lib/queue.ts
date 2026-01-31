import { Queue, Worker, QueueEvents } from "bullmq";
import { getRedis } from "./redis";
import { db } from "./db";

// Lazy initialization - created on first use, not at import time
let newsAgentQueueInstance: Queue | null = null;
let newsAgentQueueEventsInstance: QueueEvents | null = null;

// Get or create queue (lazy initialization)
export const getNewsAgentQueue = (): Queue | null => {
  if (newsAgentQueueInstance) {
    return newsAgentQueueInstance;
  }

  const redis = getRedis();
  if (!redis) {
    console.warn("⚠️  Redis not available, queue cannot be created");
    return null;
  }

  try {
    newsAgentQueueInstance = new Queue("news-agent", {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
          count: 50,
        },
        timeout: 600000, // 10 minutes timeout for job execution
      },
    });
    console.log("✅ News agent queue created");
    return newsAgentQueueInstance;
  } catch (error) {
    console.error("❌ Failed to create queue:", error);
    return null;
  }
};

// Get or create queue events (lazy initialization)
export const getNewsAgentQueueEvents = (): QueueEvents | null => {
  if (newsAgentQueueEventsInstance) {
    return newsAgentQueueEventsInstance;
  }

  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    newsAgentQueueEventsInstance = new QueueEvents("news-agent", {
      connection: redis,
    });

    // Suppress NOAUTH errors (not critical)
    newsAgentQueueEventsInstance.on("error", (err) => {
      if (err.message && err.message.includes("NOAUTH")) {
        return;
      }
      console.error("❌ Queue events error:", err);
    });

    console.log("✅ Queue events listener created");
    return newsAgentQueueEventsInstance;
  } catch (error) {
    console.error("❌ Failed to create queue events:", error);
    return null;
  }
};

// Export getter function as default export for compatibility
export const newsAgentQueue = getNewsAgentQueue();
export const newsAgentQueueEvents = getNewsAgentQueueEvents();

// Helper to add news agent job
// PHASE 2: Enhanced with immediate reschedule support
// PHASE 3: Use repeatable jobs for reliability
export async function scheduleNewsAgentJob() {
  const queue = getNewsAgentQueue();
  if (!queue) {
    console.warn("⚠️  Queue not available (Redis not connected)");
    return null;
  }

  try {
    // Get interval from settings (default to 6 if not found)
    const setting = await db.setting.findUnique({
      where: { key: "agent.intervalHours" },
    });

    const intervalHours = setting ? parseFloat(setting.value) : 6;
    const intervalMs = Math.round(intervalHours * 60 * 60 * 1000); // Support decimal hours (0.25 = 15 min)

    // Remove all existing repeatable and delayed jobs first
    const existingRepeatableJobs = await queue.getRepeatableJobs();
    for (const job of existingRepeatableJobs) {
      await queue.removeRepeatableByKey(job.key);
      console.log(`🗑️ Removed existing repeatable job: ${job.key}`);
    }

    // Also check for any pending/waiting/delayed jobs and remove them
    const pendingJobs = await queue.getJobs(["waiting", "delayed", "active"]);
    for (const job of pendingJobs) {
      if (
        job.id === "news-agent-scheduled-run" ||
        job.name === "scrape-and-publish"
      ) {
        try {
          await job.remove();
          console.log(`🗑️ Removed pending job: ${job.id}`);
        } catch (e) {
          // Job might be active, ignore removal error
        }
      }
    }

    // Use repeatable job with 'every' pattern for reliable periodic execution
    // This ensures the job runs even if worker restarts
    await queue.add(
      "scrape-and-publish",
      {},
      {
        repeat: {
          every: intervalMs,
          immediately: false, // Don't run immediately, wait for first interval
        },
        jobId: "news-agent-repeatable",
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
      },
    );

    const nextTime = new Date(Date.now() + intervalMs);

    // Update nextRun in settings for UI transparency
    await db.setting.upsert({
      where: { key: "agent.nextRun" },
      update: { value: nextTime.toISOString() },
      create: { key: "agent.nextRun", value: nextTime.toISOString() },
    });

    const queueLength = await queue.count();

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 AGENT SCHEDULE (REPEATABLE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ Current time:  ${new Date().toLocaleString("tr-TR")}
⏰ Next run time: ${nextTime.toLocaleString("tr-TR")}
⚙️  Interval:      ${intervalHours} hours (${intervalMs}ms)
🆔 Job Type:      Repeatable (every ${intervalHours}h)
📊 Queue length:  ${queueLength}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    return {
      nextExecutionTime: nextTime,
      delayHours: intervalHours,
    };
  } catch (error) {
    console.error("❌ Scheduling error:", error);
    return null;
  }
}

// Get queue stats
export async function getQueueStats() {
  const queue = getNewsAgentQueue();
  if (!queue) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

// Get upcoming jobs
export async function getUpcomingJobs() {
  const queue = getNewsAgentQueue();
  if (!queue) {
    return [];
  }

  const jobs = await queue.getJobs(["delayed", "waiting"]);
  return jobs.map((job) => ({
    id: job.id,
    name: job.name,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    delay: job.opts.delay,
    scheduledFor: job.timestamp + (job.opts.delay || 0),
  }));
}

export default getNewsAgentQueue;
