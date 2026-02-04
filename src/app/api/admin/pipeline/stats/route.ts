import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllQueueStats, QUEUE_NAMES } from "@/lib/queue-manager";
import { CircuitBreaker } from "@/lib/circuit-breaker";
import { getScheduleInfo } from "@/lib/smart-scheduler";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get queue stats
    const queueStats = await getAllQueueStats();

    // Get circuit breaker status
    const circuits = Array.from(CircuitBreaker.getAllCircuits().entries()).map(
      ([name, circuit]) => {
        const metrics = circuit.getMetrics();
        return {
          name,
          state: metrics.currentState,
          failureRate: metrics.failureRate,
          totalRequests: metrics.totalRequests,
          lastFailure: metrics.lastFailure?.toISOString() || null,
        };
      },
    );

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
      circuits.push(
        ...defaultCircuits.map((name) => ({
          name,
          state: "CLOSED" as const,
          failureRate: 0,
          totalRequests: 0,
          lastFailure: null,
        })),
      );
    }

    // Get schedule info
    let schedule;
    try {
      schedule = await getScheduleInfo();
      // Convert Date to string for JSON
      schedule = {
        ...schedule,
        nextRun: schedule.nextRun.toISOString(),
      };
    } catch {
      schedule = {
        interval: 15,
        reason: "NORMAL",
        turkeyTime: new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        nextRun: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        isWeekend: false,
        isBreakingNews: false,
        multiplier: 1,
      };
    }

    // Map queue stats to agent format
    const agentNames = [
      "content-collector",
      "relevance-filter",
      "duplicate-detector",
      "content-enricher",
      "visual-generator",
      "database-publisher",
    ];

    const queueNameMap: Record<string, string> = {
      "content-collector": QUEUE_NAMES.COLLECTED_ARTICLES,
      "relevance-filter": QUEUE_NAMES.RELEVANT_ARTICLES,
      "duplicate-detector": QUEUE_NAMES.UNIQUE_ARTICLES,
      "content-enricher": QUEUE_NAMES.ENRICHED_ARTICLES,
      "visual-generator": QUEUE_NAMES.ARTICLES_WITH_VISUALS,
      "database-publisher": QUEUE_NAMES.DATABASE_PUBLISHER,
    };

    const agents = agentNames.map((name) => {
      const queueName = queueNameMap[name];
      const stat = queueStats.find((s) => s?.queueName === queueName);

      return {
        name,
        status:
          stat?.active > 0 ? "running" : stat?.failed > 0 ? "error" : "idle",
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
      orderBy: { createdAt: "desc" },
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
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    return NextResponse.json({
      agents,
      circuits,
      schedule,
      totalArticlesToday,
      successRate,
      lastPipelineRun: lastRun?.createdAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Pipeline stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline stats" },
      { status: 500 },
    );
  }
}
