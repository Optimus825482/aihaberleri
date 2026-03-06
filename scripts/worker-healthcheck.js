const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL;
const maxAgeMs = 120 * 1000;

if (!redisUrl) {
  console.error("REDIS_URL is required for worker healthcheck");
  process.exit(1);
}

async function main() {
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  try {
    await redis.connect();

    const heartbeat = await redis.get("worker:heartbeat");
    if (!heartbeat) {
      console.error("Worker heartbeat missing");
      process.exit(1);
    }

    const lastHeartbeatMs = Number.parseInt(heartbeat, 10);
    if (Number.isNaN(lastHeartbeatMs)) {
      console.error("Worker heartbeat is invalid");
      process.exit(1);
    }

    const ageMs = Date.now() - lastHeartbeatMs;
    if (ageMs > maxAgeMs) {
      console.error(`Worker heartbeat stale: ${ageMs}ms`);
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error(
      `Worker healthcheck failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  } finally {
    redis.disconnect();
  }
}

main();