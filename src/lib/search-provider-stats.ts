/**
 * Search Provider Stats Collector
 *
 * Her 5 dakikada bir getProviderStats() sonuçlarını database'e kaydeder
 * Cron job veya background worker tarafından çağrılmalıdır
 */

import { db } from "@/lib/db";
import { getProviderStats } from "@/lib/hybrid-search";

/**
 * Provider istatistiklerini database'e kaydet
 *
 * Bu fonksiyon:
 * 1. getProviderStats() ile mevcut durumu alır
 * 2. Her provider için SearchProviderMetric kaydı oluşturur
 * 3. Timestamp ile birlikte kaydeder
 *
 * Kullanım:
 * - Cron job: Her 5 dakikada bir çağır
 * - Background worker: Periyodik olarak çağır
 * - Manual: Test veya debug için
 */
export async function saveProviderStats(): Promise<void> {
  try {
    console.log("📊 Search provider stats kaydediliyor...");

    // Mevcut stats'ı al
    const stats = getProviderStats();
    const timestamp = new Date();

    // Her provider için ayrı kayıt oluştur
    const records = [
      {
        provider: "brave",
        timestamp,
        requests: stats.brave.requests,
        errors: stats.brave.errors,
        available: stats.brave.available,
        avgResponseTime: null, // TODO: Response time tracking eklenebilir
      },
      {
        provider: "tavily",
        timestamp,
        requests: stats.tavily.requests,
        errors: stats.tavily.errors,
        available: stats.tavily.available,
        avgResponseTime: null,
      },
      {
        provider: "searxng",
        timestamp,
        requests: stats.searxng.requests,
        errors: stats.searxng.errors,
        available: stats.searxng.available,
        avgResponseTime: null,
      },
    ];

    // Batch insert
    await db.searchProviderMetric.createMany({
      data: records,
    });

    console.log("✅ Search provider stats kaydedildi:", {
      brave: `${stats.brave.requests} requests, ${stats.brave.errors} errors`,
      tavily: `${stats.tavily.requests} requests, ${stats.tavily.errors} errors`,
      searxng: `${stats.searxng.requests} requests, ${stats.searxng.errors} errors`,
    });
  } catch (error) {
    console.error("❌ Search provider stats kaydetme hatası:", error);
    throw error;
  }
}

/**
 * Eski metrikleri temizle (30 günden eski)
 *
 * Database'in şişmesini önlemek için eski kayıtları siler
 * Günlük veya haftalık çalıştırılmalıdır
 */
export async function cleanupOldMetrics(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await db.searchProviderMetric.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`🧹 ${result.count} eski metric kaydı temizlendi`);
  } catch (error) {
    console.error("❌ Metric temizleme hatası:", error);
    throw error;
  }
}

/**
 * Provider istatistiklerini sıfırla
 *
 * UYARI: Bu fonksiyon sadece test veya debug için kullanılmalıdır!
 * Production'da kullanmayın!
 */
export async function resetProviderStats(): Promise<void> {
  try {
    console.warn("⚠️ Provider stats sıfırlanıyor (SADECE TEST İÇİN!)");

    await db.searchProviderMetric.deleteMany({});

    console.log("✅ Tüm provider stats silindi");
  } catch (error) {
    console.error("❌ Stats sıfırlama hatası:", error);
    throw error;
  }
}

/**
 * Cron job için wrapper
 *
 * Her 5 dakikada bir çalışacak şekilde ayarlanmalıdır
 *
 * Örnek (Vercel Cron):
 * @example
 * // vercel.json
 * {
 *   "crons": [{
 *     "path": "/api/cron/save-provider-stats",
 *     "schedule": "every 5 minutes"
 *   }]
 * }
 */
export async function cronSaveProviderStats(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await saveProviderStats();
    return {
      success: true,
      message: "Provider stats başarıyla kaydedildi",
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Provider stats kaydetme hatası: ${error.message}`,
    };
  }
}

export default {
  saveProviderStats,
  cleanupOldMetrics,
  resetProviderStats,
  cronSaveProviderStats,
};
