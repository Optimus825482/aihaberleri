import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getRedis } from "@/lib/redis";
import { getCache } from "@/lib/cache";

/**
 * GET /api/admin/monitoring/cache
 * Cache statistics endpoint
 * Returns: Redis hit/miss rate, memory usage, top keys, tag-based stats
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication check
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    // 2. Get Redis instance
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        {
          success: false,
          error: "Redis bağlantısı mevcut değil",
        },
        { status: 503 },
      );
    }

    // 3. Parallel queries for better performance
    const [redisInfo, totalKeys, cacheKeys, cacheManager] = await Promise.all([
      // Redis INFO stats
      redis.info("stats").catch(() => ""),

      // Total keys in database
      redis.dbsize().catch(() => 0),

      // Get all cache keys (limit to 1000 for performance)
      redis
        .keys("cache:*")
        .then((keys) => keys.slice(0, 1000))
        .catch(() => []),

      // Get cache manager stats
      Promise.resolve(getCache().getStats()),
    ]);

    // 4. Parse Redis stats
    let redisStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsed: 0,
      memoryPeak: 0,
      fragmentation: 0,
    };

    if (redisInfo) {
      const lines = redisInfo.split("\r\n");
      const stats: Record<string, string> = {};

      lines.forEach((line) => {
        const [key, value] = line.split(":");
        if (key && value) {
          stats[key] = value;
        }
      });

      redisStats = {
        hits: parseInt(stats.keyspace_hits || "0"),
        misses: parseInt(stats.keyspace_misses || "0"),
        evictions: parseInt(stats.evicted_keys || "0"),
        memoryUsed: parseInt(stats.used_memory || "0"),
        memoryPeak: parseInt(stats.used_memory_peak || "0"),
        fragmentation: parseFloat(stats.mem_fragmentation_ratio || "1.0"),
      };
    }

    // 5. Calculate hit rate
    const totalRequests = redisStats.hits + redisStats.misses;
    const hitRate =
      totalRequests > 0
        ? Math.round((redisStats.hits / totalRequests) * 100)
        : 0;
    const missRate = 100 - hitRate;

    // 6. Get top keys by analyzing cache keys
    const topKeys: Array<{
      key: string;
      size: number;
      ttl: number;
      type: string;
    }> = [];

    // Sample 50 keys for performance
    const sampleKeys = cacheKeys.slice(0, 50);

    for (const key of sampleKeys) {
      try {
        const [ttl, type, size] = await Promise.all([
          redis.ttl(key),
          redis.type(key),
          redis.memory("USAGE", key).catch(() => 0),
        ]);

        topKeys.push({
          key: key.replace("cache:", ""),
          size: typeof size === "number" ? size : 0,
          ttl: ttl || -1,
          type: type || "string",
        });
      } catch (error) {
        // Skip keys that cause errors
        continue;
      }
    }

    // Sort by size (largest first)
    topKeys.sort((a, b) => b.size - a.size);

    // 7. Get tag-based statistics
    const tagKeys = cacheKeys.filter((key) => key.startsWith("cache:tag:"));
    const tagStats: Array<{
      tag: string;
      keyCount: number;
      hitRate: number;
    }> = [];

    for (const tagKey of tagKeys.slice(0, 20)) {
      try {
        const tag = tagKey.replace("cache:tag:", "");
        const members = await redis.smembers(tagKey);

        tagStats.push({
          tag,
          keyCount: members.length,
          hitRate: 0, // Would need separate tracking for per-tag hit rates
        });
      } catch (error) {
        continue;
      }
    }

    // 8. Build response
    const responseData = {
      success: true,
      data: {
        redis: {
          hitRate,
          missRate,
          totalKeys,
          cacheKeys: cacheKeys.length,
          memoryUsed: redisStats.memoryUsed,
          memoryUsedMB: Math.round(redisStats.memoryUsed / 1024 / 1024),
          memoryPeak: redisStats.memoryPeak,
          memoryPeakMB: Math.round(redisStats.memoryPeak / 1024 / 1024),
          evictions: redisStats.evictions,
          fragmentation: redisStats.fragmentation,
          stats: {
            hits: redisStats.hits,
            misses: redisStats.misses,
          },
        },
        cacheManager: {
          ...cacheManager,
          l1Size: cacheManager.l1Size,
          l1Hits: cacheManager.l1Hits,
          l2Hits: cacheManager.l2Hits,
        },
        tags: tagStats,
        topKeys: topKeys.slice(0, 20),
      },
      timestamp: new Date().toISOString(),
    };

    // 9. Add response time header
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
    console.error("Cache statistics error:", error);

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
