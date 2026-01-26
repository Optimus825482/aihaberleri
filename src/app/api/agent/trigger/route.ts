import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
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

    return NextResponse.json({
      success: true,
      message: "Agent manuel olarak tetiklendi",
      data: {
        triggeredAt: new Date().toISOString(),
        nextRun: nextRun.toISOString(),
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
