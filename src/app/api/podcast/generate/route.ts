/**
 * 🎙️ Podcast Generation API
 *
 * POST /api/podcast/generate - Yeni podcast üret
 * GET /api/podcast/generate - Son podcast'i getir
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generatePodcast, PodcastConfig } from "@/services/podcast.service";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    // Admin kontrolü
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const config: PodcastConfig = {
      articleCount: body.articleCount || 5,
      engine: body.engine || "edge-tts",
      language: body.language || "tr",
      title: body.title,
      externalAudioUrl: body.externalAudioUrl,
    };

    console.log(`[Podcast API] Generating podcast with config:`, config);

    const result = await generatePodcast(config);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      podcastId: result.podcastId,
      audioUrl: result.audioUrl,
      scriptLength: result.script?.length,
    });
  } catch (error) {
    console.error("[Podcast API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const podcastDir = path.join(process.cwd(), "public", "podcasts");

    let files: string[] = [];
    try {
      files = await fs.readdir(podcastDir);
    } catch {
      return NextResponse.json({ podcasts: [] });
    }

    const podcasts = files
      .filter((f) => f.endsWith(".mp3"))
      .sort()
      .reverse()
      .slice(0, 10)
      .map((file) => ({
        filename: file,
        url: `/podcasts/${file}`,
        date: file.match(/podcast_(\d{4}-\d{2}-\d{2})/)?.[1] || "unknown",
      }));

    return NextResponse.json({ podcasts });
  } catch (error) {
    console.error("[Podcast API] Error:", error);
    return NextResponse.json(
      { error: "Failed to list podcasts" },
      { status: 500 },
    );
  }
}
