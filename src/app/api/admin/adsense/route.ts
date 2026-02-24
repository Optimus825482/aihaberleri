import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isAdSenseConfigured, getAdSenseEarnings } from "@/lib/adsense-client";
import { getCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    if (!isAdSenseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "AdSense yapılandırması eksik. ADSENSE_ACCOUNT_ID gerekli.",
          configured: false,
        },
        { status: 503 },
      );
    }

    // Cache: 5 dakika
    const cache = getCache();
    const cacheKey = "adsense:summary";
    const cached = await cache.get<any>(cacheKey, { tags: ["adsense"] });
    if (cached) {
      const res = NextResponse.json({
        success: true,
        data: cached,
        configured: true,
      });
      res.headers.set("X-Cache", "HIT");
      return res;
    }

    const earnings = await getAdSenseEarnings();

    await cache.set(cacheKey, earnings, {
      ttl: 300, // 5 dakika
      tags: ["adsense"],
    });

    return NextResponse.json({
      success: true,
      data: earnings,
      configured: true,
    });
  } catch (error: any) {
    console.error("[AdSense Summary API]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "AdSense verisi alınamadı",
        configured: isAdSenseConfigured(),
      },
      { status: 500 },
    );
  }
}
