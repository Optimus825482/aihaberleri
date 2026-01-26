import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { executeNewsAgent } from "@/services/agent.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Check authentication (skip in development)
  if (process.env.NODE_ENV === "production") {
    const session = await auth();
    if (!session) {
      return new Response("Yetkisiz erişim", { status: 401 });
    }
  }

  // Get category parameter from URL
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Capture original console methods immediately
      const originalLog = console.log;
      const originalError = console.error;

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
          // If stream is closed (client disconnected), fallback to system log
          // This ensures the agent continues running in the background
          originalLog(`[Background] ${message}`);
        }
      };

      try {
        if (categorySlug) {
          sendLog(
            `🤖 Agent çalıştırması başlatılıyor (Kategori: ${categorySlug})...`,
            "info",
          );
        } else {
          sendLog(
            "🤖 Agent çalıştırması başlatılıyor (Tüm Kategoriler)...",
            "info",
          );
        }

        console.log = (...args: any[]) => {
          const message = args.join(" ");
          sendLog(message, "info");
          originalLog(...args);
        };

        console.error = (...args: any[]) => {
          const message = args.join(" ");
          sendLog(message, "error");
          originalError(...args);
        };

        // Execute agent with optional category filter
        const result = await executeNewsAgent(categorySlug || undefined);

        // Restore console
        console.log = originalLog;
        console.error = originalError;

        if (result.success) {
          sendLog(`✅ Agent başarıyla tamamlandı!`, "success");
          sendLog(`📊 ${result.articlesCreated} haber oluşturuldu`, "success");
          sendLog(`⏱️ Süre: ${result.duration}s`, "info");

          // Send final result
          const finalData = JSON.stringify({
            type: "complete",
            result,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
        } else {
          sendLog(`❌ Agent çalıştırması başarısız`, "error");
          if (result.errors.length > 0) {
            result.errors.forEach((error) => sendLog(`   ${error}`, "error"));
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Bilinmeyen hata";
        sendLog(`❌ Hata: ${errorMessage}`, "error");
      } finally {
        controller.close();
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
