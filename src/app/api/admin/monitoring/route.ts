import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import redis from "@/lib/redis";

// Ana monitoring endpoint - tüm metrikleri toplar
export async function GET(request: NextRequest) {
  try {
    // TODO: Add auth check when NextAuth is configured
    // const session = await getServerSession(authOptions);
    // if (
    //   !session?.user ||
    //   !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    // ) {
    //   return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("range") || "1h";

    // Time range hesaplama
    const now = new Date();
    let startTime = new Date();
    switch (timeRange) {
      case "1h":
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "6h":
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case "24h":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Paralel data fetching
    const [
      systemHealth,
      errorLogs,
      performanceMetrics,
      cacheStats,
      workerStats,
    ] = await Promise.all([
      // System Health
      getSystemHealth(),

      // Error Logs
      db.errorLog.findMany({
        where: {
          createdAt: { gte: startTime },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),

      // Performance Metrics
      db.systemMetric.findMany({
        where: {
          timestamp: { gte: startTime },
        },
        orderBy: { timestamp: "asc" },
      }),

      // Cache Stats
      getCacheStats(),

      // Worker Stats
      getWorkerStats(),
    ]);

    // Error rate chart data
    const errorRateData = aggregateErrorsByTime(errorLogs, timeRange);

    // API response chart data
    const apiResponseData = aggregatePerformanceByTime(
      performanceMetrics,
      timeRange,
    );

    // Database stats
    const databaseStats = await getDatabaseStats();

    return NextResponse.json({
      success: true,
      data: {
        systemHealth,
        errorRate: errorRateData,
        apiResponse: apiResponseData,
        database: databaseStats,
        cache: cacheStats,
        workers: workerStats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Monitoring API error:", error);

    // Detaylı hata mesajı
    const errorMessage =
      error instanceof Error ? error.message : "Bilinmeyen hata";
    const errorStack = error instanceof Error ? error.stack : "";

    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Monitoring verileri alınamadı",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

// Helper: System Health
async function getSystemHealth() {
  // Node.js process metrics
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    cpu: Math.min(
      100,
      Math.round(
        ((cpuUsage.user + cpuUsage.system) / (process.uptime() * 1000000)) *
          100,
      ),
    ),
    memory: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    disk: 45, // Mock - gerçek disk kullanımı için OS-specific library gerekir
    uptime: Math.floor(process.uptime()),
  };
}

// Helper: Cache Stats
async function getCacheStats() {
  try {
    const info = await redis.info("stats");
    const lines = info.split("\r\n");

    let hits = 0;
    let misses = 0;
    let evictions = 0;

    lines.forEach((line) => {
      if (line.startsWith("keyspace_hits:")) {
        hits = parseInt(line.split(":")[1]);
      } else if (line.startsWith("keyspace_misses:")) {
        misses = parseInt(line.split(":")[1]);
      } else if (line.startsWith("evicted_keys:")) {
        evictions = parseInt(line.split(":")[1]);
      }
    });

    const total = hits + misses;
    const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0;
    const missRate = 100 - hitRate;

    // Memory usage
    const memoryInfo = await redis.info("memory");
    const memoryLine = memoryInfo
      .split("\r\n")
      .find((l) => l.startsWith("used_memory:"));
    const memoryUsage = memoryLine
      ? parseInt(memoryLine.split(":")[1]) / (1024 * 1024)
      : 0; // MB

    return {
      hitRate,
      missRate,
      evictions,
      memoryUsage: Math.round(memoryUsage),
    };
  } catch (error) {
    console.error("Cache stats error:", error);
    return {
      hitRate: 0,
      missRate: 0,
      evictions: 0,
      memoryUsage: 0,
    };
  }
}

// Helper: Worker Stats
async function getWorkerStats() {
  // Mock worker data - gerçek worker tracking için ayrı tablo gerekir
  const workers = [
    {
      id: "orchestrator",
      name: "Orchestrator Worker",
      status: "active" as const,
      lastRun: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      jobsProcessed: 1247,
    },
    {
      id: "content-collector",
      name: "Content Collector Agent",
      status: "active" as const,
      lastRun: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      jobsProcessed: 892,
    },
    {
      id: "relevance-filter",
      name: "Relevance Filter Agent",
      status: "idle" as const,
      lastRun: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      jobsProcessed: 756,
    },
    {
      id: "duplicate-detector",
      name: "Duplicate Detector Agent",
      status: "active" as const,
      lastRun: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      jobsProcessed: 634,
    },
    {
      id: "content-enricher",
      name: "Content Enricher Agent",
      status: "active" as const,
      lastRun: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      jobsProcessed: 521,
    },
    {
      id: "visual-generator",
      name: "Visual Generator Agent",
      status: "idle" as const,
      lastRun: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      jobsProcessed: 412,
    },
  ];

  return workers;
}

// Helper: Database Stats
async function getDatabaseStats() {
  try {
    // Active connections (mock - gerçek için pg_stat_activity sorgusu gerekir)
    const activeConnections = 12;

    // Slow queries (ErrorLog'dan yavaş query'leri say)
    const slowQueries = await db.errorLog.count({
      where: {
        level: "WARN",
        message: { contains: "slow query" },
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    // Avg query time (mock)
    const avgQueryTime = 45; // ms

    // Pool utilization (mock)
    const poolUtilization = 65; // %

    return {
      activeConnections,
      slowQueries,
      avgQueryTime,
      poolUtilization,
    };
  } catch (error) {
    console.error("Database stats error:", error);
    return {
      activeConnections: 0,
      slowQueries: 0,
      avgQueryTime: 0,
      poolUtilization: 0,
    };
  }
}

// Helper: Aggregate errors by time
function aggregateErrorsByTime(
  errors: any[],
  timeRange: string,
): Array<{ timestamp: string; count: number; type: string }> {
  const bucketSize = getBucketSize(timeRange);
  const buckets = new Map<string, Map<string, number>>();

  errors.forEach((error) => {
    const bucketTime = Math.floor(
      new Date(error.createdAt).getTime() / bucketSize,
    );
    const bucketKey = new Date(bucketTime * bucketSize).toISOString();

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, new Map());
    }

    const typeCounts = buckets.get(bucketKey)!;
    const currentCount = typeCounts.get(error.level) || 0;
    typeCounts.set(error.level, currentCount + 1);
  });

  const result: Array<{ timestamp: string; count: number; type: string }> = [];
  buckets.forEach((typeCounts, timestamp) => {
    typeCounts.forEach((count, type) => {
      result.push({ timestamp, count, type });
    });
  });

  return result.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

// Helper: Aggregate performance by time
function aggregatePerformanceByTime(
  metrics: any[],
  timeRange: string,
): Array<{ timestamp: string; avgTime: number; p95: number; p99: number }> {
  const bucketSize = getBucketSize(timeRange);
  const buckets = new Map<string, number[]>();

  metrics.forEach((metric) => {
    if (metric.metricType === "api_response_time") {
      const bucketTime = Math.floor(
        new Date(metric.timestamp).getTime() / bucketSize,
      );
      const bucketKey = new Date(bucketTime * bucketSize).toISOString();

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }

      buckets.get(bucketKey)!.push(metric.value);
    }
  });

  const result: Array<{
    timestamp: string;
    avgTime: number;
    p95: number;
    p99: number;
  }> = [];

  buckets.forEach((values, timestamp) => {
    if (values.length === 0) return;

    const sorted = values.sort((a, b) => a - b);
    const avgTime = Math.round(
      values.reduce((sum, v) => sum + v, 0) / values.length,
    );
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || avgTime;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || avgTime;

    result.push({ timestamp, avgTime, p95, p99 });
  });

  return result.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

// Helper: Get bucket size based on time range
function getBucketSize(timeRange: string): number {
  switch (timeRange) {
    case "1h":
      return 5 * 60 * 1000; // 5 minutes
    case "6h":
      return 15 * 60 * 1000; // 15 minutes
    case "24h":
      return 60 * 60 * 1000; // 1 hour
    case "7d":
      return 6 * 60 * 60 * 1000; // 6 hours
    case "30d":
      return 24 * 60 * 60 * 1000; // 1 day
    default:
      return 5 * 60 * 1000;
  }
}
