import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { getAllQueueStats } from "@/lib/queue-manager";

export const dynamic = "force-dynamic";

// Pipeline stage order for display
const PIPELINE_STAGES = [
  {
    queue: "unique-articles",
    label: "Duplicate Detector",
    icon: "🔍",
    shortLabel: "Dedupe",
  },
  {
    queue: "relevant-articles",
    label: "Relevance Filter",
    icon: "🎯",
    shortLabel: "Relevance",
  },
  {
    queue: "trend-enrichment",
    label: "Trend Enricher",
    icon: "📈",
    shortLabel: "Trends",
  },
  {
    queue: "enriched-articles",
    label: "Content Enricher",
    icon: "✍️",
    shortLabel: "Enrich",
  },
  {
    queue: "articles-with-visuals",
    label: "Visual Generator",
    icon: "🎨",
    shortLabel: "Visuals",
  },
  {
    queue: "database-publisher",
    label: "DB Publisher",
    icon: "💾",
    shortLabel: "Publish",
  },
  {
    queue: "social-share",
    label: "Social Share",
    icon: "📢",
    shortLabel: "Share",
  },
];

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

    const stages = PIPELINE_STAGES.map((stage) => {
      const stats = allStats.find((s) => s.queueName === stage.queue);
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
        queue: stage.queue,
        label: stage.label,
        shortLabel: stage.shortLabel,
        icon: stage.icon,
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
