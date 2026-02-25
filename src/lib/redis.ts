import Redis from "ioredis";

const isBuildTime = () => {
  return (
    process.env.SKIP_ENV_VALIDATION === "1" ||
    process.env.NEXT_PHASE === "phase-production-build"
  );
};

const getRedisUrl = () => {
  // Skip Redis during build time
  if (isBuildTime()) {
    return "redis://localhost:6379"; // Dummy URL for build
  }

  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  throw new Error("REDIS_URL is not defined");
};

// Create Redis connection (lazy initialization)
let redisInstance: Redis | null = null;

// OOM tracking state
let isRedisOOM = false;
let oomRecoveryTimer: NodeJS.Timeout | null = null;
let memoryCheckInterval: NodeJS.Timeout | null = null;

/** Check if Redis is currently in OOM state */
export function isRedisMemoryFull(): boolean {
  return isRedisOOM;
}

/**
 * Periodic memory pressure check — runs every 60s in worker context.
 * When usage > 90%, sets OOM flag so workers can back off gracefully.
 * Also auto-trims BullMQ event streams that tend to bloat.
 */
async function checkMemoryPressure(redis: Redis): Promise<void> {
  try {
    const info = await redis.info("memory");
    const usedMatch = info.match(/used_memory:(\d+)/);
    const maxMatch = info.match(/maxmemory:(\d+)/);

    if (!usedMatch || !maxMatch) return;

    const used = parseInt(usedMatch[1], 10);
    const max = parseInt(maxMatch[1], 10);

    if (max === 0) return; // No maxmemory set

    const usagePercent = (used / max) * 100;

    if (usagePercent > 90) {
      if (!isRedisOOM) {
        console.warn(
          ` OOM  Redis memory pressure: ${usagePercent.toFixed(1)}% (${(used / 1024 / 1024).toFixed(0)}MB / ${(max / 1024 / 1024).toFixed(0)}MB)`,
        );
        isRedisOOM = true;
      }

      // Auto-trim event streams when memory is high
      try {
        const streamKeys = await redis.keys("bull:*:events");
        for (const key of streamKeys) {
          await redis.xtrim(key, "MAXLEN", "~", 100);
        }
        if (streamKeys.length > 0) {
          console.log(
            `🧹 Auto-trimmed ${streamKeys.length} event streams (memory pressure)`,
          );
        }
      } catch {
        /* silent — don't make OOM worse */
      }
    } else if (usagePercent < 80 && isRedisOOM) {
      console.log(`✅ Redis memory recovered: ${usagePercent.toFixed(1)}%`);
      isRedisOOM = false;
    }
  } catch {
    /* silent — INFO command itself might fail under OOM */
  }
}

export const getRedis = () => {
  // Skip Redis during build time
  if (isBuildTime()) {
    console.log("⚠️  Redis skipped (build time)");
    return null;
  }

  if (!redisInstance) {
    try {
      redisInstance = new Redis(getRedisUrl(), {
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        lazyConnect: false, // Connect immediately for worker
        retryStrategy: (times) => {
          // Exponential backoff: 1s, 2s, 4s, max 10s
          const delay = Math.min(times * 1000, 10000);
          console.log(`⚠️ Redis retry attempt ${times}, waiting ${delay}ms`);
          return delay;
        },
        reconnectOnError: (err) => {
          // Reconnect on specific errors
          const targetErrors = ["READONLY", "ECONNREFUSED", "ETIMEDOUT"];
          return targetErrors.some((target) => err.message.includes(target));
        },
      });

      // Connection event handlers
      redisInstance.on("connect", () => {
        console.log("✅ Redis connected");
      });

      redisInstance.on("ready", () => {
        console.log("✅ Redis ready to accept commands");

        // Start periodic memory pressure check (every 60s)
        if (!memoryCheckInterval && redisInstance) {
          const r = redisInstance;
          checkMemoryPressure(r); // Immediate first check
          memoryCheckInterval = setInterval(
            () => checkMemoryPressure(r),
            60_000,
          );
        }
      });

      redisInstance.on("error", (err) => {
        // Detect OOM errors and set flag
        if (err.message && err.message.includes("OOM")) {
          if (!isRedisOOM) {
            console.error("🔴 Redis OOM detected — workers will back off");
            isRedisOOM = true;
          }
          // Schedule recovery check after 30s
          if (!oomRecoveryTimer && redisInstance) {
            const r = redisInstance;
            oomRecoveryTimer = setTimeout(async () => {
              oomRecoveryTimer = null;
              await checkMemoryPressure(r);
            }, 30_000);
          }
          return; // Don't spam console with repeated OOM errors
        }

        // Suppress NOAUTH errors (Redis info command may require auth but other commands work)
        if (err.message && err.message.includes("NOAUTH")) {
          console.log(
            "ℹ️ Redis info command requires auth (not critical, other commands working)",
          );
          return;
        }
        console.error("❌ Redis error:", err);
      });

      redisInstance.on("reconnecting", () => {
        console.log("🔄 Redis reconnecting...");
      });

      redisInstance.on("close", () => {
        console.log("⚠️ Redis connection closed");
        if (memoryCheckInterval) {
          clearInterval(memoryCheckInterval);
          memoryCheckInterval = null;
        }
      });
    } catch (error) {
      console.error("❌ Redis initialization error:", error);
      return null;
    }
  }

  return redisInstance;
};

export default getRedis;
