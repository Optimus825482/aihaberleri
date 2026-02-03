import { NextRequest, NextResponse } from "next/server";
import { cronSaveProviderStats } from "@/lib/search-provider-stats";

/**
 * POST /api/cron/save-provider-stats
 *
 * Cron job endpoint - Her 5 dakikada bir çalışır
 * Provider istatistiklerini database'e kaydeder
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/save-provider-stats",
 *     "schedule": "* /5 * * * *"
 *   }]
 * }
 *
 * Security:
 * - Vercel Cron: Otomatik olarak güvenli (internal request)
 * - Manual test: CRON_SECRET env variable ile koruma
 */
export async function POST(request: NextRequest) {
  try {
    // Vercel Cron güvenlik kontrolü
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Eğer CRON_SECRET varsa, kontrol et
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn("⚠️ Unauthorized cron job attempt");
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    console.log("⏰ Cron job başlatıldı: save-provider-stats");

    // Stats'ı kaydet
    const result = await cronSaveProviderStats();

    if (result.success) {
      console.log("✅ Cron job başarılı:", result.message);
      return NextResponse.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error("❌ Cron job başarısız:", result.message);
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("❌ Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Cron job başarısız",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cron/save-provider-stats
 *
 * Manual test endpoint
 * Browser'dan veya curl ile test edilebilir
 */
export async function GET(request: NextRequest) {
  try {
    // Manual test için basit auth
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json(
        { error: "Yetkisiz erişim - secret parametresi gerekli" },
        { status: 401 },
      );
    }

    console.log("🧪 Manual test: save-provider-stats");

    const result = await cronSaveProviderStats();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
      note: "Bu endpoint sadece test içindir. Production'da POST kullanın.",
    });
  } catch (error: any) {
    console.error("❌ Manual test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Test başarısız",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
