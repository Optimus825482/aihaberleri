import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const sendSchema = z.object({
  title: z.string().min(1).max(50),
  body: z.string().min(1).max(120),
  url: z.string().url().optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { title, body: message, url } = sendSchema.parse(body);

    // Get all active push subscriptions
    const subscriptions = await db.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "Aktif abone yok",
      });
    }

    // Send push notifications using Web Push API
    const webpush = require("web-push");

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL || "info@aihaberleri.org"}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );

    const payload = JSON.stringify({
      title,
      body: message,
      url: url || "/",
      icon: "/logos/brand/logo-icon.png",
      badge: "/logos/brand/logo-icon.png",
    });

    let sent = 0;
    let failed = 0;

    // Send to all subscribers
    await Promise.all(
      subscriptions.map(async (subscription: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys as { p256dh: string; auth: string },
            },
            payload,
          );

          // Update last used
          await db.pushSubscription.update({
            where: { id: subscription.id },
            data: { lastUsedAt: new Date() },
          });

          sent++;
        } catch (error: any) {
          console.error("Push send error:", error);
          failed++;

          // Remove invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            await db.pushSubscription.delete({
              where: { id: subscription.id },
            });
          }
        }
      }),
    );

    return NextResponse.json({
      success: true,
      sent,
      failed,
      message: `${sent} aboneye bildirim gönderildi`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 },
      );
    }

    console.error("Push send error:", error);
    return NextResponse.json(
      { success: false, error: "Bir hata oluştu" },
      { status: 500 },
    );
  }
}
