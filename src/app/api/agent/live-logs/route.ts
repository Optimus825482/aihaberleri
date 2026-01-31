import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getRedis } from "@/lib/redis";
import { getRecentAgentLogs, LOG_CHANNEL_NAME } from "@/lib/agent-log-stream";
import Redis from "ioredis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agent/live-logs
 * Server-Sent Events endpoint for real-time agent logs
 */
export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return new Response(JSON.stringify({ error: "Redis not available" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create a separate Redis connection for subscribing
  let subscriber: Redis | null = null;

  try {
    // Get Redis connection options from existing connection
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to create Redis subscriber" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();
  let isStreamClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendMessage = (data: object) => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch (e) {
          isStreamClosed = true;
        }
      };

      try {
        // Send recent logs first (last 50)
        const recentLogs = await getRecentAgentLogs(50);
        for (const log of recentLogs.reverse()) {
          sendMessage({ type: "log", ...log });
        }

        // Send connected message
        sendMessage({
          type: "connected",
          message: "Canlı log akışına bağlandı",
          timestamp: new Date().toISOString(),
        });

        // Subscribe to log channel
        await subscriber!.subscribe(LOG_CHANNEL_NAME);

        // Handle incoming messages
        subscriber!.on("message", (channel, message) => {
          if (channel === LOG_CHANNEL_NAME && !isStreamClosed) {
            try {
              const log = JSON.parse(message);
              sendMessage({ type: "log", ...log });
            } catch (e) {
              // Ignore parse errors
            }
          }
        });

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          isStreamClosed = true;
          subscriber?.unsubscribe(LOG_CHANNEL_NAME);
          subscriber?.disconnect();
        });

        // Keep connection alive with heartbeat
        const heartbeatInterval = setInterval(() => {
          if (isStreamClosed) {
            clearInterval(heartbeatInterval);
            return;
          }
          sendMessage({
            type: "heartbeat",
            timestamp: new Date().toISOString(),
          });
        }, 30000);
      } catch (error) {
        sendMessage({
          type: "error",
          message: error instanceof Error ? error.message : "Stream error",
          timestamp: new Date().toISOString(),
        });
        controller.close();
      }
    },
    cancel() {
      isStreamClosed = true;
      subscriber?.unsubscribe(LOG_CHANNEL_NAME);
      subscriber?.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
