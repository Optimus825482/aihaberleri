import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter olmalı").max(100),
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  subject: z.string().min(1, "Konu seçin"),
  message: z.string().min(10, "Mesaj en az 10 karakter olmalı").max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = contactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      );
    }

    const { name, email, subject, message } = result.data;

    // Rate limiting check (simple IP-based)
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const recentMessages = await db.contactMessage.count({
      where: {
        email,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    if (recentMessages >= 3) {
      return NextResponse.json(
        {
          error:
            "Çok fazla mesaj gönderdiniz. Lütfen daha sonra tekrar deneyin.",
        },
        { status: 429 },
      );
    }

    // Save to database
    await db.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mesajınız başarıyla gönderildi",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Mesaj gönderilemedi. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
