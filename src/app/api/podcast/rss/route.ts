/**
 * 🎙️ Podcast RSS Feed
 *
 * GET /api/podcast/rss - RSS feed (Apple Podcasts, Spotify için)
 */

import { NextResponse } from "next/server";
import { generatePodcastRSS } from "@/services/podcast.service";

export async function GET() {
  try {
    const rss = await generatePodcastRSS();

    return new NextResponse(rss, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // 1 saat cache
      },
    });
  } catch (error) {
    console.error("[Podcast RSS] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate RSS" },
      { status: 500 },
    );
  }
}
