/**
 * Google Analytics 4 Data API Client
 *
 * Makale bazlı sayfa görüntülenmelerini (page views) çeker.
 * In-memory cache ile rate limit koruması sağlar.
 *
 * Gerekli env variables:
 * - GA4_PROPERTY_ID: GA4 property numarası (numeric, ör: 123456789)
 * - GA_CLIENT_EMAIL: Service account email
 * - GA_PRIVATE_KEY: Service account private key (PEM format)
 */

import { google } from "googleapis";

// ─── Cache ───────────────────────────────────────────────
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 dakika

interface CacheEntry {
  value: number;
  expiresAt: number;
}

const viewsCache = new Map<string, CacheEntry>();

// Batch cache — tüm makalelerin views'ı
let batchCache: { data: Map<string, number>; expiresAt: number } | null = null;
const BATCH_CACHE_TTL_MS = 15 * 60 * 1000; // 15 dakika

// ─── Client ──────────────────────────────────────────────
let analyticsClient: ReturnType<typeof google.analyticsdata> | null = null;

function getClient() {
  if (analyticsClient) return analyticsClient;

  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const propertyId = process.env.GA4_PROPERTY_ID;

  if (!clientEmail || !privateKey || !propertyId) {
    throw new Error(
      "GA4 Data API yapılandırması eksik. GA4_PROPERTY_ID, GA_CLIENT_EMAIL ve GA_PRIVATE_KEY gerekli.",
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  analyticsClient = google.analyticsdata({ version: "v1beta", auth });
  return analyticsClient;
}

function getPropertyId(): string {
  return `properties/${process.env.GA4_PROPERTY_ID}`;
}

// ─── Tek Makale Page Views ───────────────────────────────
export async function getArticlePageViews(slug: string): Promise<number> {
  // Cache kontrolü
  const cached = viewsCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // Batch cache'te varsa oradan al
  if (batchCache && batchCache.expiresAt > Date.now()) {
    const views = batchCache.data.get(slug) ?? 0;
    viewsCache.set(slug, {
      value: views,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return views;
  }

  try {
    const client = getClient();
    const response = await client.properties.runReport({
      property: getPropertyId(),
      requestBody: {
        dateRanges: [{ startDate: "2024-01-01", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType: "EXACT",
              value: `/news/${slug}`,
            },
          },
        },
      },
    });

    const rows = (response as any).data?.rows || [];
    const views =
      rows.length > 0
        ? parseInt(rows[0].metricValues?.[0]?.value || "0", 10)
        : 0;

    // Cache'e yaz
    viewsCache.set(slug, {
      value: views,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return views;
  } catch (error) {
    console.error(`[GA4] Error fetching views for /news/${slug}:`, error);
    return -1; // Hata durumunda -1 dön (fallback kullanılsın)
  }
}

// ─── Tüm Makalelerin Page Views (Batch) ─────────────────
export async function getAllArticlePageViews(): Promise<Map<string, number>> {
  // Batch cache kontrolü
  if (batchCache && batchCache.expiresAt > Date.now()) {
    return batchCache.data;
  }

  try {
    const client = getClient();
    const viewsMap = new Map<string, number>();

    const response = await client.properties.runReport({
      property: getPropertyId(),
      requestBody: {
        dateRanges: [{ startDate: "2024-01-01", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType: "BEGINS_WITH",
              value: "/news/",
            },
          },
        },
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: "10000",
      },
    });

    const rows = (response as any).data?.rows || [];
    for (const row of rows) {
      const path = row.dimensionValues?.[0]?.value || "";
      const views = parseInt(row.metricValues?.[0]?.value || "0", 10);

      // /news/slug → slug (trailing slash temizle)
      const slug = path.replace(/^\/news\//, "").replace(/\/$/, "");
      if (slug && !slug.includes("/")) {
        viewsMap.set(slug, views);
      }
    }

    // Batch cache'e yaz
    batchCache = { data: viewsMap, expiresAt: Date.now() + BATCH_CACHE_TTL_MS };

    // Tek tek cache'leri de güncelle
    for (const [slug, views] of viewsMap) {
      viewsCache.set(slug, {
        value: views,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }

    console.log(`[GA4] Fetched page views for ${viewsMap.size} articles`);
    return viewsMap;
  } catch (error) {
    console.error("[GA4] Error fetching all article views:", error);
    return new Map();
  }
}

// ─── GA4 Yapılandırma Kontrolü ──────────────────────────
export function isGA4Configured(): boolean {
  return !!(
    process.env.GA4_PROPERTY_ID &&
    process.env.GA_CLIENT_EMAIL &&
    process.env.GA_PRIVATE_KEY
  );
}
