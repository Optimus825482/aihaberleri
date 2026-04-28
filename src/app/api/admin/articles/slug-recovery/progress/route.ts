import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  getQueue,
  getQueueStats,
  obliterateQueue,
  QUEUE_NAMES,
} from "@/lib/queue-manager";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/articles/slug-recovery/progress
 * Queue istatistikleri + son tamamlanan/başarısız/aktif job'lar
 */
export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  try {
    const [stats, queue] = await Promise.all([
      getQueueStats(QUEUE_NAMES.SLUG_RECOVERY),
      Promise.resolve(getQueue(QUEUE_NAMES.SLUG_RECOVERY)),
    ]);

    if (!queue || !stats) {
      return NextResponse.json({
        success: true,
        stats: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 },
        recent: [],
      });
    }

    const [completedJobs, failedJobs, activeJobs] = await Promise.all([
      queue.getCompleted(0, 20),
      queue.getFailed(0, 10),
      queue.getActive(0, 10),
    ]);

    type RecentJob =
      | { slug: string; status: "active"; progress: number | object }
      | { slug: string; status: "done"; title: string; trUrl: string }
      | { slug: string; status: "failed"; error: string };

    const recent: RecentJob[] = [
      ...activeJobs.map((j) => ({
        slug: j.data.slug as string,
        status: "active" as const,
        progress: j.progress ?? 0,
      })),
      ...completedJobs.slice(0, 15).map((j) => ({
        slug: j.data.slug as string,
        status: "done" as const,
        title: (j.returnvalue as { trTitle?: string })?.trTitle ?? j.data.slug,
        trUrl: `/news/${(j.returnvalue as { trSlug?: string })?.trSlug ?? j.data.slug}`,
      })),
      ...failedJobs.slice(0, 5).map((j) => ({
        slug: j.data.slug as string,
        status: "failed" as const,
        error: j.failedReason ?? "Bilinmeyen hata",
      })),
    ];

    return NextResponse.json({ success: true, stats, recent });
  } catch (error) {
    console.error("[SLUG-RECOVERY-PROGRESS]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Hata",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/articles/slug-recovery/progress
 * Kuyruğu tamamen temizler (test/sıfırlama için).
 */
export async function DELETE(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  try {
    await obliterateQueue(QUEUE_NAMES.SLUG_RECOVERY);
    return NextResponse.json({ success: true, message: "Kuyruk temizlendi" });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Hata",
      },
      { status: 500 },
    );
  }
}
