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
        "google-news",
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

    // Fetch per-step span stats from PipelineSpan (last 24h)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let spanStatsByName: Array<{
      name: string;
      _count: { _all: number };
      _avg: { duration: number | null };
      _max: { completedAt: Date | null };
    }> = [];
    try {
      spanStatsByName = await db.pipelineSpan.groupBy({
        by: ["name"],
        where: {
          startedAt: { gte: since24h },
          status: "SUCCESS",
        },
        _count: true,
        _avg: { duration: true },
        _max: { completedAt: true },
      }) as any;
    } catch {
      // PipelineSpan table might not exist yet or no data
    }

    const spanStatsMap = new Map(
      spanStatsByName.map((s) => [s.name, s]),
    );

    // Map queue stats to registry-defined pipeline steps
    const agents = PIPELINE_STEP_DEFINITIONS.map((step) => {
      const stat = queueStats.find((s) => s?.queueName === step.queueName);
      const active = stat?.active ?? 0;
      const waiting = stat?.waiting ?? 0;
      const failed = stat?.failed ?? 0;
      const delayed = (stat as { delayed?: number } | undefined)?.delayed ?? 0;
      const queueCount = waiting + active + delayed;

      let status = "idle";
      if (active > 0) {
        status = "running";
      } else if (queueCount > 0) {
        status = "queued";
      } else if (failed > 0 && (stat?.completed ?? 0) === 0) {
        status = "error";
      }

      // Try to get real timing from PipelineSpan (matches by step id = span name convention)
      const spanStat = spanStatsMap.get(step.id);
      const lastRun = spanStat?._max?.completedAt?.toISOString() ?? null;
      const avgProcessingTime = Math.round(spanStat?._avg?.duration ?? 0);

      return {
        name: step.id,
        displayName: step.displayName,
        status,
        queueCount,
        processedCount: stat?.completed || 0,
        failedCount: failed,
        lastRun,
        avgProcessingTime,
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
