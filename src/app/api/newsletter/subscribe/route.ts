import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  frequency: z.enum(["REALTIME", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
  categories: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, frequency, categories } = subscribeSchema.parse(body);

    // Check if already subscribed
    const existing = await db.newsletter.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.status === "ACTIVE") {
        return NextResponse.json(
          { success: false, error: "Bu e-posta adresi zaten kayıtlı" },
          { status: 400 },
        );
      }

      // Reactivate subscription
      await db.newsletter.update({
        where: { email },
        data: {
          status: "ACTIVE",
          subscribedAt: new Date(),
          unsubscribedAt: null,
          frequency: frequency || existing.frequency,
          categories: categories || existing.categories,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Aboneliğiniz yeniden aktif edildi",
      });
    }

    // Create new subscription
    const subscription = await db.newsletter.create({
      data: {
        email,
        frequency: frequency || "DAILY",
        categories: categories || [],
        source: request.headers.get("referer") || "website",
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
        userAgent: request.headers.get("user-agent"),
      },
    });

    // Send welcome email
    try {
      const { emailService } = await import("@/lib/email");
      await emailService.sendWelcomeEmail(
        subscription.email,
        subscription.token,
        subscription.frequency,
      );
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the subscription if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Bülten aboneliğiniz başarıyla oluşturuldu",
      data: {
        email: subscription.email,
        frequency: subscription.frequency,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 },
      );
    }

    console.error("Newsletter subscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Bir hata oluştu" },
      { status: 500 },
    );
  }
}
