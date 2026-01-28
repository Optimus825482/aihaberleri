import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  language: z.string().default("tr").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, keys, language } = pushSubscribeSchema.parse(body);

    // Check if already subscribed
    const existing = await db.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      // Update last used
      await db.pushSubscription.update({
        where: { endpoint },
        data: { lastUsedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: "Bildirim aboneliği zaten aktif",
      });
    }

    // Create new subscription
    await db.pushSubscription.create({
      data: {
        endpoint,
        keys,
        userAgent: request.headers.get("user-agent"),
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
        language: language || "tr",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bildirim aboneliği başarıyla oluşturuldu",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 },
      );
    }

    console.error("Push subscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Bir hata oluştu" },
      { status: 500 },
    );
  }
}
