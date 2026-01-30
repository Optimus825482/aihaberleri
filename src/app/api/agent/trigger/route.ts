import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeNewsAgent } from "@/services/agent.service";
import { getRedis } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Rate limiting: Prevent spam clicks (30 second cooldown)
    const redis = getRedis();
    if (redis) {
      const cooldownKey = `trigger-cooldown:${session.user?.id || "admin"}`;
      const lastTrigger = await redis.get(cooldownKey);

      if (lastTrigger) {
        const elapsed = Date.now() - parseInt(lastTrigger);
        if (elapsed < 30000) {
          const remainingSeconds = Math.ceil((30000 - elapsed) / 1000);
          return NextResponse.json(
            {
              success: false,
              error: `Lütfen ${remainingSeconds} saniye bekleyin`,
            },
            { status: 429 },
          );
        }
      }

      // Set cooldown
      await redis.set(cooldownKey, Date.now().toString(), "EX", 30);
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
        console.log("📋 Queue available, adding job...");

        // Remove any existing delayed jobs to avoid conflicts
        const existingJobs = await newsAgentQueue.getJobs([
          "delayed",
          "waiting",
        ]);
        console.log(`   Found ${existingJobs.length} existing jobs in queue`);

        for (const job of existingJobs) {
          if (job.id === "news-agent-scheduled-run") {
            console.log(`   Removing existing job: ${job.id}`);
            await job.remove();
          }
        }

        const jobId = executeNow
          ? `manual-trigger-${Date.now()}`
          : "news-agent-scheduled-run";

        console.log(`   Adding new job with ID: ${jobId}`);

        // Add immediate execution job
        const job = await newsAgentQueue.add(
          "scrape-and-publish",
          {},
          {
            jobId,
            priority: executeNow ? 1 : 10, // High priority for manual triggers
            removeOnComplete: true,
            delay: 0, // Execute immediately
          },
        );

        console.log(`✅ Job added successfully!`);
        console.log(`   Job ID: ${job.id}`);
        console.log(`   Job Name: ${job.name}`);
        console.log(`   Priority: ${job.opts.priority}`);
        console.log(`   State: ${await job.getState()}`);

        return NextResponse.json({
          success: true,
          message: "Agent kuyruğa eklendi ve worker tarafından işlenecek",
          data: {
            jobId: job.id,
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
          details:
            queueError instanceof Error
              ? queueError.message
              : String(queueError),
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
