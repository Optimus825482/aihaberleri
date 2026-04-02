/**
 * Article View Tracking API
 *
 * OPTIMIZED: Uses Redis buffer instead of 3 DB queries per request.
 *   Before: SELECT + INSERT (articleView) + UPDATE (article.views) = ~15ms + DB load
 *   After:  Redis SET NX (session dedup) + Redis INCR (buffer) = ~0.3ms, no DB load
 *
 * Counts are flushed to DB every 5 minutes via cron (see src/lib/cron.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { recordView } from "@/lib/view-counter";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Build session identifier from IP + User-Agent (no DB, no cookies)
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : (headersList.get("x-real-ip") ?? "unknown");
    const userAgent = headersList.get("user-agent") ?? "unknown";

    // Use first 16 chars of UA to keep key size small
    const sessionId = `${ip}-${userAgent.slice(0, 16)}`;

    const result = await recordView(id, sessionId);

    return NextResponse.json(
      {
        success: true,
        incremented: result === "counted" || result === "fallback",
        method: result,
      },
      {
        headers: {
          // Don't cache view requests
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    // Never fail the page load over view counting
    console.error("[view/route] Unexpected error:", error);
    return NextResponse.json({ success: true, incremented: false });
  }
}
