import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getQueueStats } from "@/lib/queue";

/**
 * Agent Health Check Endpoint
 * Returns status of agent, worker, and scheduler
 */
export async function GET() {
  try {
    const [enabledSetting, nextRunSetting, lastRunSetting, intervalSetting] =
      await Promise.all([
        db.setting.findUnique({ where: { key: "agent.enabled" } }),
        db.setting.findUnique({ where: { key: "agent.nextRun" } }),
        db.setting.findUnique({ where: { key: "agent.lastRun" } }),
        db.setting.findUnique({ where: { key: "agent.intervalHours" } }),
      ]);

    const isEnabled = enabledSetting?.value !== "false";
    const nextRun = nextRunSetting?.value
      ? new Date(nextRunSetting.value)
      : null;
    const lastRun = lastRunSetting?.value
      ? new Date(lastRunSetting.value)
      : null;
    const intervalHours = intervalSetting ? parseInt(intervalSetting.value) : 6;

    // Check queue stats
    const queueStats = await getQueueStats();

    // Check if worker is available
    let workerStatus = "unknown";
    try {
      const { newsAgentQueue } = await import("@/lib/queue");
      if (newsAgentQueue) {
        const workers = await newsAgentQueue.getWorkers();
        workerStatus = workers.length > 0 ? "connected" : "disconnected";
      } else {
        workerStatus = "unavailable";
      }
    } catch {
      workerStatus = "error";
    }

    // Calculate time until next run
    let timeUntilNextRun: number | null = null;
    if (nextRun && isEnabled) {
      timeUntilNextRun = Math.max(0, nextRun.getTime() - Date.now());
    }

    // Get recent logs
    const recentLogs = await db.agentLog.findMany({
      take: 5,
      orderBy: { executionTime: "desc" },
      select: {
        id: true,
        status: true,
        executionTime: true,
        articlesCreated: true,
        duration: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        agent: {
          enabled: isEnabled,
          intervalHours,
          lastRun: lastRun?.toISOString() || null,
          nextRun: nextRun?.toISOString() || null,
          timeUntilNextRunMs: timeUntilNextRun,
        },
        worker: {
          status: workerStatus,
          mode:
            workerStatus === "connected"
              ? "bullmq"
              : workerStatus === "disconnected"
                ? "in-process-fallback"
                : "unknown",
        },
        queue: queueStats,
        recentExecutions: recentLogs,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
