import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getNewsAgentQueue } from "@/lib/queue";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Check authentication (skip in development)
  if (process.env.NODE_ENV === "production") {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }
  }

  // Get jobId parameter from URL (to track specific job)
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  const newsAgentQueue = getNewsAgentQueue();
  const redis = getRedis();

  if (!newsAgentQueue) {
    return new Response(
      JSON.stringify({
        error:
          "Worker kuyruğu kullanılamıyor. Lütfen worker container'ının çalıştığından emin olun.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper function to send log messages
      const sendLog = (
        message: string,
        type: "info" | "success" | "error" | "progress" = "info",
      ) => {
        const data = JSON.stringify({
          message,
          type,
          timestamp: new Date().toISOString(),
        });
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (err) {
          console.log(`[Stream Closed] ${message}`);
        }
      };

      try {
        sendLog("🔍 Worker job'u aranıyor...", "info");

        // Find the job (either specific jobId or latest active/waiting job)
        let job;
        if (jobId) {
          job = await newsAgentQueue!.getJob(jobId);
          if (!job) {
            sendLog(`❌ Job bulunamadı: ${jobId}`, "error");
            controller.close();
            return;
          }
        } else {
          // Get latest active or waiting job
          const [activeJobs, waitingJobs, delayedJobs] = await Promise.all([
            newsAgentQueue!.getJobs(["active"]),
            newsAgentQueue!.getJobs(["waiting"]),
            newsAgentQueue!.getJobs(["delayed"]),
          ]);

          job =
            activeJobs[0] ||
            waitingJobs[0] ||
            delayedJobs.find((j) => j.id?.includes("manual-trigger"));

          if (!job) {
            sendLog(
              "⚠️ Aktif job bulunamadı. Yeni bir job başlatmak için 'Manuel Tetikle' butonunu kullanın.",
              "error",
            );
            controller.close();
            return;
          }
        }

        sendLog(`✅ Job bulundu: ${job.id}`, "success");
        sendLog(`📊 Job durumu: ${await job.getState()}`, "info");

        // Poll job status and logs
        let lastProgress = 0;
        let lastMessage = "";
        let isComplete = false;
        const pollInterval = 2000; // 2 seconds

        while (!isComplete) {
          try {
            const state = await job.getState();
            const progress = (await job.progress) as number;

            // Try to get detailed progress from Redis (agent writes this)
            if (redis) {
              try {
                // Try to find agent log ID from job data
                const jobData = job.data as any;
                const agentLogId = jobData?.agentLogId;

                // Also check for any running agent logs
                const keys = await redis.keys("job:*:progress");
                for (const key of keys) {
                  const progressData = await redis.get(key);
                  if (progressData) {
                    try {
                      const parsed = JSON.parse(progressData);
                      if (parsed.message && parsed.message !== lastMessage) {
                        sendLog(parsed.message, "progress");
                        lastMessage = parsed.message;
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                }
              } catch (redisError) {
                // Redis error is non-critical
              }
            }

            // Send progress updates
            if (progress > lastProgress) {
              sendLog(`📊 İlerleme: %${progress}`, "progress");
              lastProgress = progress;
            }

            // Check job state
            if (state === "completed") {
              const result = await job.returnvalue;
              sendLog("✅ Agent başarıyla tamamlandı!", "success");
              sendLog(
                `📊 ${result.articlesCreated} haber oluşturuldu`,
                "success",
              );
              sendLog(`⏱️ Süre: ${result.duration}s`, "info");

              // Send final result
              const finalData = JSON.stringify({
                type: "complete",
                result,
                timestamp: new Date().toISOString(),
              });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
              isComplete = true;
            } else if (state === "failed") {
              const error = await job.failedReason;
              sendLog(`❌ Job başarısız: ${error}`, "error");
              isComplete = true;
            } else if (state === "active") {
              // Job is running, continue polling
              sendLog("🔄 Agent çalışıyor...", "info");
            } else if (state === "waiting" || state === "delayed") {
              sendLog(`⏳ Job sırada bekliyor (${state})...`, "info");
            }

            // Wait before next poll
            if (!isComplete) {
              await new Promise((resolve) => setTimeout(resolve, pollInterval));
            }
          } catch (pollError) {
            console.error("Polling error:", pollError);
            sendLog(
              `⚠️ Job durumu kontrol edilirken hata: ${pollError instanceof Error ? pollError.message : "Bilinmeyen hata"}`,
              "error",
            );
            // Continue polling despite errors
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Bilinmeyen hata";
        sendLog(`❌ Hata: ${errorMessage}`, "error");
      } finally {
        try {
          controller.close();
        } catch (err) {
          console.log("[Stream] Already closed");
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
