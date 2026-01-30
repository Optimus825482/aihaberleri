import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db";
import { redis } from "@/lib/redis";
import logger from "@/lib/logger";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Force dynamic rendering - don't try to generate at build time
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Detect if we're in build time
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Enhanced Health Check Endpoint
 * Monitors: Database, Redis, Worker, Memory, Disk
 * GET /api/health
 */
export async function GET() {
  // During build time, return mock response immediately
  if (isBuildTime) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: "build-time",
      services: {
        database: { status: "skipped", latency: 0 },
        redis: { status: "skipped", latency: 0 },
        worker: { status: "skipped", lastHeartbeat: null },
      },
      system: {
        memory: { status: "skipped" },
        disk: { status: "skipped" },
      },
      message: "Health checks skipped during build",
    });
  }

  const checks = {
    timestamp: new Date().toISOString(),
    status: "healthy" as "healthy" | "degraded" | "unhealthy",
    services: {
      database: {
        status: "unknown" as string,
        latency: 0,
        error: null as string | null,
      },
      redis: {
        status: "unknown" as string,
        latency: 0,
        error: null as string | null,
      },
      worker: {
        status: "unknown" as string,
        lastHeartbeat: null as string | null,
        isAlive: false,
      },
    },
    system: {
      memory: {
        status: "unknown" as string,
        usedMB: 0,
        totalMB: 0,
        usagePercent: 0,
      },
      disk: {
        status: "unknown" as string,
        availableGB: 0,
        usagePercent: 0,
      },
      uptime: {
        seconds: 0,
        formatted: "",
      },
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
      error: null,
    };

    if (dbLatency > 1000) {
      checks.services.database.status = "degraded";
      logger.warn("⚠️  Database slow response", { latency: dbLatency });
    }
  } catch (error) {
    checks.services.database = {
      status: "error",
      latency: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    checks.status = "degraded";
    logger.error("❌ Database health check failed", { error });
  }

  // Check Redis
  try {
    if (redis) {
      const redisStart = Date.now();
      const pong = await redis.ping();
      const redisLatency = Date.now() - redisStart;

      checks.services.redis = {
        status: pong === "PONG" ? "healthy" : "unhealthy",
        latency: redisLatency,
        error: null,
      };

      if (redisLatency > 500) {
        checks.services.redis.status = "degraded";
        logger.warn("⚠️  Redis slow response", { latency: redisLatency });
      }
    } else {
      checks.services.redis = {
        status: "unavailable",
        latency: 0,
        error: "Redis client not initialized",
      };
      checks.status = "degraded";
    }
  } catch (error) {
    checks.services.redis = {
      status: "error",
      latency: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    checks.status = "degraded";
    logger.error("❌ Redis health check failed", { error });
  }

  // Check Worker Heartbeat
  try {
    if (redis) {
      const heartbeat = await redis.get("worker:heartbeat");
      if (heartbeat) {
        const lastBeat = parseInt(heartbeat);
        const ageSeconds = Math.floor((Date.now() - lastBeat) / 1000);

        checks.services.worker = {
          status: ageSeconds < 120 ? "healthy" : "stale", // 2 minute threshold
          lastHeartbeat: new Date(lastBeat).toISOString(),
          isAlive: ageSeconds < 120,
        };

        if (ageSeconds >= 120) {
          checks.status = "degraded";
          logger.warn("⚠️  Worker heartbeat stale", { ageSeconds });
        }
      } else {
        checks.services.worker = {
          status: "unknown",
          lastHeartbeat: null,
          isAlive: false,
        };
      }
    }
  } catch (error) {
    logger.error("❌ Worker heartbeat check failed", { error });
  }

  // System Memory
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = Math.round((usedMem / totalMem) * 100);

    checks.system.memory = {
      status:
        usagePercent < 80
          ? "healthy"
          : usagePercent < 90
            ? "warning"
            : "critical",
      usedMB: Math.round(usedMem / 1024 / 1024),
      totalMB: Math.round(totalMem / 1024 / 1024),
      usagePercent,
    };

    if (usagePercent >= 90) {
      checks.status = "degraded";
      logger.warn("⚠️  High memory usage", { usagePercent });
    }
  } catch (error) {
    logger.error("❌ Memory check failed", { error });
  }

  // System Disk (Unix-like systems only)
  if (process.platform !== "win32") {
    try {
      const { stdout } = await execAsync(
        "df -h / | tail -1 | awk '{print $4, $5}'",
      );
      const [available, usage] = stdout.trim().split(" ");
      const usagePercent = parseInt(usage.replace("%", ""));

      checks.system.disk = {
        status:
          usagePercent < 80
            ? "healthy"
            : usagePercent < 90
              ? "warning"
              : "critical",
        availableGB: parseFloat(available),
        usagePercent,
      };

      if (usagePercent >= 90) {
        checks.status = "degraded";
        logger.warn("⚠️  High disk usage", { usagePercent });
      }
    } catch (error) {
      // Disk check is optional, don't fail health check
      logger.debug("Disk check skipped (Windows or permission denied)");
    }
  }

  // System Uptime
  const uptimeSeconds = Math.floor(os.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  checks.system.uptime = {
    seconds: uptimeSeconds,
    formatted: `${hours}h ${minutes}m`,
  };

  // Overall status determination
  const criticalServices = [
    checks.services.database.status,
    checks.services.redis.status,
  ];
  if (criticalServices.some((s) => s === "error" || s === "unhealthy")) {
    checks.status = "unhealthy";
  } else if (
    criticalServices.some((s) => s === "degraded" || s === "warning")
  ) {
    checks.status = "degraded";
  }

  const statusCode =
    checks.status === "healthy"
      ? 200
      : checks.status === "degraded"
        ? 200
        : 503;

  return NextResponse.json(checks, { status: statusCode });
}
