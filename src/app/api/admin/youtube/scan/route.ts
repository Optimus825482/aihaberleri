import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { scanAllChannels } from "@/lib/youtube-monitor";

/**
 * POST /api/admin/youtube/scan
 * Manually trigger YouTube channel scan
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const body = await request.json().catch(() => ({}));
    const hoursAgo = body.hoursAgo || 48;

    console.log(
      `🎬 Manuel YouTube taraması başlatılıyor (son ${hoursAgo} saat)...`,
    );

    const topics = await scanAllChannels(hoursAgo);

    return NextResponse.json({
      success: true,
      data: {
        topicsFound: topics.length,
        topics: topics.slice(0, 20),
      },
    });
  } catch (error) {
    console.error("YouTube scan error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
