import Redis from "ioredis";

const getRedisUrl = () => {
  // Skip Redis during build time
  if (process.env.SKIP_ENV_VALIDATION === "1") {
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
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    console.log("⚠️  Redis skipped (build time)");
    return null;
  }

  if (!redisInstance) {
    try {
      redisInstance = new Redis(getRedisUrl(), {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        lazyConnect: true, // Don't connect immediately
      });

      // Connection event handlers
      redisInstance.on("connect", () => {
        console.log("✅ Redis connected");
      });

      redisInstance.on("error", (err) => {
        console.error("❌ Redis error:", err);
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
