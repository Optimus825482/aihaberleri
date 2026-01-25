import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token gerekli" },
        { status: 400 },
      );
    }

    const subscription = await db.newsletter.findUnique({
      where: { token },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "Abonelik bulunamadı" },
        { status: 404 },
      );
    }

    if (subscription.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Abonelik zaten iptal edilmiş" },
        { status: 400 },
      );
    }

    await db.newsletter.update({
      where: { token },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
      },
    });

    // Send unsubscribe confirmation email
    try {
      const { emailService } = await import("@/lib/email");
      await emailService.sendUnsubscribeConfirmation(subscription.email);
    } catch (emailError) {
      console.error("Failed to send unsubscribe confirmation:", emailError);
      // Don't fail the unsubscribe if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Bülten aboneliğiniz iptal edildi",
    });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Bir hata oluştu" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
