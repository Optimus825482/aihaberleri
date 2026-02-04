import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getRedis } from "@/lib/redis";

/**
 * Debug endpoint to check agent job status and failed job reasons
 * GET /api/admin/agent/debug
 */
export async function GET() {
  try {
    // Check authentication
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis not available" },
        { status: 503 },
      );
    }

    // Import queue dynamically
    const { getNewsAgentQueue } = await import("@/lib/queue");
    const queue = getNewsAgentQueue();

    if (!queue) {
      return NextResponse.json(
        { error: "Queue not available" },
        { status: 503 },
      );
    }

    // Get all job states
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getJobs(["waiting"]),
      queue.getJobs(["active"]),
      queue.getJobs(["completed"]),
      queue.getJobs(["failed"]),
      queue.getJobs(["delayed"]),
    ]);

    // Get worker heartbeat
    const heartbeat = await redis.get("worker:heartbeat");
    const workerAlive = heartbeat
      ? Date.now() - parseInt(heartbeat) < 120000 // Within last 2 minutes
      : false;

    // Get queue counts
    const counts = await queue.getJobCounts();

    // Get failed job details
    const failedJobDetails = await Promise.all(
      failed.slice(0, 10).map(async (job) => ({
        id: job.id,
        name: job.name,
        timestamp: new Date(job.timestamp).toISOString(),
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace?.slice(0, 3), // First 3 lines only
        data: job.data,
      })),
    );

    // Get active job details
    const activeJobDetails = await Promise.all(
      active.map(async (job) => ({
        id: job.id,
        name: job.name,
        timestamp: new Date(job.timestamp).toISOString(),
        attemptsMade: job.attemptsMade,
        progress: await job.progress,
      })),
    );

    return NextResponse.json({
      success: true,
      worker: {
        alive: workerAlive,
        lastHeartbeat: heartbeat
          ? new Date(parseInt(heartbeat)).toISOString()
          : null,
        heartbeatAge: heartbeat
          ? Math.round((Date.now() - parseInt(heartbeat)) / 1000) + "s ago"
          : "never",
      },
      queue: {
        name: "news-agent",
        counts,
      },
      jobs: {
        waiting: waiting.length,
        active: activeJobDetails,
        completed: completed.length,
        failed: failedJobDetails,
        delayed: delayed.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/agent/debug
 * Clean up stalled/failed jobs and reset queue
 */
export async function POST(request: Request) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || "clean";

    const { getNewsAgentQueue } = await import("@/lib/queue");
    const queue = getNewsAgentQueue();

    if (!queue) {
      return NextResponse.json(
        { error: "Queue not available" },
        { status: 503 },
      );
    }

    const results: any = { action, cleaned: {} };

    if (action === "clean" || action === "clean-all") {
      // Get stalled/failed/completed jobs
      const [failed, completed, active] = await Promise.all([
        queue.getJobs(["failed"]),
        queue.getJobs(["completed"]),
        queue.getJobs(["active"]),
      ]);

      // Remove failed jobs
      let failedRemoved = 0;
      for (const job of failed) {
        await job.remove();
        failedRemoved++;
      }
      results.cleaned.failed = failedRemoved;

      // Remove old completed jobs (keep last 10)
      const completedToRemove = completed.slice(10);
      let completedRemoved = 0;
      for (const job of completedToRemove) {
        await job.remove();
        completedRemoved++;
      }
      results.cleaned.completed = completedRemoved;

      // Check for stalled active jobs (running > 30 minutes)
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      let stalledRemoved = 0;
      for (const job of active) {
        if (job.timestamp < thirtyMinutesAgo) {
          console.log(
            `Removing stalled job: ${job.id} (started at ${new Date(job.timestamp).toISOString()})`,
          );
          await job.moveToFailed(
            new Error("Job stalled - manually removed"),
            "manual-cleanup",
          );
          await job.remove();
          stalledRemoved++;
        }
      }
      results.cleaned.stalled = stalledRemoved;
    }

    if (action === "drain") {
      // Remove ALL jobs
      await queue.drain();
      results.drained = true;
    }

    if (action === "obliterate") {
      // Nuclear option - completely remove queue
      await queue.obliterate({ force: true });
      results.obliterated = true;
    }

    // Get updated counts
    const counts = await queue.getJobCounts();
    results.currentCounts = counts;
    results.timestamp = new Date().toISOString();

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Debug cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
