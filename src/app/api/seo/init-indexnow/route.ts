/**
 * IndexNow Initialization API Endpoint
 * GET /api/seo/init-indexnow
 */

import { NextResponse } from "next/server";
import { writeIndexNowKeyFile, submitAllArticlesToIndexNow } from "@/lib/seo";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("🚀 IndexNow initialization başlatılıyor...");

    // 1. Key dosyasını oluştur
    console.log("📝 IndexNow key dosyası oluşturuluyor...");
    await writeIndexNowKeyFile();
    console.log("✅ Key dosyası oluşturuldu");

    // 2. Tüm article'ları submit et
    console.log("📤 Tüm article'lar IndexNow'a gönderiliyor...");
    const result = await submitAllArticlesToIndexNow();

    if (result.success) {
      console.log(`✅ ${result.count} article başarıyla gönderildi`);
      return NextResponse.json({
        success: true,
        message: "IndexNow initialization tamamlandı",
        count: result.count,
        steps: [
          "✅ Key dosyası oluşturuldu",
          `✅ ${result.count} article IndexNow'a gönderildi`,
          "📋 Sonraki adım: Google Search Console'da sitemap submit edin",
        ],
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Article'lar gönderilemedi",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("❌ IndexNow initialization hatası:", error);
    return NextResponse.json(
      {
        success: false,
        message: "IndexNow initialization başarısız",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
