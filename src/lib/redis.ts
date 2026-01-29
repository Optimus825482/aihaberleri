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
        lazyConnect: true, // Don't connect immediately
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

      redisInstance.on("error", (err) => {
        console.error("❌ Redis error:", err);
      });

      redisInstance.on("reconnecting", () => {
        console.log("🔄 Redis reconnecting...");
      });
    } catch (error) {
      console.error("❌ Redis initialization error:", error);
      return null;
    }
  }

  return redisInstance;
};

// For backward compatibility
export const redis = getRedis();

export default redis;
