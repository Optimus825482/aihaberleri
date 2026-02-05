/**
 * Google Indexing API Integration
 *
 * Bu modül, Google Indexing API'yi kullanarak URL'leri Google'a bildirir.
 * Sadece JobPosting veya BroadcastEvent yapılandırılmış verisi olan sayfalar için kullanılabilir.
 */

import { google } from "googleapis";
import path from "path";
import fs from "fs";

// Service Account bilgileri
const SCOPES = ["https://www.googleapis.com/auth/indexing"];

/**
 * Google Indexing API istemcisini oluşturur
 *
 * Production'da GOOGLE_SERVICE_ACCOUNT_KEY environment variable'ını kullanır
 * Development'ta JSON dosyasından okur
 */
async function getIndexingClient() {
  try {
    let credentials;

    // Production'da environment variable kullan
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      console.log(
        "🔐 Using GOOGLE_SERVICE_ACCOUNT_KEY from environment variable",
      );
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    }
    // Development'ta dosyadan oku
    else {
      console.log("🔐 Using JSON key file from disk (development mode)");
      const keyPath = path.join(
        process.cwd(),
        "aihaberleri-46042-861df20fa232.json",
      );

      if (!fs.existsSync(keyPath)) {
        throw new Error(
          `JSON key file not found at: ${keyPath}\n` +
            "Please ensure the file exists or set GOOGLE_SERVICE_ACCOUNT_KEY environment variable",
        );
      }

      credentials = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    }

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
 * Birden fazla URL'yi toplu olarak Google'a bildirir
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

    const indexing = await getIndexingClient();
    const results = [];

    // Her URL için istek oluştur
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

        console.log(`✅ Toplu bildirim: ${url} (${type})`);
      } catch (error: any) {
        results.push({
          url,
          type,
          success: false,
          error: error.message,
        });

        console.error(`❌ Toplu bildirim hatası: ${url}`, error.message);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `📊 Toplu bildirim tamamlandı: ${successCount} başarılı, ${failCount} başarısız`,
    );

    return {
      success: true,
      total: urls.length,
      successCount,
      failCount,
      results,
    };
  } catch (error: any) {
    console.error("❌ Toplu bildirim başarısız:", error.message);
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
