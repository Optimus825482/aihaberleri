import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeNewsAgent } from "@/services/agent.service";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Get agent settings
    const enabledSetting = await db.setting.findUnique({
      where: { key: "agent.enabled" },
    });

    if (enabledSetting?.value !== "true") {
      return NextResponse.json(
        {
          success: false,
          error: "Agent şu anda devre dışı. Lütfen önce ayarlardan aktif edin.",
        },
        { status: 400 },
      );
    }

    // Parse request body to check execution mode
    const body = await request.json().catch(() => ({}));
    const executeNow = body.executeNow === true;

    // Update last run time
    await db.setting.upsert({
      where: { key: "agent.lastRun" },
      update: { value: new Date().toISOString() },
      create: { key: "agent.lastRun", value: new Date().toISOString() },
    });

    // Get interval hours for next run calculation
    const intervalSetting = await db.setting.findUnique({
      where: { key: "agent.intervalHours" },
    });
    const intervalHours = parseInt(intervalSetting?.value || "6");

    // Calculate and update next run time
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + intervalHours);

    await db.setting.upsert({
      where: { key: "agent.nextRun" },
      update: { value: nextRun.toISOString() },
      create: { key: "agent.nextRun", value: nextRun.toISOString() },
    });

    // Always use queue (worker) for execution - prevents duplicate runs
    try {
      const { newsAgentQueue } = await import("@/lib/queue");
      if (newsAgentQueue) {
        // Remove any existing delayed jobs to avoid conflicts
        const existingJobs = await newsAgentQueue.getJobs([
          "delayed",
          "waiting",
        ]);
        for (const job of existingJobs) {
          if (job.id === "news-agent-scheduled-run") {
            await job.remove();
          }
        }

        // Add immediate execution job
        await newsAgentQueue.add(
          "scrape-and-publish",
          {},
          {
            jobId: executeNow
              ? `manual-trigger-${Date.now()}`
              : "news-agent-scheduled-run",
            priority: executeNow ? 1 : 10, // High priority for manual triggers
            removeOnComplete: true,
            delay: 0, // Execute immediately
          },
        );

        return NextResponse.json({
          success: true,
          message: "Agent kuyruğa eklendi ve worker tarafından işlenecek",
          data: {
            triggeredAt: new Date().toISOString(),
            nextRun: nextRun.toISOString(),
            executionMode: "queue",
          },
        });
      }
    } catch (queueError) {
      console.error("❌ Queue error:", queueError);
      return NextResponse.json(
        {
          success: false,
          error:
            "Worker kuyruğu kullanılamıyor. Lütfen worker container'ının çalıştığından emin olun.",
        },
        { status: 503 },
      );
    }

    // If we reach here, queue is not available
    return NextResponse.json(
      {
        success: false,
        error:
          "Worker kuyruğu bulunamadı. Sistem yapılandırmasını kontrol edin.",
      },
      { status: 503 },
    );
  } catch (error) {
    console.error("Trigger agent error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
