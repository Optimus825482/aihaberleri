/**
 * SEO Job Progress API
 * GET /api/admin/seo/progress/[jobId]
 *
 * SEO job'ının progress durumunu Redis'ten okur
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRedis } from "@/lib/redis";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";

interface ProgressData {
  status: string;
  progress: number;
  current: number;
  total: number;
  timestamp: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis not available" },
        { status: 503 },
      );
    }

    // Try both optimization and calculation keys
    const [optimizationData, calculationData] = await Promise.all([
      redis.get(`seo:optimization:${jobId}`),
      redis.get(`seo:calculation:${jobId}`),
    ]);

    const progressData = optimizationData || calculationData;

    if (!progressData) {
      // Check if job exists in queue
      const queue = getQueue(QUEUE_NAMES.SEO_OPTIMIZATION);
      if (queue) {
        const job = await queue.getJob(`seo-optimize-${jobId}`);
        if (job) {
          const state = await job.getState();
          const progress = (await job.progress) as number;

          return NextResponse.json({
            success: true,
            jobId,
            status: state,
            progress: progress || 0,
            current: 0,
            total: 0,
            timestamp: new Date(job.timestamp).toISOString(),
            message: `Job is ${state}`,
          });
        }
      }

      // Job not found
      return NextResponse.json(
        {
          error: "Job not found",
          message: "Job ID bulunamadı veya süresi dolmuş",
        },
        { status: 404 },
      );
    }

    // Parse progress data
    const progress: ProgressData = JSON.parse(progressData);

    // Get additional job details from BullMQ
    let jobDetails = null;
    const queue = getQueue(QUEUE_NAMES.SEO_OPTIMIZATION);
    if (queue) {
      const job = await queue.getJob(`seo-optimize-${jobId}`);
      if (job) {
        const state = await job.getState();
        jobDetails = {
          state,
          attemptsMade: job.attemptsMade,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
        };
      }
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: progress.status,
      progress: progress.progress,
      current: progress.current,
      total: progress.total,
      timestamp: progress.timestamp,
      message: getStatusMessage(progress.status, progress.progress),
      details: jobDetails,
    });
  } catch (error) {
    console.error("Progress check error:", error);

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

/**
 * Get user-friendly status message
 */
function getStatusMessage(status: string, progress: number): string {
  switch (status) {
    case "processing":
      return `İşleniyor... (${progress}%)`;
    case "completed":
      return "Tamamlandı!";
    case "failed":
      return "Başarısız oldu";
    case "queued":
      return "Kuyrukta bekliyor";
    default:
      return `Durum: ${status}`;
  }
}

// DELETE method to cancel a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    const queue = getQueue(QUEUE_NAMES.SEO_OPTIMIZATION);
    if (!queue) {
      return NextResponse.json(
        { error: "SEO optimization queue not available" },
        { status: 503 },
      );
    }

    // Get and remove job
    const job = await queue.getJob(`seo-optimize-${jobId}`);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await job.remove();

    // Clean up Redis progress data
    const redis = getRedis();
    if (redis) {
      await redis.del(`seo:optimization:${jobId}`);
    }

    return NextResponse.json({
      success: true,
      message: "Job iptal edildi",
      jobId,
    });
  } catch (error) {
    console.error("Job cancel error:", error);

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
