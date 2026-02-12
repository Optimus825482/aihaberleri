/**
 * GA4 Realtime Analytics API
 *
 * GET /api/admin/analytics/ga4-realtime → Realtime ziyaretçi verileri
 * GET /api/admin/analytics/ga4-realtime?period=7d → Dönem bazlı trafik özeti
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  isGA4Configured,
  getRealtimeVisitors,
  getGA4TrafficOverview,
} from "@/lib/ga4-client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-this",
);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Auth check
  const token = request.cookies.get("admin-session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    await jwtVerify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: "Geçersiz oturum" }, { status: 401 });
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

    // Realtime veriler
    const realtime = await getRealtimeVisitors();
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
