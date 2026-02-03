/**
 * Bulk SEO Optimization API
 * POST /api/admin/seo/bulk-optimize
 *
 * Toplu SEO optimizasyonu başlatır (queue'ya job ekler)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";
import { z } from "zod";
import { nanoid } from "nanoid";

// Request validation schema
const BulkOptimizeSchema = z.object({
  articleIds: z.array(z.string().uuid()).min(1).max(1000),
  batchSize: z.number().int().min(1).max(100).optional().default(10),
});

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = BulkOptimizeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { articleIds, batchSize } = validation.data;

    // Get SEO optimization queue
    const queue = getQueue(QUEUE_NAMES.SEO_OPTIMIZATION);
    if (!queue) {
      return NextResponse.json(
        { error: "SEO optimization queue not available" },
        { status: 503 },
      );
    }

    // Generate unique job ID
    const jobId = nanoid();

    // Add job to queue
    const job = await queue.add(
      "bulk-optimize",
      {
        articleIds,
        jobId,
        batchSize,
      },
      {
        jobId: `seo-optimize-${jobId}`,
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

    return NextResponse.json(
      {
        success: true,
        jobId,
        bullJobId: job.id,
        status: "queued",
        message: `${articleIds.length} makale optimizasyon kuyruğuna eklendi`,
        progress: {
          current: 0,
          total: articleIds.length,
          percentage: 0,
        },
      },
      { status: 202 }, // Accepted
    );
  } catch (error) {
    console.error("Bulk optimize error:", error);

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
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const queue = getQueue(QUEUE_NAMES.SEO_OPTIMIZATION);
    if (!queue) {
      return NextResponse.json(
        { error: "SEO optimization queue not available" },
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
        name: QUEUE_NAMES.SEO_OPTIMIZATION,
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
