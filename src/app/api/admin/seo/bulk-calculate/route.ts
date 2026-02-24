/**
 * Bulk SEO Calculation API
 * POST /api/admin/seo/bulk-calculate
 *
 * Toplu SEO skorları hesaplar (queue'ya job ekler)
 */

import { NextRequest, NextResponse } from "next/server";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";
import { db } from "@/lib/db";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireAdminAuth, type AdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function hasRequiredRole(session: AdminSession, roles: string[]) {
  return roles.includes(session.role) || session.role === "SUPER_ADMIN";
}

// Request validation schema
const BulkCalculateSchema = z.object({
  articleIds: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  batchSize: z.number().int().min(1).max(100).optional().default(100),
});

export async function POST(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }
  if (!hasRequiredRole(session, ["ADMIN"])) {
    return NextResponse.json({ error: "Yetki yetersiz" }, { status: 403 });
  }

  try {
    // TODO: Add auth check when NextAuth is properly configured (REMOVED - now handled by withAuth)
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // Parse and validate request body
    const body = await request.json();
    const validation = BulkCalculateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { articleIds, all, status, batchSize } = validation.data;

    // Get articles to process
    let articles;
    if (all) {
      articles = await db.article.findMany({
        where: {
          ...(status && { status }),
        },
        select: { id: true },
      });
    } else if (articleIds && articleIds.length > 0) {
      articles = await db.article.findMany({
        where: {
          id: { in: articleIds },
        },
        select: { id: true },
      });
    } else {
      return NextResponse.json(
        {
          error: "articleIds veya all parametresi gerekli",
        },
        { status: 400 },
      );
    }

    if (articles.length === 0) {
      return NextResponse.json(
        {
          error: "İşlenecek makale bulunamadı",
        },
        { status: 404 },
      );
    }

    // Get SEO calculation queue
    const queue = getQueue(QUEUE_NAMES.SEO_CALCULATION);
    if (!queue) {
      return NextResponse.json(
        { error: "SEO calculation queue not available" },
        { status: 503 },
      );
    }

    // Generate unique job ID
    const jobId = nanoid();

    // Add job to queue
    const job = await queue.add(
      "bulk-calculate",
      {
        articleIds: articles.map((a) => a.id),
        jobId,
        batchSize,
      },
      {
        jobId: `seo-calculate-${jobId}`,
        removeOnComplete: {
          count: 100,
          age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
          count: 50,
        },
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    );

    const articleIdList = articles.map((a: { id: string }) => a.id);

    return NextResponse.json(
      {
        success: true,
        jobId,
        bullJobId: job.id,
        status: "queued",
        message: `${articleIdList.length} makale hesaplama kuyruğuna eklendi`,
        progress: {
          current: 0,
          total: articleIdList.length,
          percentage: 0,
        },
      },
      { status: 202 }, // Accepted
    );
  } catch (error) {
    console.error("Bulk calculate error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

// GET method to check queue status
export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }
  if (!hasRequiredRole(session, ["ADMIN"])) {
    return NextResponse.json({ error: "Yetki yetersiz" }, { status: 403 });
  }

  try {
    // TODO: Add auth check when NextAuth is properly configured (REMOVED - now handled by withAuth)
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const queue = getQueue(QUEUE_NAMES.SEO_CALCULATION);
    if (!queue) {
      return NextResponse.json(
        { error: "SEO calculation queue not available" },
        { status: 503 },
      );
    }

    // Get queue stats
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return NextResponse.json({
      success: true,
      queue: {
        name: QUEUE_NAMES.SEO_CALCULATION,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      },
    });
  } catch (error) {
    console.error("Queue status error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
