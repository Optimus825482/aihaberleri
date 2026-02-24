import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  isAdSenseConfigured,
  getAdSenseDetailedReport,
  getAdSenseDailyReport,
} from "@/lib/adsense-client";
import { getCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    if (!isAdSenseConfigured()) {
      return NextResponse.json({
        success: true,
        data: null,
        configured: false,
      });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 365);
    const type = searchParams.get("type") || "detailed"; // "detailed" | "daily"

    const cache = getCache();
    const cacheKey = `adsense:report:${type}:${days}`;
    const cached = await cache.get<any>(cacheKey, { tags: ["adsense"] });
    if (cached) {
      const res = NextResponse.json({ success: true, data: cached });
      res.headers.set("X-Cache", "HIT");
      return res;
    }

    let data;
    if (type === "daily") {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      data = await getAdSenseDailyReport(startDate, endDate);
    } else {
      data = await getAdSenseDetailedReport(days);
    }

    await cache.set(cacheKey, data, {
      ttl: 600, // 10 dakika
      tags: ["adsense"],
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[AdSense Report API]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Rapor oluşturulamadı" },
      { status: 500 },
    );
  }
}
