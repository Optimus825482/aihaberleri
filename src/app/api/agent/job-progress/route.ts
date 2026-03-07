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

async function resolveQueueJobState(jobId: string | null) {
  if (!jobId) {
    return null;
  }

  try {
    const { getNewsAgentQueue } = await import("@/lib/queue");
    const queue = getNewsAgentQueue();
    if (!queue) {
      return null;
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return await job.getState();
  } catch {
    return null;
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
    const requestedJobState = await resolveQueueJobState(jobId);

    const [runningLog, latestLog] = await Promise.all([
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

    const targetLog = runningLog ?? latestLog;
    const { progress, logs } = targetLog
      ? await getProgressSnapshot(
          redis,
          targetLog.id,
          targetLog.progressUpdates,
        )
      : { progress: null, logs: [] };

    const isQueueJobActive =
      requestedJobState === "waiting" ||
      requestedJobState === "delayed" ||
      requestedJobState === "active";

    const isRunning = isQueueJobActive || targetLog?.status === "RUNNING";

    return NextResponse.json({
      success: true,
      data: {
        isRunning,
        requestedJobId: jobId,
        requestedJobState,
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
