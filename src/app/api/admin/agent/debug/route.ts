import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRedis } from "@/lib/redis";

/**
 * Debug endpoint to check agent job status and failed job reasons
 * GET /api/admin/agent/debug
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
