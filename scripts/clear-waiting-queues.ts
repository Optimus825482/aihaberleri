import "dotenv/config";

import type { Queue } from "bullmq";
import {
  QUEUE_NAMES,
  getQueue,
  getQueueStats,
  pauseQueue,
  resumeQueue,
} from "../src/lib/queue-manager";
import {
  getNewsAgentQueue,
  getNewsletterQueue,
  getSocialBatchQueue,
} from "../src/lib/queue";

type QueueGetter = () => Queue | null;

const managedQueueNames = Object.values(QUEUE_NAMES);

const standaloneQueues: Record<string, QueueGetter> = {
  "news-agent": getNewsAgentQueue,
  newsletter: getNewsletterQueue,
  "social-batch": getSocialBatchQueue,
};

function getArgValue(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact) {
    return exact.split("=").slice(1).join("=");
  }

  const index = process.argv.findIndex((arg) => arg === name);
  if (index >= 0) {
    return process.argv[index + 1];
  }

  return undefined;
}

function getQueueTargets(): string[] {
  const queueArg = getArgValue("--queue");
  if (!queueArg || queueArg === "all") {
    return [...managedQueueNames, ...Object.keys(standaloneQueues)];
  }

  return queueArg
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function getNamedQueue(queueName: string): Promise<Queue> {
  if (
    managedQueueNames.includes(queueName as (typeof managedQueueNames)[number])
  ) {
    const queue = getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue unavailable: ${queueName}`);
    }
    return queue;
  }

  const getter = standaloneQueues[queueName];
  if (!getter) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  const queue = getter();
  if (!queue) {
    throw new Error(`Queue unavailable: ${queueName}`);
  }

  return queue;
}

async function pauseNamedQueue(queueName: string): Promise<void> {
  if (
    managedQueueNames.includes(queueName as (typeof managedQueueNames)[number])
  ) {
    const ok = await pauseQueue(queueName);
    if (!ok) {
      throw new Error(`Failed to pause queue: ${queueName}`);
    }
    return;
  }

  const queue = await getNamedQueue(queueName);
  await queue.pause();
}

async function resumeNamedQueue(queueName: string): Promise<void> {
  if (
    managedQueueNames.includes(queueName as (typeof managedQueueNames)[number])
  ) {
    const ok = await resumeQueue(queueName);
    if (!ok) {
      throw new Error(`Failed to resume queue: ${queueName}`);
    }
    return;
  }

  const queue = await getNamedQueue(queueName);
  await queue.resume();
}

async function getQueueSnapshot(queueName: string, queue: Queue) {
  const waiting = await queue.getWaitingCount();
  const delayed = await queue.getDelayedCount();
  const active = await queue.getActiveCount();

  const managedStats = await getQueueStats(queueName);

  return {
    waiting,
    delayed,
    active,
    completed: managedStats?.completed,
    failed: managedStats?.failed,
  };
}

async function clearWaitingJobs(queueName: string, dryRun: boolean) {
  const queue = await getNamedQueue(queueName);
  const wasPaused = await queue.isPaused();
  const before = await getQueueSnapshot(queueName, queue);
  const jobs = await queue.getJobs(["waiting", "delayed"]);

  if (!wasPaused) {
    await pauseNamedQueue(queueName);
  }

  try {
    if (!dryRun) {
      for (const job of jobs) {
        await job.remove();
      }
    }
  } finally {
    if (!wasPaused) {
      await resumeNamedQueue(queueName);
    }
  }

  const after = dryRun ? before : await getQueueSnapshot(queueName, queue);

  return {
    queueName,
    dryRun,
    removed: jobs.length,
    before,
    after,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const targets = getQueueTargets();

  const unknownTargets = targets.filter(
    (target) =>
      !managedQueueNames.includes(
        target as (typeof managedQueueNames)[number],
      ) && !(target in standaloneQueues),
  );

  if (unknownTargets.length > 0) {
    throw new Error(
      `Unknown queue target(s): ${unknownTargets.join(", ")}. Available: ${[
        ...managedQueueNames,
        ...Object.keys(standaloneQueues),
      ].join(", ")}`,
    );
  }

  const results = [];
  for (const queueName of targets) {
    const result = await clearWaitingJobs(queueName, dryRun);
    results.push(result);
  }

  console.log(JSON.stringify({ dryRun, results }, null, 2));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
