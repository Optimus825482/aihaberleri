import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { getAllQueueStats } from "@/lib/queue-manager";
import {
  PIPELINE_STEP_DEFINITIONS,
  type PipelineStepId,
} from "@/lib/pipeline-registry";

export const dynamic = "force-dynamic";

const STEP_ICONS: Record<PipelineStepId, string> = {
  "duplicate-detector": "🔍",
  "relevance-filter": "🎯",
  "trend-enrichment": "📈",
  "source-gatherer": "🧭",
  "content-synthesizer": "✍️",
  "content-validator": "✅",
  "visual-generator": "🎨",
  "seo-optimizer": "🔎",
  "database-publisher": "💾",
  "social-share": "📢",
};

export async function GET() {
  const [session, adminSession] = await Promise.all([
    auth(),
    getAdminSession(),
  ]);
  if (!session && !adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allStats = await getAllQueueStats();

    const stages = PIPELINE_STEP_DEFINITIONS.map((step) => {
      const stats = allStats.find((s) => s.queueName === step.queueName);
      const status =
        stats && stats.active > 0
          ? "active"
          : stats && stats.waiting > 0
            ? "waiting"
            : stats && stats.failed > 0 && stats.completed === 0
              ? "failed"
              : stats && stats.completed > 0
                ? "completed"
                : "idle";

      return {
        queue: step.queueName,
        label: step.displayName,
        shortLabel: step.shortLabel,
        icon: STEP_ICONS[step.id],
        status,
        waiting: stats?.waiting ?? 0,
        active: stats?.active ?? 0,
        completed: stats?.completed ?? 0,
        failed: stats?.failed ?? 0,
        delayed: stats?.delayed ?? 0,
      };
    });

    // Determine overall pipeline status
    const hasActive = stages.some((s) => s.status === "active");
    const hasWaiting = stages.some((s) => s.status === "waiting");
    const pipelineStatus = hasActive
      ? "running"
      : hasWaiting
        ? "queued"
        : "idle";

    return NextResponse.json({
      stages,
      pipelineStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Pipeline live error:", error);
    return NextResponse.json(
      { error: "Failed to fetch live pipeline data" },
      { status: 500 },
    );
  }
}
