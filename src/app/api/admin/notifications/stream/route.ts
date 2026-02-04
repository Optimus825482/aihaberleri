import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Admin notification types
type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "agent"
  | "visitor"
  | "article";

interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

// Create notification helper
function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  action?: { label: string; href: string },
): AdminNotification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    title,
    message,
    timestamp: new Date(),
    read: false,
    action,
  };
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let isStreamClosed = false;
  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const connectMsg = createNotification(
        "success",
        "Bağlantı Kuruldu",
        "Gerçek zamanlı bildirimler aktif",
      );
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(connectMsg)}\n\n`),
      );

      // Track last checked timestamps
      let lastArticleCheck = new Date();
      let lastAgentCheck = new Date();
      let lastVisitorMilestone = 0;

      // Poll for new notifications every 30 seconds
      intervalId = setInterval(async () => {
        if (isStreamClosed) {
          if (intervalId) clearInterval(intervalId);
          return;
        }

        try {
          // Check for new articles
          const newArticles = await prisma.article.findMany({
            where: {
              createdAt: { gt: lastArticleCheck },
              status: "PUBLISHED",
            },
            select: {
              id: true,
              title: true,
              slug: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          });

          if (newArticles.length > 0) {
            lastArticleCheck = new Date();
            for (const article of newArticles) {
              const notification = createNotification(
                "article",
                "Yeni Makale",
                article.title,
                { label: "Görüntüle", href: `/haberler/${article.slug}` },
              );
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(notification)}\n\n`),
              );
            }
          }

          // Check for agent activity
          const recentAgentLogs = await prisma.agentLog.findMany({
            where: {
              executionTime: { gt: lastAgentCheck },
            },
            select: {
              id: true,
              status: true,
              articlesCreated: true,
              executionTime: true,
            },
            orderBy: { executionTime: "desc" },
            take: 3,
          });

          if (recentAgentLogs.length > 0) {
            lastAgentCheck = new Date();
            for (const log of recentAgentLogs) {
              const isSuccess = log.status === "SUCCESS";
              const notification = createNotification(
                "agent",
                isSuccess ? "Agent Tamamlandı" : "Agent Çalıştı",
                isSuccess
                  ? `${log.articlesCreated} makale oluşturuldu`
                  : `Agent durumu: ${log.status}`,
                { label: "Detaylar", href: "/admin/agent-settings" },
              );
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(notification)}\n\n`),
              );
            }
          }

          // Check visitor milestones
          const totalVisitors = await prisma.visitor.count();
          const milestones = [100, 500, 1000, 5000, 10000, 50000, 100000];

          for (const milestone of milestones) {
            if (
              totalVisitors >= milestone &&
              lastVisitorMilestone < milestone
            ) {
              lastVisitorMilestone = milestone;
              const notification = createNotification(
                "visitor",
                "Ziyaretçi Hedefi!",
                `Tebrikler! ${milestone.toLocaleString("tr-TR")} ziyaretçiye ulaştınız!`,
                { label: "Analitiği Gör", href: "/admin/analytics" },
              );
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(notification)}\n\n`),
              );
              break;
            }
          }

          // Send heartbeat to keep connection alive
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch (error) {
          console.error("Notification stream error:", error);
          // Don't close on error, just log and continue
        }
      }, 30000); // Check every 30 seconds
    },
    cancel() {
      isStreamClosed = true;
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // For nginx
    },
  });
}
