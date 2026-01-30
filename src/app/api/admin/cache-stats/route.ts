import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cache-stats
 * Returns cache performance metrics
 * Admin-only endpoint
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const cache = getCache();
    const stats = cache.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cache stats hatası:", error);
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
 * POST /api/admin/cache-stats
 * Clear cache or reset stats
 * Body: { action: "clear" | "reset" }
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const cache = getCache();

    if (action === "clear") {
      await cache.clearAll();
      return NextResponse.json({
        success: true,
        message: "Cache cleared successfully",
      });
    } else if (action === "reset") {
      cache.resetStats();
      return NextResponse.json({
        success: true,
        message: "Stats reset successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use 'clear' or 'reset'" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Cache action hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
