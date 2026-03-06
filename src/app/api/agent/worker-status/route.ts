import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import {
  parseWorkerHeartbeat,
  WORKER_HEARTBEAT_MAX_AGE_MS,
} from "@/lib/worker-health";

export const dynamic = "force-dynamic";

/**
 * Worker Health Check Endpoint
 * Returns worker online status based on Redis heartbeat
 */
export async function GET() {
  try {
    const redis = getRedis();

    if (!redis) {
      return NextResponse.json({
        workerOnline: false,
        error: "Redis connection not available",
        lastHeartbeat: null,
      });
    }

    // Check worker heartbeat (updated every 30s by worker)
    const heartbeat = await redis.get("worker:heartbeat");

    if (!heartbeat) {
      return NextResponse.json({
        workerOnline: false,
        lastHeartbeat: null,
        message: "No heartbeat found - worker may not be started",
      });
    }

    const heartbeatState = parseWorkerHeartbeat(heartbeat);

    return NextResponse.json({
      workerOnline: heartbeatState.isAlive,
      lastHeartbeat: heartbeatState.lastHeartbeat,
      timeSinceHeartbeat: heartbeatState.ageMs
        ? Math.floor(heartbeatState.ageMs / 1000)
        : null,
      threshold: Math.floor(WORKER_HEARTBEAT_MAX_AGE_MS / 1000),
    });
  } catch (error) {
    console.error("Worker status check error:", error);
    return NextResponse.json(
      {
        workerOnline: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
