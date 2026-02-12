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

    // Get latest agent log
    const latestLog = await db.agentLog.findFirst({
      orderBy: { executionTime: "desc" },
      select: {
        id: true,
        status: true,
        articlesCreated: true,
        articlesScraped: true,
        duration: true,
        executionTime: true,
        errors: true,
      },
    });

    // Get progress from Redis if available
    let progress = null;
    let logs: string[] = [];

    if (redis && latestLog) {
      // Get job progress
      const progressData = await redis.get(`job:${latestLog.id}:progress`);
      if (progressData) {
        progress = JSON.parse(progressData);
      }

      // Get recent log messages (last 50)
      const logMessages = await redis.lrange(
        `job:${latestLog.id}:logs`,
        -50,
        -1,
      );
      logs = logMessages || [];
    }

    // Check if agent is currently running
    const isRunning = latestLog?.status === "RUNNING";

    return NextResponse.json({
      success: true,
      data: {
        isRunning,
        latestLog: latestLog
          ? {
              id: latestLog.id,
              status: latestLog.status,
              articlesCreated: latestLog.articlesCreated,
              articlesScraped: latestLog.articlesScraped,
              duration: latestLog.duration,
              executionTime: latestLog.executionTime,
              errors: latestLog.errors,
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
