import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

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

    const lastHeartbeatTime = parseInt(heartbeat);
    const timeSinceHeartbeat = Date.now() - lastHeartbeatTime;
    const isAlive = timeSinceHeartbeat < 60000; // Consider alive if heartbeat < 60s ago

    return NextResponse.json({
      workerOnline: isAlive,
      lastHeartbeat: new Date(lastHeartbeatTime).toISOString(),
      timeSinceHeartbeat: Math.floor(timeSinceHeartbeat / 1000), // seconds
      threshold: 60, // seconds
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
