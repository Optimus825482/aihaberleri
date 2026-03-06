import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { PIPELINE_STEP_DEFINITIONS } from "@/lib/pipeline-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session; // Return 401 response
  }

  try {
    // Try to get queue stats (may fail if Redis not available)
    let queueStats: Array<{
      queueName: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    }> = [];
    try {
      const { getAllQueueStats } = await import("@/lib/queue-manager");
      queueStats = (await getAllQueueStats()) || [];
    } catch (queueError) {
      console.warn("Queue stats unavailable:", queueError);
    }

    // Try to get circuit breaker status
    let circuits: Array<{
      name: string;
      state: string;
      failureRate: number;
      totalRequests: number;
      lastFailure: string | null;
    }> = [];
    try {
      const { CircuitBreaker } = await import("@/lib/circuit-breaker");
      const allCircuits = CircuitBreaker.getAllCircuits();
      circuits = Array.from(allCircuits.entries()).map(([name, circuit]) => {
        const metrics = circuit.getMetrics();
        const total = metrics.totalSuccesses + metrics.totalFailures;
        return {
          name,
          state: metrics.state,
          failureRate: total > 0 ? (metrics.totalFailures / total) * 100 : 0,
          totalRequests: total,
          lastFailure: metrics.lastFailureTime
            ? new Date(metrics.lastFailureTime).toISOString()
            : null,
        };
      });
    } catch (circuitError) {
      console.warn("Circuit breaker stats unavailable:", circuitError);
    }

    // If no circuits registered yet, show default ones
    if (circuits.length === 0) {
      const defaultCircuits = [
        "deepseek",
        "gemini",
        "pollinations",
        "searxng",
        "jina",
        "tavily",
      ];
      circuits = defaultCircuits.map((name) => ({
        name,
        state: "CLOSED",
        failureRate: 0,
        totalRequests: 0,
        lastFailure: null,
      }));
    }

    // Try to get schedule info
    let schedule: {
      interval: number;
      reason: string;
      turkeyTime: string;
      nextRun: string;
      isWeekend: boolean;
      isBreakingNews: boolean;
    } = {
      interval: 15,
      reason: "NORMAL",
      turkeyTime: new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      nextRun: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      isWeekend: false,
      isBreakingNews: false,
    };
    try {
      const { getScheduleInfo } = await import("@/lib/smart-scheduler");
      const scheduleData = await getScheduleInfo();
      schedule = {
        interval: scheduleData.interval,
        reason: scheduleData.reason,
        turkeyTime: scheduleData.turkeyTime,
        nextRun: scheduleData.nextRun.toISOString(),
        isWeekend: scheduleData.isWeekend,
        isBreakingNews: scheduleData.isBreakingNews,
      };
    } catch (scheduleError) {
      console.warn("Schedule info unavailable:", scheduleError);
    }

    // Map queue stats to registry-defined pipeline steps
    const agents = PIPELINE_STEP_DEFINITIONS.map((step) => {
      const stat = queueStats.find((s) => s?.queueName === step.queueName);

      return {
        name: step.id,
        displayName: step.displayName,
        status:
          (stat?.active ?? 0) > 0
            ? "running"
            : (stat?.failed ?? 0) > 0
              ? "error"
              : "idle",
        queueCount: (stat?.waiting || 0) + (stat?.active || 0),
        processedCount: stat?.completed || 0,
        lastRun: null,
        avgProcessingTime: 0,
      };
    });

    // Get today's article count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalArticlesToday = await db.article.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });

    // Get success rate from agent logs
    const recentLogs = await db.agentLog.findMany({
      take: 100,
      orderBy: { executionTime: "desc" },
      select: { status: true },
    });

    const successRate =
      recentLogs.length > 0
        ? (recentLogs.filter((l) => l.status === "SUCCESS").length /
            recentLogs.length) *
          100
        : 100;

    // Get last pipeline run
    const lastRun = await db.agentLog.findFirst({
      orderBy: { executionTime: "desc" },
      select: { executionTime: true },
    });

    return NextResponse.json({
      agents,
      circuits,
      schedule,
      totalArticlesToday,
      successRate,
      lastPipelineRun: lastRun?.executionTime?.toISOString() || null,
    });
  } catch (error) {
    console.error("Pipeline stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline stats" },
      { status: 500 },
    );
  }
}
