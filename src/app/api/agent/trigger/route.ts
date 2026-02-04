import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeNewsAgent } from "@/services/agent.service";
import { getRedis } from "@/lib/redis";
import { apiLogger } from "@/lib/logger";

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      apiLogger.response(
        "POST",
        "/api/agent/trigger",
        401,
        Date.now() - startTime,
      );
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    apiLogger.request("POST", "/api/agent/trigger", session.user);

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
      const { getNewsAgentQueue } = await import("@/lib/queue");
      const newsAgentQueue = getNewsAgentQueue();

      if (newsAgentQueue) {
        console.log("📋 Queue available, adding job to BullMQ", {
          userId: session.user?.id,
        });
        console.log("📋 Queue available, adding job...");

        // Remove any existing jobs (including failed) to avoid conflicts
        const existingJobs = await newsAgentQueue.getJobs([
          "delayed",
          "waiting",
          "failed",
          "completed",
        ]);
        console.log(`   Found ${existingJobs.length} existing jobs in queue`);

        for (const job of existingJobs) {
          if (job.id === "news-agent-scheduled-run" || job.id?.startsWith("manual-trigger-")) {
            const state = await job.getState();
            console.log(`   Removing existing job: ${job.id} (state: ${state})`);
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
            removeOnFail: 3, // Keep last 3 failed jobs for debugging
            delay: 0, // Execute immediately
            attempts: 3, // Retry up to 3 times
            backoff: {
              type: "exponential",
              delay: 60000, // 1 minute initial delay
            },
          },
        );

        console.log(`✅ Job added successfully!`);
        console.log(`   Job ID: ${job.id}`);
        console.log(`   Job Name: ${job.name}`);
        console.log(`   Priority: ${job.opts.priority}`);
        console.log(`   State: ${await job.getState()}`);

        apiLogger.response(
          "POST",
          "/api/agent/trigger",
          200,
          Date.now() - startTime,
        );

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
      } else {
        // Queue null - Redis bağlantısı yok
        console.error("❌ Queue is null - Redis connection unavailable");
        apiLogger.response(
          "POST",
          "/api/agent/trigger",
          503,
          Date.now() - startTime,
        );
        return NextResponse.json(
          {
            success: false,
            error:
              "Worker kuyruğu oluşturulamadı. Redis bağlantısını kontrol edin.",
          },
          { status: 503 },
        );
      }
    } catch (queueError) {
      apiLogger.error("POST", "/api/agent/trigger", queueError as Error);
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
  } catch (error) {
    apiLogger.error("POST", "/api/agent/trigger", error as Error);
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
