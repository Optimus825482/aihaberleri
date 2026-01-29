import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db";
import { redis } from "@/lib/redis";

// Force dynamic rendering - don't try to generate at build time
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Health check endpoint for monitoring system status
 * GET /api/health
 */
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    services: {
      database: { status: "unknown", latency: 0 },
      redis: { status: "unknown", latency: 0 },
    },
  };

  // Check PostgreSQL
  try {
    const dbStart = Date.now();
    const dbHealthy = await checkDatabaseHealth();
    const dbLatency = Date.now() - dbStart;

    checks.services.database = {
      status: dbHealthy ? "healthy" : "unhealthy",
      latency: dbLatency,
    };
  } catch (error) {
    checks.services.database = {
      status: "error",
      latency: 0,
    };
    checks.status = "degraded";
  }

  // Check Redis
  try {
    if (redis) {
      const redisStart = Date.now();
      await redis.ping();
      const redisLatency = Date.now() - redisStart;

      checks.services.redis = {
        status: "healthy",
        latency: redisLatency,
      };
    } else {
      checks.services.redis = {
        status: "unavailable",
        latency: 0,
      };
      checks.status = "degraded";
    }
  } catch (error) {
    checks.services.redis = {
      status: "error",
      latency: 0,
    };
    checks.status = "degraded";
  }

  // Overall status
  const allHealthy = Object.values(checks.services).every(
    (service) => service.status === "healthy",
  );

  if (!allHealthy) {
    checks.status = "degraded";
  }

  const statusCode = checks.status === "healthy" ? 200 : 503;

  return NextResponse.json(checks, { status: statusCode });
}
