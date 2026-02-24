import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { seedDefaultChannels } from "@/lib/youtube-monitor";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/youtube/channels
 * List all YouTube channels with stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    // Seed defaults if empty
    await seedDefaultChannels();

    const channels = await (db as any).youTubeChannel.findMany({
      orderBy: [{ priority: "desc" }, { name: "asc" }],
    });

    const stats = {
      total: channels.length,
      active: channels.filter((c: any) => c.isActive).length,
      byCategory: channels.reduce(
        (acc: Record<string, number>, c: any) => {
          acc[c.category] = (acc[c.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    return NextResponse.json({ success: true, data: channels, stats });
  } catch (error) {
    console.error("YouTube channels fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/youtube/channels
 * Add a new YouTube channel
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const {
      channelId,
      name,
      language = "en",
      category = "ai_news",
      priority = 3,
    } = body;

    if (!channelId || !name) {
      return NextResponse.json(
        { success: false, error: "channelId ve name zorunlu" },
        { status: 400 },
      );
    }

    // Check duplicate
    const existing = await (db as any).youTubeChannel.findUnique({
      where: { channelId },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Bu kanal zaten ekli" },
        { status: 400 },
      );
    }

    const channel = await (db as any).youTubeChannel.create({
      data: { channelId, name, language, category, priority, isActive: true },
    });

    return NextResponse.json({ success: true, data: channel });
  } catch (error) {
    console.error("YouTube channel create error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
