import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  checkSimpleRateLimit,
  getSimpleRateLimitHeaders,
} from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

const BATCH_DETAIL_READ_LIMIT = 180;
const BATCH_DETAIL_WINDOW_SECONDS = 60;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  return "unknown";
}

function toUiAction(action: string): "queue_recovery" | "notify_google" | "both" | "recover_then_notify" {
  const map: Record<string, "queue_recovery" | "notify_google" | "both" | "recover_then_notify"> = {
    QUEUE_RECOVERY: "queue_recovery",
    NOTIFY_GOOGLE: "notify_google",
    BOTH: "both",
    RECOVER_THEN_NOTIFY: "recover_then_notify",
  };
  return map[action] ?? "both";
}

function toUiItemStatus(status: string): "queued" | "notified" | "both" | "skipped" | "failed" {
  const map: Record<string, "queued" | "notified" | "both" | "skipped" | "failed"> = {
    QUEUED: "queued",
    NOTIFIED: "notified",
    BOTH: "both",
    SKIPPED: "skipped",
    FAILED: "failed",
  };
  return map[status] ?? "failed";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  const rateLimitResult = await checkSimpleRateLimit(
    `admin:coverage-recovery:batch-detail:${session.id}:${getClientIp(request)}`,
    BATCH_DETAIL_READ_LIMIT,
    BATCH_DETAIL_WINDOW_SECONDS,
  );
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: getSimpleRateLimitHeaders(rateLimitResult, BATCH_DETAIL_READ_LIMIT),
      },
    );
  }

  const { batchId } = await params;
  const limitParam = Number(request.nextUrl.searchParams.get("limit") || "500");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 2000) : 500;

  const batch = await db.coverageRecoveryBatch.findUnique({
    where: { id: batchId },
    include: {
      category: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      items: {
        orderBy: { createdAt: "asc" },
        take: limit,
      },
      _count: { select: { items: true } },
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

  return NextResponse.json({
    success: true,
    batch: {
      ...batch,
      action: toUiAction(batch.action),
      items: batch.items.map((item) => ({
        ...item,
        status: toUiItemStatus(item.status),
      })),
    },
  });
}
