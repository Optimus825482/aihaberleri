import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  getAllQueueStats,
  getQueueConfig,
  QUEUE_NAMES,
} from "@/lib/queue-manager";
import { db } from "@/lib/db";

/**
 * GET /api/admin/monitoring/workers
 * Worker status endpoint
 * Returns: Orchestrator status, agent statuses, queue stats, success rates
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication check
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    // 2. Parallel queries for better performance
    const [queueStats, orchestratorRuns, recentArticles] = await Promise.all([
      // Get all queue statistics
      getAllQueueStats(),

      // Get orchestrator run history (last 24 hours)
      db.article.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          createdAt: true,
          status: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      }),

      // Get recent articles for processing stats
      db.article.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          publishedAt: true,
        },
      }),
    ]);

    // 3. Calculate orchestrator statistics
    const totalRuns = orchestratorRuns.length;
    const publishedCount = orchestratorRuns.filter(
      (a) => a.status === "PUBLISHED",
    ).length;
    const successRate =
      totalRuns > 0 ? Math.round((publishedCount / totalRuns) * 100) : 0;

    // Calculate average processing time (createdAt to publishedAt)
    const processingTimes = recentArticles
      .filter((a) => a.publishedAt && a.createdAt)
      .map((a) => {
        const created = new Date(a.createdAt).getTime();
        const published = new Date(a.publishedAt!).getTime();
        return published - created;
      });

    const avgProcessingTime =
      processingTimes.length > 0
        ? Math.round(
            processingTimes.reduce((sum, time) => sum + time, 0) /
              processingTimes.length /
              1000,
          ) // Convert to seconds
        : 0;

    // 4. Determine orchestrator status
    const lastRun = orchestratorRuns[0]?.createdAt;
    const timeSinceLastRun = lastRun
      ? Date.now() - new Date(lastRun).getTime()
      : Infinity;

    const orchestratorStatus =
      timeSinceLastRun < 5 * 60 * 1000 // Less than 5 minutes
        ? "running"
        : timeSinceLastRun < 60 * 60 * 1000 // Less than 1 hour
          ? "idle"
          : "stopped";

    // 5. Build agent statistics from queue data
    const agents = [
      {
        name: "ContentCollector",
        queueName: QUEUE_NAMES.COLLECTED_ARTICLES,
        description: "Haber kaynaklarından içerik toplama",
      },
      {
        name: "RelevanceFilter",
        queueName: QUEUE_NAMES.RELEVANT_ARTICLES,
        description: "İçerik relevans skorlaması (AI)",
      },
      {
        name: "DuplicateDetector",
        queueName: QUEUE_NAMES.UNIQUE_ARTICLES,
        description: "Duplicate detection ve filtreleme",
      },
      {
        name: "ContentEnricher",
        queueName: QUEUE_NAMES.ENRICHED_ARTICLES,
        description: "İçerik zenginleştirme (Brave + Jina)",
      },
      {
        name: "VisualGenerator",
        queueName: QUEUE_NAMES.ARTICLES_WITH_VISUALS,
        description: "Görsel oluşturma (Pollinations AI)",
      },
    ];

    const agentStatuses = agents.map((agent) => {
      const queueStat = queueStats.find(
        (q) => q?.queueName === agent.queueName,
      );
      const config = getQueueConfig(agent.queueName);

      if (!queueStat) {
        return {
          name: agent.name,
          description: agent.description,
          status: "error" as const,
          currentJob: null,
          stats: {
            processed: 0,
            failed: 0,
            avgProcessingTime: 0,
            successRate: 0,
          },
          queue: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
          },
        };
      }

      // Determine agent status
      const status =
        queueStat.active > 0
          ? "processing"
          : queueStat.waiting > 0
            ? "idle"
            : "idle";

      // Calculate success rate
      const totalProcessed = queueStat.completed + queueStat.failed;
      const agentSuccessRate =
        totalProcessed > 0
          ? Math.round((queueStat.completed / totalProcessed) * 100)
          : 100;

      // Current job info (if processing)
      const currentJob =
        queueStat.active > 0
          ? {
              id: `${agent.queueName}-current`,
              startedAt: new Date(),
              progress: 50, // Approximate
            }
          : null;

      return {
        name: agent.name,
        description: agent.description,
        status,
        currentJob,
        stats: {
          processed: queueStat.completed,
          failed: queueStat.failed,
          avgProcessingTime: config?.lockDuration
            ? Math.round(config.lockDuration / 1000)
            : 0,
          successRate: agentSuccessRate,
        },
        queue: {
          waiting: queueStat.waiting,
          active: queueStat.active,
          completed: queueStat.completed,
          failed: queueStat.failed,
          delayed: queueStat.delayed,
        },
        config: {
          concurrency: config?.concurrency || 1,
          rateLimit: config?.rateLimit || { max: 10, duration: 1000 },
        },
      };
    });

    // 6. Calculate next run time (approximate)
    const nextRun = new Date(Date.now() + 15 * 60 * 1000); // Assume 15 min interval

    // 7. Build response
    const responseData = {
      success: true,
      data: {
        orchestrator: {
          status: orchestratorStatus,
          lastRun: lastRun || null,
          nextRun: orchestratorStatus !== "stopped" ? nextRun : null,
          stats: {
            totalRuns,
            successRate,
            avgDuration: avgProcessingTime,
            last24Hours: {
              total: totalRuns,
              published: publishedCount,
              failed: totalRuns - publishedCount,
            },
          },
        },
        agents: agentStatuses,
        summary: {
          totalAgents: agents.length,
          activeAgents: agentStatuses.filter((a) => a.status === "processing")
            .length,
          idleAgents: agentStatuses.filter((a) => a.status === "idle").length,
          errorAgents: agentStatuses.filter((a) => a.status === "error").length,
          totalJobsWaiting: queueStats.reduce(
            (sum, q) => sum + (q?.waiting || 0),
            0,
          ),
          totalJobsActive: queueStats.reduce(
            (sum, q) => sum + (q?.active || 0),
            0,
          ),
          totalJobsCompleted: queueStats.reduce(
            (sum, q) => sum + (q?.completed || 0),
            0,
          ),
          totalJobsFailed: queueStats.reduce(
            (sum, q) => sum + (q?.failed || 0),
            0,
          ),
        },
      },
      timestamp: new Date().toISOString(),
    };

    // 8. Add response time header
    const responseTime = Date.now() - startTime;
    const response = NextResponse.json(responseData);
    response.headers.set("X-Response-Time", `${responseTime}ms`);

    // Cache this response for 60 seconds (REALTIME)
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=120",
    );

    return response;
  } catch (error) {
    console.error("Worker status error:", error);

    const responseTime = Date.now() - startTime;
    const response = NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
    response.headers.set("X-Response-Time", `${responseTime}ms`);

    return response;
  }
}
