/**
 * Google Indexing API Integration
 *
 * Bu modül, Google Indexing API'yi kullanarak URL'leri Google'a bildirir.
 * Sadece JobPosting veya BroadcastEvent yapılandırılmış verisi olan sayfalar için kullanılabilir.
 */

import { google } from "googleapis";
import path from "path";
import { readFile } from "fs/promises";

// Service Account bilgileri
const SCOPES = ["https://www.googleapis.com/auth/indexing"];
let cachedServiceAccountCredentials: Record<string, unknown> | null = null;

async function getServiceAccountCredentials(): Promise<
  Record<string, unknown>
> {
  if (cachedServiceAccountCredentials) {
    return cachedServiceAccountCredentials;
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.log(
      "🔐 Using GOOGLE_SERVICE_ACCOUNT_KEY from environment variable",
    );
    cachedServiceAccountCredentials = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    ) as Record<string, unknown>;
    return cachedServiceAccountCredentials;
  }

  console.log("🔐 Using JSON key file from disk (development mode)");
  const keyPath = path.join(
    process.cwd(),
    "aihaberleri-46042-861df20fa232.json",
  );

  try {
    const fileContents = await readFile(keyPath, "utf8");
    cachedServiceAccountCredentials = JSON.parse(fileContents) as Record<
      string,
      unknown
    >;
    return cachedServiceAccountCredentials;
  } catch (error) {
    throw new Error(
      `JSON key file not found or invalid at: ${keyPath}\nPlease ensure the file exists or set GOOGLE_SERVICE_ACCOUNT_KEY environment variable`,
    );
  }
}

/**
 * Google Indexing API istemcisini oluşturur
 *
 * Production'da GOOGLE_SERVICE_ACCOUNT_KEY environment variable'ını kullanır
 * Development'ta JSON dosyasından okur
 */
async function getIndexingClient() {
  try {
    const credentials = await getServiceAccountCredentials();

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    return google.indexing({ version: "v3", auth });
  } catch (error) {
    console.error("❌ Google Indexing API istemcisi oluşturulamadı:", error);
    throw error;
  }
}

/**
 * Tek bir URL'yi Google'a bildirir
 *
 * @param url - Bildirilecek URL (tam URL olmalı)
 * @param type - Bildirim türü: 'URL_UPDATED' veya 'URL_DELETED'
 * @returns API yanıtı
 */
export async function notifyGoogle(
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED",
) {
  try {
    const indexing = await getIndexingClient();

    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type,
      },
    });

    console.log(`✅ Google'a bildirildi: ${url} (${type})`);
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error(`❌ Google bildirimi başarısız: ${url}`, error.message);

    // Hata detaylarını logla
    if (error.response) {
      console.error("API Hatası:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }

    return {
      success: false,
      error: error.message,
      details: error.response?.data,
    };
  }
}

/**
 * Birden fazla URL'yi toplu olarak Google'a bildirir (Batch API)
 * Google Indexing API, tek bir HTTP isteğinde 100 URL'ye kadar izin verir
 *
 * @param urls - Bildirilecek URL'ler ve türleri
 * @returns Toplu işlem sonuçları
 */
export async function notifyGoogleBatch(
  urls: Array<{ url: string; type: "URL_UPDATED" | "URL_DELETED" }>,
) {
  try {
    // Google Indexing API toplu isteklerde maksimum 100 URL'ye izin verir
    if (urls.length > 100) {
      throw new Error("Toplu isteklerde maksimum 100 URL gönderilebilir");
    }

    if (urls.length === 0) {
      return {
        success: true,
        total: 0,
        successCount: 0,
        failCount: 0,
        results: [],
      };
    }

    const indexing = await getIndexingClient();
    const results = [];

    console.log(`📦 Batch işlemi başlatılıyor: ${urls.length} URL`);

    // Her URL için istek oluştur (paralel değil, sıralı - rate limiting için)
    for (const { url, type } of urls) {
      try {
        const response = await indexing.urlNotifications.publish({
          requestBody: {
            url,
            type,
          },
        });

        results.push({
          url,
          type,
          success: true,
          data: response.data,
        });

        console.log(`✅ Batch: ${url} (${type})`);
      } catch (error: any) {
        // Check if quota exceeded
        if (
          error.message &&
          (error.message.includes("Quota exceeded") ||
            error.message.includes("RESOURCE_EXHAUSTED"))
        ) {
          console.error(`⚠️ Quota exceeded at URL: ${url}`);
          results.push({
            url,
            type,
            success: false,
            error: "QUOTA_EXCEEDED",
            message: error.message,
          });
          // Stop processing remaining URLs
          break;
        }

        results.push({
          url,
          type,
          success: false,
          error: error.message,
        });

        console.error(`❌ Batch hatası: ${url}`, error.message);
      }

      // Small delay between requests in batch (100ms)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `📊 Batch tamamlandı: ${successCount} başarılı, ${failCount} başarısız`,
    );

    return {
      success: true,
      total: urls.length,
      successCount,
      failCount,
      results,
    };
  } catch (error: any) {
    console.error("❌ Batch işlemi başarısız:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Bir URL'nin bildirim durumunu sorgular
 *
 * @param url - Sorgulanacak URL
 * @returns Bildirim durumu
 */
export async function getNotificationMetadata(url: string) {
  try {
    const indexing = await getIndexingClient();

    const response = await indexing.urlNotifications.getMetadata({
      url: url, // googleapis kütüphanesi otomatik encode eder
    });

    console.log(`📊 Bildirim durumu alındı: ${url}`);
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error(`❌ Bildirim durumu alınamadı: ${url}`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Yeni haber URL'sini Google'a bildirir
 *
 * @param newsSlug - Haber slug'ı
 * @returns Bildirim sonucu
 */
export async function notifyNewsToGoogle(newsSlug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://aihaberleri.org";
  const fullUrl = `${baseUrl}/${newsSlug}`;

  return await notifyGoogle(fullUrl, "URL_UPDATED");
}

/**
 * Silinen haber URL'sini Google'a bildirir
 *
 * @param newsSlug - Haber slug'ı
 * @returns Bildirim sonucu
 */
export async function notifyNewsDeletedToGoogle(newsSlug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://aihaberleri.org";
  const fullUrl = `${baseUrl}/${newsSlug}`;

  return await notifyGoogle(fullUrl, "URL_DELETED");
}

/**
 * Birden fazla haber URL'sini toplu olarak Google'a bildirir
 *
 * @param newsSlugs - Haber slug'ları
 * @returns Toplu bildirim sonucu
 */
export async function notifyMultipleNewsToGoogle(newsSlugs: string[]) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://aihaberleri.org";

  const urls = newsSlugs.map((slug) => ({
    url: `${baseUrl}/${slug}`,
    type: "URL_UPDATED" as const,
  }));

  return await notifyGoogleBatch(urls);
}

// ============================================
// GÜNLÜK LİMİT TAKİBİ (200 istek/gün)
// ============================================

const DAILY_LIMIT = 200;

/**
 * Bugün kaç Google Indexing API isteği yapıldığını hesapla
 * Article tablosundaki googleIndexedAt alanına bakarak sayar
 */
export async function getTodayIndexingCount(): Promise<number> {
  try {
    // Dynamic import to avoid circular dependency
    const { db } = await import("@/lib/db");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await db.article.count({
      where: {
        googleIndexedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    return count;
  } catch (error) {
    console.error("❌ Günlük indexing sayısı alınamadı:", error);
    return 0;
  }
}

/**
 * Kalan günlük indexing kotasını hesapla
 */
export async function getRemainingDailyQuota(): Promise<number> {
  const todayCount = await getTodayIndexingCount();
  const remaining = Math.max(0, DAILY_LIMIT - todayCount);
  console.log(
    `📊 Günlük Google Indexing: ${todayCount}/${DAILY_LIMIT} kullanıldı, ${remaining} kaldı`,
  );
  return remaining;
}

/**
 * Limit-aware batch gönderim - günlük limiti aşmaz
 */
export async function notifyGoogleBatchWithLimit(
  urls: Array<{ url: string; type: "URL_UPDATED" | "URL_DELETED" }>,
): Promise<{
  success: boolean;
  total: number;
  sent: number;
  skipped: number;
  successCount: number;
  failCount: number;
  results: any[];
  remainingQuota: number;
}> {
  const remaining = await getRemainingDailyQuota();

  if (remaining === 0) {
    console.log("⚠️ Günlük Google Indexing limiti doldu (200/200)");
    return {
      success: false,
      total: urls.length,
      sent: 0,
      skipped: urls.length,
      successCount: 0,
      failCount: 0,
      results: [],
      remainingQuota: 0,
    };
  }

  // Sadece kalan kotaya kadar gönder
  const urlsToSend = urls.slice(0, remaining);
  const skipped = urls.length - urlsToSend.length;

  if (skipped > 0) {
    console.log(`⚠️ ${skipped} URL limit nedeniyle atlandı`);
  }

  if (urlsToSend.length === 0) {
    return {
      success: true,
      total: urls.length,
      sent: 0,
      skipped: urls.length,
      successCount: 0,
      failCount: 0,
      results: [],
      remainingQuota: remaining,
    };
  }

  const result = await notifyGoogleBatch(urlsToSend);
  const successCount = result.successCount ?? 0;

  return {
    success: result.success,
    total: result.total ?? urlsToSend.length,
    sent: urlsToSend.length,
    skipped,
    successCount,
    failCount: result.failCount ?? 0,
    results: result.results ?? [],
    remainingQuota: remaining - successCount,
  };
}
