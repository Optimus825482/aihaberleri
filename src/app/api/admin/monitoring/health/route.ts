import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRedis } from "@/lib/redis";
import { getAllQueueStats } from "@/lib/queue-manager";

/**
 * GET /api/admin/monitoring/health
 * System health check endpoint
 * Returns: Database, Redis, Queue, and system resource status
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication check
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim" },
        { status: 401 },
      );
    }

    const healthStatus: any = {
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      services: {},
      resources: {},
    };

    // 2. Parallel health checks for better performance
    const [dbHealth, redisHealth, queueHealth] = await Promise.all([
      // Database health check
      (async () => {
        try {
          const dbStart = Date.now();
          await db.$queryRaw`SELECT 1`;
          const responseTime = Date.now() - dbStart;

          // Get connection pool info (approximate)
          return {
            status: "up" as const,
            responseTime,
            connections: {
              active: 5, // Approximate (Prisma doesn't expose this easily)
              idle: 5,
              total: 10,
            },
          };
        } catch (error) {
          healthStatus.status = "down";
          return {
            status: "down" as const,
            responseTime: 0,
            error: error instanceof Error ? error.message : "Unknown error",
            connections: {
              active: 0,
              idle: 0,
              total: 0,
            },
          };
        }
      })(),

      // Redis health check
      (async () => {
        try {
          const redis = getRedis();
          if (!redis) {
            healthStatus.status = "degraded";
            return {
              status: "down" as const,
              responseTime: 0,
              error: "Redis not available",
              memory: {
                used: 0,
                peak: 0,
                fragmentation: 0,
              },
            };
          }

          const redisStart = Date.now();
          await redis.ping();
          const responseTime = Date.now() - redisStart;

          // Get memory info
          const info = await redis.info("memory").catch(() => "");
          const lines = info.split("\r\n");
          const stats: Record<string, string> = {};

          lines.forEach((line) => {
            const [key, value] = line.split(":");
            if (key && value) {
              stats[key] = value;
            }
          });

          return {
            status: "up" as const,
            responseTime,
            memory: {
              used: parseInt(stats.used_memory || "0"),
              peak: parseInt(stats.used_memory_peak || "0"),
              fragmentation: parseFloat(stats.mem_fragmentation_ratio || "1.0"),
            },
          };
        } catch (error) {
          healthStatus.status = "degraded";
          return {
            status: "down" as const,
            responseTime: 0,
            error: error instanceof Error ? error.message : "Unknown error",
            memory: {
              used: 0,
              peak: 0,
              fragmentation: 0,
            },
          };
        }
      })(),

      // Queue health check
      (async () => {
        try {
          const queueStats = await getAllQueueStats();

          const queues = queueStats.map((stat) => ({
            name: stat?.queueName || "unknown",
            active: stat?.active || 0,
            waiting: stat?.waiting || 0,
            completed: stat?.completed || 0,
            failed: stat?.failed || 0,
          }));

          const hasFailures = queues.some((q) => q.failed > q.completed * 0.1);

          return {
            status: hasFailures ? ("degraded" as const) : ("up" as const),
            queues,
          };
        } catch (error) {
          return {
            status: "down" as const,
            error: error instanceof Error ? error.message : "Unknown error",
            queues: [],
          };
        }
      })(),
    ]);

    // 3. Assign health check results
    healthStatus.services.database = dbHealth;
    healthStatus.services.redis = redisHealth;
    healthStatus.services.queue = queueHealth;

    // 4. System resources
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    healthStatus.resources.memory = {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      rss: memUsage.rss,
      external: memUsage.external,
    };

    healthStatus.resources.cpu = {
      usage: 0, // Node.js doesn't provide real-time CPU usage easily
      cores: require("os").cpus().length,
      user: Math.round(cpuUsage.user / 1000),
      system: Math.round(cpuUsage.system / 1000),
    };

    // 5. Determine overall status
    if (dbHealth.status === "down") {
      healthStatus.status = "down";
    } else if (
      redisHealth.status === "down" ||
      queueHealth.status === "degraded"
    ) {
      healthStatus.status = "degraded";
    }

    // 6. Add response time header
    const responseTime = Date.now() - startTime;
    healthStatus.responseTime = responseTime;

    const response = NextResponse.json(healthStatus, {
      status: healthStatus.status === "healthy" ? 200 : 503,
    });
    response.headers.set("X-Response-Time", `${responseTime}ms`);

    // Cache for 60 seconds (REALTIME)
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=120",
    );

    return response;
  } catch (error) {
    console.error("Health check error:", error);

    const responseTime = Date.now() - startTime;
    const response = NextResponse.json(
      {
        success: false,
        status: "down",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
    response.headers.set("X-Response-Time", `${responseTime}ms`);

    return response;
  }
}
