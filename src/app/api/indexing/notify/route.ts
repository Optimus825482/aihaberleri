/**
 * Google Indexing API Bildirim Endpoint'i
 *
 * POST /api/indexing/notify
 * Body: { url: string, type?: 'URL_UPDATED' | 'URL_DELETED' }
 */

import { NextRequest, NextResponse } from "next/server";
import { notifyGoogle } from "@/lib/seo/google-indexing-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, type = "URL_UPDATED" } = body;

    // Validasyon
    if (!url) {
      return NextResponse.json(
        { error: "URL parametresi gerekli" },
        { status: 400 },
      );
    }

    if (type !== "URL_UPDATED" && type !== "URL_DELETED") {
      return NextResponse.json(
        {
          error: "Geçersiz bildirim türü. URL_UPDATED veya URL_DELETED olmalı",
        },
        { status: 400 },
      );
    }

    // URL formatı kontrolü
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Geçersiz URL formatı" },
        { status: 400 },
      );
    }

    // Google'a bildir
    const result = await notifyGoogle(url, type);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `URL başarıyla Google'a bildirildi: ${url}`,
        data: result.data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: result.details,
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("❌ Indexing API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası", details: error.message },
      { status: 500 },
    );
  }
}
