import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCache } from "@/lib/cache";
import { redis } from "@/lib/redis";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cache-stats
 * Returns enhanced cache performance metrics with recommendations
 * Admin-only endpoint
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const cache = getCache();
    const stats = cache.getStats();

    // Calculate hit ratios
    const totalRequests = stats.hits + stats.misses;
    const hitRatio =
      totalRequests > 0 ? Math.round((stats.hits / totalRequests) * 100) : 0;

    const l1HitRatio =
      stats.hits > 0 ? Math.round((stats.l1Hits / stats.hits) * 100) : 0;

    const l2HitRatio =
      stats.hits > 0 ? Math.round((stats.l2Hits / stats.hits) * 100) : 0;

    // Get memory cache size
    const memoryCacheSize = stats.l1Hits + stats.l2Hits; // Approximate size from hits

    // Get Redis cache info
    let redisCacheInfo = {
      available: false,
      keys: 0,
      memoryUsedMB: 0,
      error: null as string | null,
    };

    if (redis) {
      try {
        const info = await redis.info("memory");
        const keyCount = await redis.dbsize();

        // Parse memory usage from info string
        const usedMemoryMatch = info.match(/used_memory:(\d+)/);
        const usedMemoryBytes = usedMemoryMatch
          ? parseInt(usedMemoryMatch[1])
          : 0;

        redisCacheInfo = {
          available: true,
          keys: keyCount,
          memoryUsedMB: Math.round(usedMemoryBytes / 1024 / 1024),
          error: null,
        };
      } catch (error) {
        redisCacheInfo.error =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Failed to get Redis cache info", { error });
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      performance: {
        hitRatio,
        hits: stats.hits,
        misses: stats.misses,
        totalRequests,
      },
      layers: {
        L1: {
          hits: stats.l1Hits,
          hitRatio: l1HitRatio,
          size: memoryCacheSize,
          evictions: stats.evictions,
        },
        L2: {
          hits: stats.l2Hits,
          hitRatio: l2HitRatio,
          ...redisCacheInfo,
        },
      },
      errors: stats.errors,
      recommendations: generateRecommendations(stats, redisCacheInfo),
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Cache stats endpoint error", { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/cache-stats
 * Clear cache or reset stats
 * Body: { action: "clear" | "reset" }
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const cache = getCache();

    if (action === "clear") {
      await cache.clearAll();
      logger.info("Cache cleared by admin", { userId: session.user?.id });
      return NextResponse.json({
        success: true,
        message: "Cache cleared successfully",
      });
    } else if (action === "reset") {
      cache.resetStats();
      logger.info("Cache stats reset by admin", { userId: session.user?.id });
      return NextResponse.json({
        success: true,
        message: "Stats reset successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use 'clear' or 'reset'" },
        { status: 400 },
      );
    }
  } catch (error) {
    logger.error("Cache action error", { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

/**
 * Generate cache optimization recommendations
 */
function generateRecommendations(stats: any, redisInfo: any): string[] {
  const recommendations: string[] = [];

  const totalRequests = stats.hits + stats.misses;
  const hitRatio = totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;

  if (hitRatio < 50) {
    recommendations.push(
      "Cache hit ratio is low (<50%). Consider increasing TTL or caching more data.",
    );
  }

  if (stats.evictions > 100) {
    recommendations.push(
      `High eviction count (${stats.evictions}). Consider increasing memory cache size limit.`,
    );
  }

  if (stats.errors > 10) {
    recommendations.push(
      `Cache errors detected (${stats.errors}). Check Redis connection health.`,
    );
  }

  if (redisInfo.memoryUsedMB > 512) {
    recommendations.push(
      `Redis memory usage is high (${redisInfo.memoryUsedMB}MB). Consider cleanup or TTL optimization.`,
    );
  }

  if (!redisInfo.available) {
    recommendations.push(
      "Redis L2 cache is unavailable. Performance may be degraded - using memory cache only.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ Cache performance is optimal!");
  }

  return recommendations;
}
