import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAgentStats,
  getAgentHistory,
  getCategoryStats,
} from "@/services/agent.service";
import { getQueueStats } from "@/lib/queue";

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Get stats
    const [agentStats, queueStats, history] = await Promise.all([
      getAgentStats(),
      getQueueStats(),
      getAgentHistory(5),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        agent: agentStats,
        queue: queueStats,
        history,
        categoryStats: await getCategoryStats(),
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
