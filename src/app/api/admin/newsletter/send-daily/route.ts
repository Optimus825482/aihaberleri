import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { sendDailyDigest } from "@/services/newsletter.service";
import { triggerNewsletterNow } from "@/lib/queue";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/newsletter/send-daily
 * Manually trigger daily newsletter digest
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    const body = await request.json().catch(() => ({}));
    const useQueue = body.useQueue !== false; // Default to queue

    if (useQueue) {
      // Use BullMQ queue (recommended)
      const result = await triggerNewsletterNow();

      if (!result) {
        return NextResponse.json(
          { success: false, error: "Newsletter queue not available" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Newsletter job added to queue",
        jobId: result.jobId,
      });
    } else {
      // Direct execution (for testing/debugging)
      const result = await sendDailyDigest();

      return NextResponse.json({
        ...result,
        message: result.success
          ? `${result.sent} aboneye newsletter gönderildi`
          : "Newsletter gönderilemedi",
      });
    }
  } catch (error) {
    console.error("Manual newsletter trigger error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bir hata oluştu",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/newsletter/send-daily
 * Get newsletter status
 */
export async function GET() {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    // Get latest newsletter log (uses metadata.logType instead of type field)
    const { db } = await import("@/lib/db");

    // Find the latest newsletter log by checking metadata
    const allLogs = await db.agentLog.findMany({
      orderBy: { executionTime: "desc" },
      take: 50,
    });

    const lastNewsletter = allLogs.find(
      (log) =>
        log.metadata &&
        typeof log.metadata === "object" &&
        (log.metadata as Record<string, unknown>).logType === "NEWSLETTER",
    );

    const subscriberCount = await db.newsletter.count({
      where: { status: "ACTIVE" },
    });

    // Get today's article count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayArticleCount = await db.article.count({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: today, lt: tomorrow },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        lastSent: lastNewsletter?.executionTime || null,
        lastStatus: lastNewsletter?.status || null,
        subscriberCount,
        todayArticleCount,
        scheduledTime: "19:00 (Turkey)",
      },
    });
  } catch (error) {
    console.error("Newsletter status error:", error);
    return NextResponse.json(
      { success: false, error: "Status check failed" },
      { status: 500 },
    );
  }
}
