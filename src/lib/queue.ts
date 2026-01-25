import { Queue, Worker, QueueEvents } from "bullmq";
import redis from "./redis";

// News agent queue
export const newsAgentQueue = new Queue("news-agent", {
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
  },
});

// Queue events for monitoring
export const newsAgentQueueEvents = new QueueEvents("news-agent", {
  connection: redis,
});

// Helper to add news agent job
export async function scheduleNewsAgentJob() {
  // Calculate next execution time (random between 5-8 hours from now)
  const minHours = parseInt(process.env.AGENT_MIN_INTERVAL_HOURS || "5");
  const maxHours = minHours + 3;
  const randomHours = Math.random() * (maxHours - minHours) + minHours;
  const delay = randomHours * 60 * 60 * 1000; // Convert to milliseconds

  await newsAgentQueue.add(
    "scrape-and-publish",
    {},
    {
      delay,
      jobId: `news-agent-${Date.now()}`,
    },
  );

  console.log(
    `📅 Sonraki haber agent çalıştırması ${randomHours.toFixed(2)} saat sonra planlandı`,
  );

  return {
    nextExecutionTime: new Date(Date.now() + delay),
    delayHours: randomHours,
  };
}

// Get queue stats
export async function getQueueStats() {
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
