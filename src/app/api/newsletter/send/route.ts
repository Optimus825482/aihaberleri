import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailService } from "@/lib/email";
import { z } from "zod";

const sendNewsletterSchema = z.object({
  subject: z.string().min(1, "Konu gerekli").max(100, "Konu çok uzun"),
  content: z.string().min(1, "İçerik gerekli"),
  preheader: z.string().max(150).optional(),
  testMode: z.boolean().optional(),
  testEmail: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject, content, preheader, testMode, testEmail } =
      sendNewsletterSchema.parse(body);

    // Test mode - send to single email
    if (testMode && testEmail) {
      const result = await emailService.send({
        to: testEmail,
        subject: `[TEST] ${subject}`,
        html: content,
        tags: [{ name: "type", value: "newsletter-test" }],
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Test e-postası gönderildi",
        sent: 1,
        failed: 0,
      });
    }

    // Get active subscribers
    const subscribers = await db.newsletter.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        email: true,
        token: true,
      },
    });

    if (subscribers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aktif abone bulunamadı" },
        { status: 400 },
      );
    }

    // Send newsletter to all subscribers
    const result = await emailService.sendNewsletter(subscribers, {
      subject,
      content,
      preheader,
    });

    // Update last sent date for all active subscribers
    await db.newsletter.updateMany({
      where: { status: "ACTIVE" },
      data: { lastSentAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `${result.sent} aboneye e-posta gönderildi`,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 },
      );
    }

    console.error("Newsletter send error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bir hata oluştu",
      },
      { status: 500 },
    );
  }
}
