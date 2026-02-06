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

// =====================================================
// NEWSLETTER SCHEDULER - Daily at 19:00 Turkey Time
// =====================================================

let newsletterQueueInstance: Queue | null = null;

export const getNewsletterQueue = (): Queue | null => {
  if (newsletterQueueInstance) {
    return newsletterQueueInstance;
  }

  const redis = getRedis();
  if (!redis) {
    console.warn("⚠️  Redis not available, newsletter queue cannot be created");
    return null;
  }

  try {
    newsletterQueueInstance = new Queue("newsletter", {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 10000,
        },
        removeOnComplete: {
          count: 50,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 20,
        },
        timeout: 300000, // 5 minutes timeout
      },
    });
    console.log("✅ Newsletter queue created");
    return newsletterQueueInstance;
  } catch (error) {
    console.error("❌ Failed to create newsletter queue:", error);
    return null;
  }
};

/**
 * Schedule daily newsletter job at 19:00 Turkey time
 * Uses cron pattern for reliable daily execution
 */
export async function scheduleNewsletterJob() {
  const queue = getNewsletterQueue();
  if (!queue) {
    console.warn("⚠️  Newsletter queue not available");
    return null;
  }

  try {
    // Remove existing repeatable jobs
    const existingJobs = await queue.getRepeatableJobs();
    for (const job of existingJobs) {
      await queue.removeRepeatableByKey(job.key);
      console.log(`🗑️ Removed existing newsletter job: ${job.key}`);
    }

    // Schedule newsletter at 19:00 Turkey time (UTC+3)
    // Cron: minute hour * * * (0 19 * * * = 19:00 every day)
    await queue.add(
      "daily-digest",
      {},
      {
        repeat: {
          pattern: "0 19 * * *", // Every day at 19:00
          tz: "Europe/Istanbul", // Turkey timezone
        },
        jobId: "newsletter-daily-digest",
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 NEWSLETTER SCHEDULE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ Time: Every day at 19:00 (Turkey)
🆔 Job Type: Cron (daily-digest)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    return { scheduled: true, time: "19:00 Europe/Istanbul" };
  } catch (error) {
    console.error("❌ Newsletter scheduling error:", error);
    return null;
  }
}

/**
 * Trigger newsletter immediately (manual trigger)
 */
export async function triggerNewsletterNow() {
  const queue = getNewsletterQueue();
  if (!queue) {
    console.warn("⚠️  Newsletter queue not available");
    return null;
  }

  try {
    const job = await queue.add(
      "daily-digest",
      { manual: true },
      {
        jobId: `newsletter-manual-${Date.now()}`,
        removeOnComplete: true,
      },
    );

    console.log(`📧 Manual newsletter triggered: ${job.id}`);
    return { jobId: job.id };
  } catch (error) {
    console.error("❌ Manual newsletter trigger failed:", error);
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

// =====================================================
// SOCIAL BATCH QUEUE - Background social media sharing
// =====================================================

let socialBatchQueueInstance: Queue | null = null;

export const getSocialBatchQueue = (): Queue | null => {
  if (socialBatchQueueInstance) {
    return socialBatchQueueInstance;
  }

  const redis = getRedis();
  if (!redis) {
    console.warn("⚠️  Redis not available, social batch queue cannot be created");
    return null;
  }

  try {
    socialBatchQueueInstance = new Queue("social-batch", {
      connection: redis,
      defaultJobOptions: {
        attempts: 1, // Don't retry - each article shares once
        removeOnComplete: {
          count: 100,
          age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
          count: 50,
        },
      },
    });
    console.log("✅ Social batch queue created");
    return socialBatchQueueInstance;
  } catch (error) {
    console.error("❌ Failed to create social batch queue:", error);
    return null;
  }
};

/**
 * Add social batch job to queue
 * Runs in background even if user closes page
 */
export async function addSocialBatchJob(data: {
  batchId: string;
  platforms: string[];
  intervalSeconds: number;
  batchSize: number;
}) {
  const queue = getSocialBatchQueue();
  if (!queue) {
    console.warn("⚠️  Social batch queue not available");
    return null;
  }

  try {
    const job = await queue.add(
      "social-batch-share",
      data,
      {
        jobId: `social-batch-${data.batchId}`,
        removeOnComplete: false, // Keep for progress tracking
      },
    );

    console.log(`📤 Social batch job added: ${job.id}`);
    return { jobId: job.id, batchId: data.batchId };
  } catch (error) {
    console.error("❌ Social batch job add failed:", error);
    return null;
  }
}

/**
 * Get social batch job progress
 */
export async function getSocialBatchProgress(batchId: string) {
  const queue = getSocialBatchQueue();
  if (!queue) return null;

  try {
    const job = await queue.getJob(`social-batch-${batchId}`);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress as any;

    return {
      state,
      progress: progress || { processed: 0, total: 0, failed: 0 },
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  } catch (error) {
    console.error("❌ Get social batch progress failed:", error);
    return null;
  }
}
