/**
 * Queue Statistics API
 *
 * GET /api/admin/queues/stats
 * Returns real-time statistics for all queues
 */

import { NextResponse } from "next/server";
import { getAllQueueStats } from "@/lib/queue-manager";

export async function GET() {
  try {
    const stats = await getAllQueueStats();

    if (!stats || stats.length === 0) {
      return NextResponse.json(
        { error: "No queue statistics available" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      queues: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get queue stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch queue statistics" },
      { status: 500 },
    );
  }
}
