/**
 * Google Search Console API
 * Arama performansı verileri, tıklamalar, gösterimler, pozisyon
 *
 * Mevcut Service Account kullanılır (Google Indexing API ile aynı)
 * https://developers.google.com/webmaster-tools/v1/api_reference_index
 */

import { google } from "googleapis";
import path from "path";
import fs from "fs";

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SearchPerformanceResult {
  startDate: string;
  endDate: string;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  rows: SearchAnalyticsRow[];
}

interface TopQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface TopPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Search Console API istemcisini oluştur
 */
async function getSearchConsoleClient() {
  try {
    let credentials;

    // Production'da environment variable kullan
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    }
    // Development'ta dosyadan oku
    else {
      const keyPath = path.join(
        process.cwd(),
        "aihaberleri-46042-861df20fa232.json",
      );

      if (!fs.existsSync(keyPath)) {
        throw new Error(`Service account key file not found: ${keyPath}`);
      }

      credentials = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    return google.searchconsole({ version: "v1", auth });
  } catch (error) {
    console.error("❌ Search Console API istemcisi oluşturulamadı:", error);
    throw error;
  }
}

/**
 * Belirli tarih aralığı için arama performansı verilerini al
 */
export async function getSearchPerformance(
  startDate: string, // YYYY-MM-DD
  endDate: string,
  dimensions: ("query" | "page" | "country" | "device" | "date")[] = ["query"],
  rowLimit: number = 100,
): Promise<SearchPerformanceResult | null> {
  try {
    const searchconsole = await getSearchConsoleClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

    console.log(
      `📊 Search Console verileri alınıyor: ${startDate} - ${endDate}`,
    );

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions,
        rowLimit,
        dataState: "final", // Kesinleşmiş veriler
      },
    });

    const rows = (response.data.rows || []) as SearchAnalyticsRow[];

    // Toplam metrikleri hesapla
    const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
    const totalImpressions = rows.reduce(
      (sum, row) => sum + row.impressions,
      0,
    );
    const averageCtr =
      totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const averagePosition =
      rows.length > 0
        ? rows.reduce((sum, row) => sum + row.position, 0) / rows.length
        : 0;

    console.log(
      `✅ Search Console: ${totalClicks} tıklama, ${totalImpressions} gösterim`,
    );

    return {
      startDate,
      endDate,
      totalClicks,
      totalImpressions,
      averageCtr,
      averagePosition,
      rows,
    };
  } catch (error: any) {
    console.error("❌ Search Console hatası:", error.message);
    return null;
  }
}

/**
 * En çok tıklama alan arama sorgularını getir
 */
export async function getTopQueries(
  days: number = 28,
  limit: number = 50,
): Promise<TopQuery[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await getSearchPerformance(
    startDate.toISOString().split("T")[0],
    endDate.toISOString().split("T")[0],
    ["query"],
    limit,
  );

  if (!result) return [];

  return result.rows
    .map((row) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

/**
 * En çok tıklama alan sayfaları getir
 */
export async function getTopPages(
  days: number = 28,
  limit: number = 50,
): Promise<TopPage[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await getSearchPerformance(
    startDate.toISOString().split("T")[0],
    endDate.toISOString().split("T")[0],
    ["page"],
    limit,
  );

  if (!result) return [];

  return result.rows
    .map((row) => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

/**
 * Günlük performans trendi
 */
export async function getDailyTrend(
  days: number = 28,
): Promise<{ date: string; clicks: number; impressions: number }[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await getSearchPerformance(
    startDate.toISOString().split("T")[0],
    endDate.toISOString().split("T")[0],
    ["date"],
    days,
  );

  if (!result) return [];

  return result.rows
    .map((row) => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Belirli bir sayfa için performans verilerini al
 */
export async function getPagePerformance(
  pageUrl: string,
  days: number = 28,
): Promise<{
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topQueries: TopQuery[];
} | null> {
  try {
    const searchconsole = await getSearchConsoleClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Sayfa performansı
    const pageResponse = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        dimensions: ["page"],
        dimensionFilterGroups: [
          {
            filters: [
              {
                dimension: "page",
                operator: "equals",
                expression: pageUrl,
              },
            ],
          },
        ],
        rowLimit: 1,
      },
    });

    const pageRow = pageResponse.data.rows?.[0];
    if (!pageRow) return null;

    // Bu sayfa için top sorgular
    const queryResponse = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        dimensions: ["query"],
        dimensionFilterGroups: [
          {
            filters: [
              {
                dimension: "page",
                operator: "equals",
                expression: pageUrl,
              },
            ],
          },
        ],
        rowLimit: 20,
      },
    });

    const topQueries = (queryResponse.data.rows || []).map((row: any) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));

    return {
      clicks: pageRow.clicks || 0,
      impressions: pageRow.impressions || 0,
      ctr: pageRow.ctr || 0,
      position: pageRow.position || 0,
      topQueries,
    };
  } catch (error: any) {
    console.error("❌ Sayfa performansı alınamadı:", error.message);
    return null;
  }
}

/**
 * Özet dashboard verileri
 */
export async function getSearchConsoleSummary(days: number = 28): Promise<{
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  topQueries: TopQuery[];
  topPages: TopPage[];
  dailyTrend: { date: string; clicks: number; impressions: number }[];
} | null> {
  try {
    const [topQueries, topPages, dailyTrend] = await Promise.all([
      getTopQueries(days, 20),
      getTopPages(days, 20),
      getDailyTrend(days),
    ]);

    const totalClicks = dailyTrend.reduce((sum, d) => sum + d.clicks, 0);
    const totalImpressions = dailyTrend.reduce(
      (sum, d) => sum + d.impressions,
      0,
    );

    return {
      totalClicks,
      totalImpressions,
      averageCtr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      averagePosition:
        topQueries.length > 0
          ? topQueries.reduce((sum, q) => sum + q.position, 0) /
            topQueries.length
          : 0,
      topQueries,
      topPages,
      dailyTrend,
    };
  } catch (error) {
    console.error("❌ Search Console özeti alınamadı:", error);
    return null;
  }
}
