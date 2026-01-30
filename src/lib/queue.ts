import { Queue, Worker, QueueEvents } from "bullmq";
import { getRedis } from "./redis";
import { db } from "./db";

// Get Redis connection (may be null during build)
const redis = getRedis();

// Create queue only if Redis is available
export const newsAgentQueue = redis
  ? new Queue("news-agent", {
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
    })
  : null;

// Queue events for monitoring (only if Redis is available)
export const newsAgentQueueEvents = redis
  ? new QueueEvents("news-agent", {
      connection: redis,
    })
  : null;

// Suppress NOAUTH errors in queue events (not critical for operation)
if (newsAgentQueueEvents) {
  newsAgentQueueEvents.on("error", (err) => {
    if (err.message && err.message.includes("NOAUTH")) {
      // Silent - Redis info command auth not critical
      return;
    }
    console.error("❌ Queue events error:", err);
  });
}

// Helper to add news agent job
// PHASE 2: Enhanced with immediate reschedule support
export async function scheduleNewsAgentJob() {
  if (!newsAgentQueue) {
    console.warn("⚠️  Queue not available (Redis not connected)");
    return null;
  }

  try {
    // Get interval from settings (default to 6 if not found)
    const setting = await db.setting.findUnique({
      where: { key: "agent.intervalHours" },
    });

    const intervalHours = setting ? parseInt(setting.value) : 6;
    const delay = intervalHours * 60 * 60 * 1000;

    // Phase 2: Remove existing jobs first to allow immediate reschedule
    const existingJobs = await newsAgentQueue.getRepeatableJobs();
    for (const job of existingJobs) {
      if (job.name === "news-agent-scheduled-run" || job.id) {
        await newsAgentQueue.removeRepeatableByKey(job.key);
        console.log(`🗑️ Removed existing scheduled job: ${job.key}`);
      }
    }

    // Also check for any pending/waiting jobs with the fixed ID and remove them
    const waitingJobs = await newsAgentQueue.getJobs(["waiting", "delayed"]);
    for (const job of waitingJobs) {
      if (
        job.id === "news-agent-scheduled-run" ||
        job.name === "scrape-and-publish"
      ) {
        await job.remove();
        console.log(`🗑️ Removed pending job: ${job.id}`);
      }
    }

    // Use a fixed jobId so we don't have multiple scheduled jobs at once
    // Now this works for reschedules since we removed old jobs above
    await newsAgentQueue.add(
      "scrape-and-publish",
      {},
      {
        delay,
        jobId: "news-agent-scheduled-run",
        removeOnComplete: true,
      },
    );

    const nextTime = new Date(Date.now() + delay);

    // Update nextRun in settings for UI transparency
    await db.setting.upsert({
      where: { key: "agent.nextRun" },
      update: { value: nextTime.toISOString() },
      create: { key: "agent.nextRun", value: nextTime.toISOString() },
    });

    const queueLength = await newsAgentQueue.count();

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 AGENT SCHEDULE DEBUG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ Current time:  ${new Date().toLocaleString("tr-TR")}
⏰ Next run time: ${nextTime.toLocaleString("tr-TR")}
⚙️  Interval:      ${intervalHours} hours
🆔 Job ID:        news-agent-scheduled-run
📊 Queue length:  ${queueLength}
🔄 Reschedule:    Enabled (old job removed)
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
  if (!newsAgentQueue) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    newsAgentQueue.getWaitingCount(),
    newsAgentQueue.getActiveCount(),
    newsAgentQueue.getCompletedCount(),
    newsAgentQueue.getFailedCount(),
    newsAgentQueue.getDelayedCount(),
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
  if (!newsAgentQueue) {
    return [];
  }

  const jobs = await newsAgentQueue.getJobs(["delayed", "waiting"]);
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

export default newsAgentQueue;
