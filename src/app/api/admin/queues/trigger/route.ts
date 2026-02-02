/**
 * Manual Pipeline Trigger API
 *
 * POST /api/admin/queues/trigger
 * Manually triggers the content collection pipeline
 */

import { NextResponse } from "next/server";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { categoryFilter, maxArticles = 50 } = body;

    const queue = getQueue(QUEUE_NAMES.COLLECTED_ARTICLES);
    if (!queue) {
      return NextResponse.json(
        { error: "Content collector queue not available" },
        { status: 503 },
      );
    }

    await queue.add(
      "manual-trigger",
      {
        categoryFilter,
        maxArticles,
      },
      {
        removeOnComplete: true,
        attempts: 3,
      },
    );

    return NextResponse.json({
      message: "Pipeline triggered successfully",
      categoryFilter: categoryFilter || "all",
      maxArticles,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to trigger pipeline:", error);
    return NextResponse.json(
      { error: "Failed to trigger pipeline" },
      { status: 500 },
    );
  }
}
