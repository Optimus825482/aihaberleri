/**
 * Google Indexing API Durum Sorgulama Endpoint'i
 *
 * GET /api/indexing/status?url=https://example.com
 */

import { NextRequest, NextResponse } from "next/server";
import { getNotificationMetadata } from "@/lib/seo/google-indexing-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    // Validasyon
    if (!url) {
      return NextResponse.json(
        { error: "url parametresi gerekli" },
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

    // Durum sorgula
    const result = await getNotificationMetadata(url);

    if (result.success) {
      return NextResponse.json({
        success: true,
        url,
        data: result.data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          url,
          error: result.error,
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("❌ Indexing Status API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası", details: error.message },
      { status: 500 },
    );
  }
}
