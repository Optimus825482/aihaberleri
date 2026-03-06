import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth } from "@/lib/admin-auth";
import { PIPELINE_STEP_DEFINITIONS } from "@/lib/pipeline-registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Helper function to get flag emoji
function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode === "XX") return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

async function getRealtimeData() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parallel fetch all data
  const [
    activeVisitors,
    todayArticles,
    recentArticles,
    totalViews,
    queueStats,
    circuits,
  ] = await Promise.all([
    // Active visitors (last 5 minutes)
    db.visitor.findMany({
      where: { lastActivity: { gte: fiveMinutesAgo } },
      select: {
        id: true,
        currentPage: true,
        country: true,
        countryCode: true,
        city: true,
        lastActivity: true,
      },
      orderBy: { lastActivity: "desc" },
      take: 50,
    }),

    // Today's articles count
    db.article.count({
      where: { createdAt: { gte: today } },
    }),

    // Recent published articles (last 5)
    db.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        views: true,
        category: { select: { name: true, slug: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),

    // Today's total views
    db.article.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { views: true },
    }),

    // Queue stats (try-catch for Redis availability)
    (async () => {
      try {
        const { getAllQueueStats } = await import("@/lib/queue-manager");
        return await getAllQueueStats();
      } catch {
        return [];
      }
    })(),

    // Circuit breaker status
    (async () => {
      try {
        const { CircuitBreaker } = await import("@/lib/circuit-breaker");
        const allCircuits = CircuitBreaker.getAllCircuits();
        return Array.from(allCircuits.entries()).map(([name, circuit]) => {
          const metrics = circuit.getMetrics();
          const total = metrics.totalSuccesses + metrics.totalFailures;
          return {
            name,
            state: metrics.state,
            failureRate:
              total > 0 ? Math.round((metrics.totalFailures / total) * 100) : 0,
          };
        });
      } catch {
        return [];
      }
    })(),
  ]);

  // Process visitor data
  const enrichedVisitors = activeVisitors.map((v) => ({
    id: v.id,
    page: v.currentPage || "/",
    location: [v.city, v.country].filter(Boolean).join(", ") || "Unknown",
    flag: getFlagEmoji(v.countryCode || ""),
    lastActivity: v.lastActivity,
  }));

  // Country distribution
  const countryMap = new Map<string, { count: number; flag: string }>();
  activeVisitors.forEach((v) => {
    const country = v.country || "Unknown";
    const existing = countryMap.get(country);
    if (existing) {
      existing.count++;
    } else {
      countryMap.set(country, {
        count: 1,
        flag: getFlagEmoji(v.countryCode || ""),
      });
    }
  });

  // Queue summary
  const queueSummary = {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
  };
  (queueStats || []).forEach((q: any) => {
    queueSummary.waiting += q?.waiting || 0;
    queueSummary.active += q?.active || 0;
    queueSummary.completed += q?.completed || 0;
    queueSummary.failed += q?.failed || 0;
  });

  // Agent status from queues
  const agentStatus = PIPELINE_STEP_DEFINITIONS.map((step) => {
    const stat = (queueStats || []).find(
      (q: any) => q?.queueName === step.queueName,
    );

    return {
      name: step.id,
      active: stat?.active || 0,
      waiting: stat?.waiting || 0,
      completed: stat?.completed || 0,
      failed: stat?.failed || 0,
      isRunning: (stat?.active || 0) > 0,
    };
  });

  return {
    timestamp: now.toISOString(),
    visitors: {
      active: activeVisitors.length,
      list: enrichedVisitors.slice(0, 10),
      countries: Array.from(countryMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    },
    articles: {
      todayCount: todayArticles,
      todayViews: totalViews._sum.views || 0,
      recent: recentArticles.map((a) => ({
        id: a.id,
        title: a.title.length > 50 ? a.title.substring(0, 50) + "..." : a.title,
        slug: a.slug,
        category: a.category?.name || "Genel",
        publishedAt: a.publishedAt,
        views: a.views,
      })),
    },
    pipeline: {
      queue: queueSummary,
      agents: agentStatus,
      circuits:
        circuits.length > 0
          ? circuits
          : [
              { name: "deepseek", state: "CLOSED", failureRate: 0 },
              { name: "gemini", state: "CLOSED", failureRate: 0 },
              { name: "pollinations", state: "CLOSED", failureRate: 0 },
              { name: "searxng", state: "CLOSED", failureRate: 0 },
              { name: "jina", state: "CLOSED", failureRate: 0 },
              { name: "tavily", state: "CLOSED", failureRate: 0 },
            ],
      isProcessing: queueSummary.active > 0,
    },
  };
}

export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof Response) {
    return session;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendData = async () => {
        try {
          const data = await getRealtimeData();
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error("Realtime data error:", error);
          const errorMessage = `data: ${JSON.stringify({ error: "Failed to fetch data" })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
        }
      };

      // Send initial data immediately
      await sendData();

      // Send updates every 3 seconds
      const interval = setInterval(async () => {
        try {
          await sendData();
        } catch {
          // Stream might be closed
          clearInterval(interval);
        }
      }, 3000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
