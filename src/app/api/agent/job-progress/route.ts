/**
 * Agent Job Progress API
 * GET: Returns real-time progress of an active agent job
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { getRedis } from "@/lib/redis";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type JobProgressSnapshot = {
  step?: string;
  message?: string;
  progress?: number;
  timestamp?: string;
  agent?: string;
  stage?: string;
};

type QueueJobContext = {
  state: string | null;
  agentLogId: string | null;
};

async function resolveQueueJobContext(
  jobId: string | null,
  redis: ReturnType<typeof getRedis>,
): Promise<QueueJobContext> {
  if (!jobId) {
    return { state: null, agentLogId: null };
  }

  let mappedAgentLogId: string | null = null;
  if (redis) {
    mappedAgentLogId = await redis.get(`job:mapping:${jobId}`);
  }

  try {
    const { getNewsAgentQueue } = await import("@/lib/queue");
    const queue = getNewsAgentQueue();
    if (!queue) {
      return { state: null, agentLogId: mappedAgentLogId };
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return { state: null, agentLogId: mappedAgentLogId };
    }

    const jobAgentLogId =
      typeof job.data?.agentLogId === "string" ? job.data.agentLogId : null;

    return {
      state: await job.getState(),
      agentLogId: jobAgentLogId ?? mappedAgentLogId,
    };
  } catch {
    return { state: null, agentLogId: mappedAgentLogId };
  }
}

async function getProgressSnapshot(
  redis: ReturnType<typeof getRedis>,
  agentLogId: string,
  progressUpdates: unknown,
): Promise<{ progress: JobProgressSnapshot | null; logs: string[] }> {
  let progress: JobProgressSnapshot | null = null;
  let logs: string[] = [];

  if (redis) {
    const directProgressData = await redis.get(`job:${agentLogId}:progress`);
    if (directProgressData) {
      progress = JSON.parse(directProgressData) as JobProgressSnapshot;
    }

    if (!progress) {
      const timelineProgress = await redis.lrange(
        `job:progress:${agentLogId}`,
        0,
        0,
      );
      if (timelineProgress.length > 0) {
        progress = JSON.parse(timelineProgress[0]) as JobProgressSnapshot;
      }
    }

    logs = (await redis.lrange(`job:${agentLogId}:logs`, -50, -1)) || [];
  }

  if (
    !progress &&
    Array.isArray(progressUpdates) &&
    progressUpdates.length > 0
  ) {
    const latestUpdate = progressUpdates[progressUpdates.length - 1] as Record<
      string,
      unknown
    >;

    progress = {
      step:
        typeof latestUpdate.step === "string"
          ? latestUpdate.step
          : typeof latestUpdate.stage === "string"
            ? latestUpdate.stage
            : undefined,
      message:
        typeof latestUpdate.message === "string"
          ? latestUpdate.message
          : undefined,
      progress:
        typeof latestUpdate.progress === "number"
          ? latestUpdate.progress
          : undefined,
      timestamp:
        typeof latestUpdate.timestamp === "string"
          ? latestUpdate.timestamp
          : undefined,
      agent:
        typeof latestUpdate.agent === "string" ? latestUpdate.agent : undefined,
      stage:
        typeof latestUpdate.stage === "string" ? latestUpdate.stage : undefined,
    };
  }

  if (
    logs.length === 0 &&
    Array.isArray(progressUpdates) &&
    progressUpdates.length > 0
  ) {
    logs = progressUpdates.slice(-50).map((entry) => {
      const update = entry as Record<string, unknown>;
      const stage =
        typeof update.stage === "string"
          ? update.stage
          : typeof update.step === "string"
            ? update.step
            : "progress";
      const message =
        typeof update.message === "string"
          ? update.message
          : "İlerleme güncellendi";

      return `[${stage.toUpperCase()}] ${message}`;
    });
  }

  return { progress, logs };
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const [session, adminSession] = await Promise.all([
      auth(),
      getAdminSession(),
    ]);
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    const redis = getRedis();
    const requestedJobContext = await resolveQueueJobContext(jobId, redis);

    const [requestedLog, runningLog, latestLog] = await Promise.all([
      requestedJobContext.agentLogId
        ? db.agentLog.findUnique({
            where: { id: requestedJobContext.agentLogId },
            select: {
              id: true,
              status: true,
              articlesCreated: true,
              articlesScraped: true,
              duration: true,
              executionTime: true,
              errors: true,
              progressUpdates: true,
            },
          })
        : Promise.resolve(null),
      db.agentLog.findFirst({
        where: { status: "RUNNING" },
        orderBy: { executionTime: "desc" },
        select: {
          id: true,
          status: true,
          articlesCreated: true,
          articlesScraped: true,
          duration: true,
          executionTime: true,
          errors: true,
          progressUpdates: true,
        },
      }),
      db.agentLog.findFirst({
        orderBy: { executionTime: "desc" },
        select: {
          id: true,
          status: true,
          articlesCreated: true,
          articlesScraped: true,
          duration: true,
          executionTime: true,
          errors: true,
          progressUpdates: true,
        },
      }),
    ]);

    const targetLog = requestedLog ?? runningLog ?? latestLog;
    const { progress, logs } = targetLog
      ? await getProgressSnapshot(
          redis,
          targetLog.id,
          targetLog.progressUpdates,
        )
      : { progress: null, logs: [] };

    const isQueueJobActive =
      requestedJobContext.state === "waiting" ||
      requestedJobContext.state === "delayed" ||
      requestedJobContext.state === "active";

    const isRunning = isQueueJobActive || targetLog?.status === "RUNNING";

    return NextResponse.json({
      success: true,
      data: {
        isRunning,
        requestedJobId: jobId,
        requestedJobState: requestedJobContext.state,
        requestedAgentLogId: requestedJobContext.agentLogId,
        latestLog: targetLog
          ? {
              id: targetLog.id,
              status: targetLog.status,
              articlesCreated: targetLog.articlesCreated,
              articlesScraped: targetLog.articlesScraped,
              duration: targetLog.duration,
              executionTime: targetLog.executionTime,
              errors: targetLog.errors,
            }
          : null,
        progress,
        logs,
      },
    });
  } catch (error) {
    console.error("Job progress error:", error);
    return NextResponse.json(
      { error: "Progress bilgisi alınamadı" },
      { status: 500 },
    );
  }
}
