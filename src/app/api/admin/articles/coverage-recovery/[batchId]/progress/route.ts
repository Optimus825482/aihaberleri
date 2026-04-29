import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";
import { db } from "@/lib/db";
import {
  checkSimpleRateLimit,
  getSimpleRateLimitHeaders,
} from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

const BATCH_PROGRESS_READ_LIMIT = 180;
const BATCH_PROGRESS_WINDOW_SECONDS = 60;

type QueueRuntimeStatus = "waiting" | "active" | "completed" | "failed" | "delayed" | "missing";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  return "unknown";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  const rateLimitResult = await checkSimpleRateLimit(
    `admin:coverage-recovery:batch-progress:${session.id}:${getClientIp(request)}`,
    BATCH_PROGRESS_READ_LIMIT,
    BATCH_PROGRESS_WINDOW_SECONDS,
  );
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: getSimpleRateLimitHeaders(rateLimitResult, BATCH_PROGRESS_READ_LIMIT),
      },
    );
  }

  const { batchId } = await params;

  const batch = await db.coverageRecoveryBatch.findUnique({
    where: { id: batchId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!batch) {
    return NextResponse.json({ success: false, error: "Batch bulunamadı" }, { status: 404 });
  }

  const isOwner = batch.createdById === session.id;
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  if (!isOwner && !isSuperAdmin) {
    return NextResponse.json({ success: false, error: "Bu batch için erişim izniniz yok" }, { status: 403 });
  }

  const queue = getQueue(QUEUE_NAMES.SLUG_RECOVERY);
  const queueStates = new Map<string, QueueRuntimeStatus>();

  if (queue) {
    const jobIds = batch.items
      .map((item) => item.jobId)
      .filter((jobId): jobId is string => Boolean(jobId));

    const jobs = await Promise.all(jobIds.map((jobId) => queue.getJob(jobId)));

    await Promise.all(
      jobs.map(async (job, index) => {
        const jobId = jobIds[index];
        if (!job) {
          queueStates.set(jobId, "missing");
          return;
        }

        const state = await job.getState();
        if (state === "completed") {
          queueStates.set(jobId, "completed");
          return;
        }

        if (state === "failed") {
          queueStates.set(jobId, "failed");
          return;
        }

        if (state === "active") {
          queueStates.set(jobId, "active");
          return;
        }

        if (state === "delayed") {
          queueStates.set(jobId, "delayed");
          return;
        }

        if (state === "waiting" || state === "waiting-children") {
          queueStates.set(jobId, "waiting");
          return;
        }

        queueStates.set(jobId, "missing");
      }),
    );
  }

  const items = batch.items.map((item) => ({
    id: item.id,
    inputUrl: item.inputUrl,
    normalizedUrl: item.normalizedUrl,
    slug: item.slug,
    locale: item.locale,
    jobId: item.jobId,
    status: item.status,
    reason: item.reason,
    queued: item.queued,
    notified: item.notified,
    queueStatus: item.jobId ? queueStates.get(item.jobId) ?? "missing" : "missing",
    updatedAt: item.updatedAt,
  }));

  const queueSummary = items.reduce(
    (acc, item) => {
      const key = item.queueStatus;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      missing: 0,
    } as Record<QueueRuntimeStatus, number>,
  );

  return NextResponse.json({
    success: true,
    batch: {
      id: batch.id,
      status: batch.status,
      totalItems: batch.totalItems,
      recoverableItems: batch.recoverableItems,
      queuedItems: batch.queuedItems,
      notifiedItems: batch.notifiedItems,
      skippedItems: batch.skippedItems,
      failedItems: batch.failedItems,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
    },
    queueSummary,
    items,
  });
}
