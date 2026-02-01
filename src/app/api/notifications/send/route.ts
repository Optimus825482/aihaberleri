import { sendPushNotification } from "@/lib/push";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    // Auth check for admin
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, message, url } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 },
      );
    }

    const result = await sendPushNotification(title, message, url || "/");

    // Log the push notification (use metadata for type since AgentLog doesn't have type field)
    await db.agentLog.create({
      data: {
        status: "SUCCESS",
        articlesCreated: 0,
        articlesScraped: 0,
        duration: 0,
        errors: [],
        metadata: {
          logType: "PUSH_NOTIFICATION",
          type: "manual-push",
          title,
          message,
          url: url || "/",
          sent: result?.sent || 0,
        },
      },
    });

    return NextResponse.json({
      success: true,
      sent: result?.sent || 0,
      message: `Push bildirimi ${result?.sent || 0} aboneye gönderildi`,
    });
  } catch (error) {
    console.error("Manual push error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/notifications/send
 * Get push notification stats
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriberCount = await db.pushSubscription.count();

    // Find the latest push notification log by checking metadata
    const allLogs = await db.agentLog.findMany({
      orderBy: { executionTime: "desc" },
      take: 50,
    });

    const lastPush = allLogs.find(
      (log) =>
        log.metadata &&
        typeof log.metadata === "object" &&
        (log.metadata as Record<string, unknown>).logType ===
          "PUSH_NOTIFICATION",
    );

    return NextResponse.json({
      success: true,
      data: {
        subscriberCount,
        lastSent: lastPush?.executionTime || null,
        lastTitle:
          (lastPush?.metadata as Record<string, unknown>)?.title || null,
      },
    });
  } catch (error) {
    console.error("Push stats error:", error);
    return NextResponse.json(
      { success: false, error: "Stats check failed" },
      { status: 500 },
    );
  }
}
