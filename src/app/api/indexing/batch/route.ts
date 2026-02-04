/**
 * Google Indexing API Toplu Bildirim Endpoint'i
 *
 * POST /api/indexing/batch
 * Body: { urls: Array<{ url: string, type: 'URL_UPDATED' | 'URL_DELETED' }> }
 */

import { NextRequest, NextResponse } from "next/server";
import { notifyGoogleBatch } from "@/lib/seo/google-indexing-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls } = body;

    // Validasyon
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: "urls parametresi gerekli ve array olmalı" },
        { status: 400 },
      );
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "En az 1 URL gönderilmeli" },
        { status: 400 },
      );
    }

    if (urls.length > 100) {
      return NextResponse.json(
        { error: "Maksimum 100 URL gönderilebilir" },
        { status: 400 },
      );
    }

    // Her URL'yi validate et
    for (const item of urls) {
      if (!item.url) {
        return NextResponse.json(
          { error: "Her öğe url içermeli" },
          { status: 400 },
        );
      }

      if (
        item.type &&
        item.type !== "URL_UPDATED" &&
        item.type !== "URL_DELETED"
      ) {
        return NextResponse.json(
          {
            error:
              "Geçersiz bildirim türü. URL_UPDATED veya URL_DELETED olmalı",
          },
          { status: 400 },
        );
      }

      try {
        new URL(item.url);
      } catch {
        return NextResponse.json(
          { error: `Geçersiz URL formatı: ${item.url}` },
          { status: 400 },
        );
      }
    }

    // Google'a toplu bildir
    const result = await notifyGoogleBatch(urls);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${result.successCount} URL başarıyla Google'a bildirildi`,
        total: result.total,
        successCount: result.successCount,
        failCount: result.failCount,
        results: result.results,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("❌ Batch Indexing API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası", details: error.message },
      { status: 500 },
    );
  }
}
