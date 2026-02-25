/**
 * GA4 Realtime Analytics API
 *
 * GET /api/admin/analytics/ga4-realtime → Realtime ziyaretçi verileri
 * GET /api/admin/analytics/ga4-realtime?period=7d → Dönem bazlı trafik özeti
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isGA4Configured,
  getRealtimeActiveUsers,
  getRealtimeVisitors,
  getGA4TrafficOverview,
} from "@/lib/ga4-client";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  if (!isGA4Configured()) {
    return NextResponse.json(
      {
        success: false,
        error: "GA4 yapılandırması eksik",
        configured: false,
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  const isLite = searchParams.get("lite") === "1";

  try {
    // Dönem bazlı trafik özeti
    if (period) {
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

    // Lite mode: yalnızca aktif kullanıcı sayısı (minimum GA yükü)
    if (isLite) {
      const activeUsers = await getRealtimeActiveUsers();
      return NextResponse.json({
        success: true,
        type: "realtime-lite",
        data: {
          activeUsers,
        },
      });
    }

    // Realtime veriler
    const realtime = await getRealtimeVisitors();
    if (realtime.activeUsers === 0 && realtime.minuteData.length === 0) {
      console.warn(
        "[GA4 Realtime API] Empty result returned — possible API issue or no active visitors",
      );
    }
    return NextResponse.json({
      success: true,
      type: "realtime",
      data: realtime,
    });
  } catch (error) {
    console.error("[GA4 Realtime API] Error:", error);
    return NextResponse.json(
      { success: false, error: "GA4 veri alınamadı" },
      { status: 500 },
    );
  }
}
