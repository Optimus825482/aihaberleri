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

    // If executeNow is true, run agent directly (synchronous execution)
    if (executeNow) {
      console.log("🚀 Executing agent directly (manual trigger)...");

      // Execute in background to avoid timeout
      executeNewsAgent()
        .then((result) => {
          console.log("✅ Agent execution completed:", result);
        })
        .catch((error) => {
          console.error("❌ Agent execution failed:", error);
        });

      return NextResponse.json({
        success: true,
        message: "Agent başlatıldı (arka planda çalışıyor)",
        data: {
          triggeredAt: new Date().toISOString(),
          nextRun: nextRun.toISOString(),
          executionMode: "direct",
        },
      });
    }

    // Try to add to queue if available
    try {
      const { newsAgentQueue } = await import("@/lib/queue");
      if (newsAgentQueue) {
        await newsAgentQueue.add(
          "scrape-and-publish",
          {},
          {
            priority: 1, // High priority for manual triggers
            removeOnComplete: true,
          },
        );

        return NextResponse.json({
          success: true,
          message: "Agent kuyruğa eklendi",
          data: {
            triggeredAt: new Date().toISOString(),
            nextRun: nextRun.toISOString(),
            executionMode: "queue",
          },
        });
      }
    } catch (queueError) {
      console.warn("⚠️ Queue not available, executing directly:", queueError);
    }

    // Fallback: Execute directly if queue is not available
    console.log("🚀 Queue not available, executing agent directly...");

    // Execute in background
    executeNewsAgent()
      .then((result) => {
        console.log("✅ Agent execution completed:", result);
      })
      .catch((error) => {
        console.error("❌ Agent execution failed:", error);
      });

    return NextResponse.json({
      success: true,
      message: "Agent başlatıldı (arka planda çalışıyor)",
      data: {
        triggeredAt: new Date().toISOString(),
        nextRun: nextRun.toISOString(),
        executionMode: "direct-fallback",
      },
    });
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
