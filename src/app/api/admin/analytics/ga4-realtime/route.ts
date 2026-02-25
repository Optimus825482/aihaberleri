/**
 * GA4 Realtime Analytics API (Hybrid: GA4 + DB fallback)
 *
 * GET /api/admin/analytics/ga4-realtime → Realtime ziyaretçi verileri (hibrit)
 * GET /api/admin/analytics/ga4-realtime?period=7d → Dönem bazlı trafik özeti
 *
 * DB Visitor tablosundan her zaman veri çeker, GA4 varsa birleştirir.
 * GA4 başarısız olsa bile DB verileri gösterilir.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isGA4Configured,
  getRealtimeActiveUsers,
  getRealtimeVisitors,
  getGA4TrafficOverview,
} from "@/lib/ga4-client";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── DB-based realtime data ──────────────────────────────
async function getDBRealtimeData() {
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

  // Son 30 dk aktif ziyaretçiler (Local/localhost hariç)
  const visitors = await db.visitor.findMany({
    where: {
      lastActivity: { gte: thirtyMinAgo },
      country: { not: "Local" },
    },
    orderBy: { lastActivity: "desc" },
    take: 100,
    select: {
      currentPage: true,
      device: true,
      country: true,
      lastActivity: true,
    },
  });

  const activeVisitors = visitors.filter(
    (v) => new Date(v.lastActivity).getTime() >= fiveMinAgo.getTime(),
  );

  // Dakika bazlı dağılım (son 30 dk chart verisi)
  const minuteData: Array<{ minutesAgo: number; users: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const minStart = new Date(now.getTime() - (i + 1) * 60 * 1000);
    const minEnd = new Date(now.getTime() - i * 60 * 1000);
    const count = visitors.filter((v) => {
      const t = new Date(v.lastActivity).getTime();
      return t >= minStart.getTime() && t < minEnd.getTime();
    }).length;
    minuteData.push({ minutesAgo: i, users: count });
  }

  // Sayfa bazlı gruplama
  const pageMap = new Map<string, number>();
  activeVisitors.forEach((v) => {
    if (v.currentPage) {
      pageMap.set(v.currentPage, (pageMap.get(v.currentPage) || 0) + 1);
    }
  });

  // Cihaz bazlı gruplama
  const deviceMap = new Map<string, number>();
  activeVisitors.forEach((v) => {
    const device = v.device || "desktop";
    deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
  });

  // Ülke bazlı gruplama
  const countryMap = new Map<string, number>();
  activeVisitors.forEach((v) => {
    if (v.country) {
      countryMap.set(v.country, (countryMap.get(v.country) || 0) + 1);
    }
  });

  return {
    activeUsers: activeVisitors.length,
    minuteData,
    topPages: Array.from(pageMap.entries())
      .map(([page, users]) => ({ page, users }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10),
    devices: Array.from(deviceMap.entries())
      .map(([device, users]) => ({ device, users }))
      .sort((a, b) => b.users - a.users),
    countries: Array.from(countryMap.entries())
      .map(([country, users]) => ({ country, users }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10),
  };
}

// ─── Merge GA4 + DB data ─────────────────────────────────
function mergeRealtimeData(
  ga4: {
    activeUsers: number;
    minuteData: Array<{ minutesAgo: number; users: number }>;
    topPages: Array<{ page: string; users: number }>;
    devices: Array<{ device: string; users: number }>;
    countries: Array<{ country: string; users: number }>;
  },
  dbData: Awaited<ReturnType<typeof getDBRealtimeData>>,
) {
  return {
    activeUsers: Math.max(ga4.activeUsers, dbData.activeUsers),
    minuteData:
      ga4.minuteData.length > 0 ? ga4.minuteData : dbData.minuteData,
    topPages: ga4.topPages.length > 0 ? ga4.topPages : dbData.topPages,
    devices: ga4.devices.length > 0 ? ga4.devices : dbData.devices,
    countries: ga4.countries.length > 0 ? ga4.countries : dbData.countries,
  };
}

// ─── Main handler ────────────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  const isLite = searchParams.get("lite") === "1";

  try {
    // Dönem bazlı trafik özeti (yalnızca GA4)
    if (period) {
      if (!isGA4Configured()) {
        return NextResponse.json(
          { success: false, error: "GA4 yapılandırması eksik" },
          { status: 503 },
        );
      }

      let startDate: string;
      switch (period) {
        case "today":
          startDate = "today";
          break;
        case "7d":
          startDate = "7daysAgo";
          break;
        case "30d":
          startDate = "30daysAgo";
          break;
        case "90d":
          startDate = "90daysAgo";
          break;
        default:
          startDate = "7daysAgo";
      }

      const traffic = await getGA4TrafficOverview(startDate);
      return NextResponse.json({
        success: true,
        type: "traffic",
        data: traffic,
      });
    }

    // ── Realtime: her zaman DB'den çek, GA4 varsa birleştir ──
    const dbData = await getDBRealtimeData();

    // Lite mode
    if (isLite) {
      let ga4Active = 0;
      if (isGA4Configured()) {
        try {
          ga4Active = await getRealtimeActiveUsers();
        } catch {
          /* GA4 başarısız — DB yeterli */
        }
      }
      return NextResponse.json({
        success: true,
        type: "realtime-lite",
        source: ga4Active > 0 ? "hybrid" : "db",
        data: {
          activeUsers: Math.max(ga4Active, dbData.activeUsers),
        },
      });
    }

    // Full realtime
    let ga4Data = null;
    if (isGA4Configured()) {
      try {
        ga4Data = await getRealtimeVisitors();
      } catch (err) {
        console.error("[GA4 Realtime] GA4 failed, using DB fallback:", err);
      }
    }

    const merged = ga4Data ? mergeRealtimeData(ga4Data, dbData) : dbData;
    const source = ga4Data
      ? ga4Data.activeUsers > 0
        ? "hybrid"
        : "db"
      : "db";

    return NextResponse.json({
      success: true,
      type: "realtime",
      source,
      data: merged,
    });
  } catch (error) {
    console.error("[GA4 Realtime API] Error:", error);

    // Son çare: DB-only dene
    try {
      const fallback = await getDBRealtimeData();
      return NextResponse.json({
        success: true,
        type: "realtime",
        source: "db-fallback",
        data: fallback,
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Veri alınamadı" },
        { status: 500 },
      );
    }
  }
}
