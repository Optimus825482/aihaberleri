import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  getAgentStats,
  getAgentHistory,
  getCategoryStats,
} from "@/services/agent.service";
import { getQueueStats, getUpcomingJobs } from "@/lib/queue";

export const dynamic = "force-dynamic";

const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!nextAuthSecret) {
  throw new Error("NEXTAUTH_SECRET is required for /api/agent/stats");
}

const JWT_SECRET = new TextEncoder().encode(nextAuthSecret);

export async function GET(request: NextRequest) {
  try {
    // Check authentication using custom JWT
    const token = request.cookies.get("admin-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: "Geçersiz oturum" }, { status: 401 });
    }

    // Get stats
    const [agentStats, queueStats, history, upcomingJobs, categoryStats] =
      await Promise.all([
        getAgentStats(),
        getQueueStats(),
        getAgentHistory(5),
        getUpcomingJobs(),
        getCategoryStats(),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        agent: agentStats,
        queue: queueStats,
        history,
        upcomingJobs,
        categoryStats,
      },
    });
  } catch (error) {
    console.error("İstatistik hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
