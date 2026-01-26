import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAgentStats,
  getAgentHistory,
  getCategoryStats,
} from "@/services/agent.service";
import { getQueueStats, getUpcomingJobs } from "@/lib/queue";

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
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
