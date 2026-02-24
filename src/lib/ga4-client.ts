/**
 * Google Analytics 4 Data API Client
 *
 * Makale bazlı sayfa görüntülenmelerini (page views) çeker.
 * In-memory cache ile rate limit koruması sağlar.
 *
 * Desteklenen auth yöntemleri (öncelik sırasıyla):
 * 1. GA_CLIENT_EMAIL + GA_PRIVATE_KEY: GA4-spesifik service account (analyticsnewaccount)
 * 2. GOOGLE_SERVICE_ACCOUNT_KEY: Tam JSON service account key (fallback)
 *
 * Gerekli:
 * - GA4_PROPERTY_ID: GA4 property numarası (numeric, ör: 123456789)
 */

import { google } from "googleapis";

// ─── PEM Key Parser ─────────────────────────────────────
/**
 * PEM key'i Docker/Coolify ortamlarında güvenilir şekilde parse eder.
 * Coolify env'de key şu formatlarda gelebilir:
 * - Literal \n text → replace gerekli
 * - Gerçek newline → olduğu gibi
 * - Double-escaped \\n → replace gerekli
 * - Base64 encoded → decode gerekli
 */
function parsePemKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  let key = raw.trim();

  // Double-escaped newlines: \\n → \n
  key = key.replace(/\\\\n/g, "\n");
  // Single-escaped newlines: \n (literal backslash-n) → real newline
  key = key.replace(/\\n/g, "\n");
  // Windows-style \r\n → \n
  key = key.replace(/\r\n/g, "\n");
  key = key.replace(/\r/g, "\n");

  // Eğer hala BEGIN marker yoksa, base64 encoded olabilir
  if (!key.includes("-----BEGIN") && key.length > 100) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf-8");
      if (decoded.includes("-----BEGIN")) {
        key = decoded;
      }
    } catch {
      // base64 değilse devam et
    }
  }

  // PEM formatı düzeltme: header/footer arasını temizle ve standart 64-char satırlara böl
  if (key.includes("-----BEGIN")) {
    const lines = key.split("\n").map((l) => l.trim()).filter(Boolean);
    const beginIdx = lines.findIndex((l) => l.startsWith("-----BEGIN"));
    const endIdx = lines.findIndex((l) => l.startsWith("-----END"));

    if (beginIdx >= 0 && endIdx > beginIdx) {
      const header = lines[beginIdx];
      const footer = lines[endIdx];
      const body = lines.slice(beginIdx + 1, endIdx).join("");
      // Standart PEM: 64 karakter satırlar
      const formattedBody = body.match(/.{1,64}/g)?.join("\n") || body;
      key = `${header}\n${formattedBody}\n${footer}\n`;
    }
  }

  return key;
}

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

  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error(
      "GA4 Data API yapılandırması eksik. GA4_PROPERTY_ID gerekli.",
    );
  }

  let credentials: { client_email: string; private_key: string };

  // Yöntem 1: GA4-spesifik env variables (analyticsnewaccount service account)
  // GA4 erişimi olan service account bu env'lerde tanımlı
  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const privateKey = parsePemKey(process.env.GA_PRIVATE_KEY);

  if (clientEmail && privateKey) {
    credentials = { client_email: clientEmail, private_key: privateKey };
    console.log(`[GA4] Using GA_CLIENT_EMAIL (${clientEmail}) for auth`);
  }
  // Yöntem 2: Tam JSON service account key (fallback)
  else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      credentials = {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
      console.log(
        `[GA4] Using GOOGLE_SERVICE_ACCOUNT_KEY (${parsed.client_email}) for auth`,
      );
    } catch (e) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY geçerli bir JSON değil.");
    }
  } else {
    throw new Error(
      "GA4 Data API yapılandırması eksik. GA_CLIENT_EMAIL + GA_PRIVATE_KEY veya GOOGLE_SERVICE_ACCOUNT_KEY gerekli.",
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
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

// ─── GA4 Realtime Visitors ──────────────────────────────
let realtimeCache: {
  data: RealtimeData;
  expiresAt: number;
} | null = null;
const REALTIME_CACHE_TTL_MS = 15 * 1000; // 15 saniye - daha hızlı güncelleme

let realtimeActiveUsersCache: {
  value: number;
  expiresAt: number;
} | null = null;
const REALTIME_ACTIVE_USERS_CACHE_TTL_MS = 30 * 1000; // 30 saniye - düşük maliyetli lite metrik

export interface RealtimeData {
  activeUsers: number;
  minuteData: Array<{ minutesAgo: number; users: number }>;
  topPages: Array<{ page: string; users: number }>;
  devices: Array<{ device: string; users: number }>;
  countries: Array<{ country: string; users: number }>;
}

export async function getRealtimeVisitors(): Promise<RealtimeData> {
  // Cache kontrolü
  if (realtimeCache && realtimeCache.expiresAt > Date.now()) {
    return realtimeCache.data;
  }

  const emptyResult: RealtimeData = {
    activeUsers: 0,
    minuteData: [],
    topPages: [],
    devices: [],
    countries: [],
  };

  try {
    const client = getClient();

    // Paralel 4 realtime sorgu
    const [minuteRes, pageRes, deviceRes, countryRes] = await Promise.all([
      // Dakika bazlı aktif kullanıcılar (son 30 dk)
      client.properties.runRealtimeReport({
        property: getPropertyId(),
        requestBody: {
          dimensions: [{ name: "minutesAgo" }],
          metrics: [{ name: "activeUsers" }],
        },
      }),
      // Top sayfalar
      client.properties.runRealtimeReport({
        property: getPropertyId(),
        requestBody: {
          dimensions: [{ name: "unifiedScreenName" }],
          metrics: [{ name: "activeUsers" }],
          limit: "10",
        },
      }),
      // Cihaz dağılımı
      client.properties.runRealtimeReport({
        property: getPropertyId(),
        requestBody: {
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "activeUsers" }],
        },
      }),
      // Ülke dağılımı
      client.properties.runRealtimeReport({
        property: getPropertyId(),
        requestBody: {
          dimensions: [{ name: "country" }],
          metrics: [{ name: "activeUsers" }],
          limit: "10",
        },
      }),
    ]);

    // Minute data parse
    const minuteRows = (minuteRes as any).data?.rows || [];
    const minuteData: Array<{ minutesAgo: number; users: number }> = [];
    let totalActive = 0;

    for (const row of minuteRows) {
      const minutesAgo = parseInt(row.dimensionValues?.[0]?.value || "0", 10);
      const users = parseInt(row.metricValues?.[0]?.value || "0", 10);
      minuteData.push({ minutesAgo, users });
      totalActive += users;
    }

    // 0-29 arası tüm dakikaları doldur (boş olanlar 0)
    const fullMinuteData: Array<{ minutesAgo: number; users: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const existing = minuteData.find((m) => m.minutesAgo === i);
      fullMinuteData.push({ minutesAgo: i, users: existing?.users || 0 });
    }

    // Top pages parse
    const pageRows = (pageRes as any).data?.rows || [];
    const topPages = pageRows.map((row: any) => ({
      page: row.dimensionValues?.[0]?.value || "",
      users: parseInt(row.metricValues?.[0]?.value || "0", 10),
    }));

    // Device parse
    const deviceRows = (deviceRes as any).data?.rows || [];
    const devices = deviceRows.map((row: any) => ({
      device: row.dimensionValues?.[0]?.value || "",
      users: parseInt(row.metricValues?.[0]?.value || "0", 10),
    }));

    // Country parse
    const countryRows = (countryRes as any).data?.rows || [];
    const countries = countryRows.map((row: any) => ({
      country: row.dimensionValues?.[0]?.value || "",
      users: parseInt(row.metricValues?.[0]?.value || "0", 10),
    }));

    const result: RealtimeData = {
      activeUsers: totalActive,
      minuteData: fullMinuteData,
      topPages,
      devices,
      countries,
    };

    realtimeCache = {
      data: result,
      expiresAt: Date.now() + REALTIME_CACHE_TTL_MS,
    };
    return result;
  } catch (error: any) {
    // Auth hatalarında client'ı sıfırla — sonraki denemede yeniden oluşturulur
    if (error?.code === 400 || error?.message?.includes("invalid_grant")) {
      analyticsClient = null;
      console.error(
        "[GA4 Realtime] Auth error (client reset):",
        error?.message || error,
      );
    } else {
      console.error("[GA4 Realtime] Error:", error);
    }
    return emptyResult;
  }
}

// ─── GA4 Realtime Active Users (Lite) ──────────────────
export async function getRealtimeActiveUsers(): Promise<number> {
  if (
    realtimeActiveUsersCache &&
    realtimeActiveUsersCache.expiresAt > Date.now()
  ) {
    return realtimeActiveUsersCache.value;
  }

  try {
    const client = getClient();
    const response = await client.properties.runRealtimeReport({
      property: getPropertyId(),
      requestBody: {
        metrics: [{ name: "activeUsers" }],
      },
    });

    const rows = (response as any).data?.rows || [];
    const activeUsers = rows.length
      ? parseInt(rows[0]?.metricValues?.[0]?.value || "0", 10)
      : 0;

    realtimeActiveUsersCache = {
      value: Number.isFinite(activeUsers) ? activeUsers : 0,
      expiresAt: Date.now() + REALTIME_ACTIVE_USERS_CACHE_TTL_MS,
    };

    return realtimeActiveUsersCache.value;
  } catch (error: any) {
    if (error?.code === 400 || error?.message?.includes("invalid_grant")) {
      analyticsClient = null;
      console.error(
        "[GA4 Realtime Active Users] Auth error (client reset):",
        error?.message || error,
      );
    } else {
      console.error("[GA4 Realtime Active Users] Error:", error);
    }
    return 0;
  }
}

// ─── GA4 Trafik Özeti (Dönem Bazlı) ────────────────────
let trafficCache: {
  key: string;
  data: GA4TrafficOverview;
  expiresAt: number;
} | null = null;
const TRAFFIC_CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

export interface GA4TrafficOverview {
  totalPageViews: number;
  totalUsers: number;
  newUsers: number;
  sessions: number;
  avgSessionDuration: number;
  bounceRate: number;
  dailyData: Array<{ date: string; pageViews: number; users: number }>;
  topPages: Array<{ page: string; views: number; users: number }>;
}

export async function getGA4TrafficOverview(
  startDate: string,
  endDate: string = "today",
): Promise<GA4TrafficOverview> {
  const cacheKey = `${startDate}_${endDate}`;

  if (
    trafficCache &&
    trafficCache.key === cacheKey &&
    trafficCache.expiresAt > Date.now()
  ) {
    return trafficCache.data;
  }

  const emptyResult: GA4TrafficOverview = {
    totalPageViews: 0,
    totalUsers: 0,
    newUsers: 0,
    sessions: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    dailyData: [],
    topPages: [],
  };

  try {
    const client = getClient();

    const [overviewRes, dailyRes, pagesRes] = await Promise.all([
      // Genel metrikler
      client.properties.runReport({
        property: getPropertyId(),
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
            { name: "newUsers" },
            { name: "sessions" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
        },
      }),
      // Günlük kırılım
      client.properties.runReport({
        property: getPropertyId(),
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        },
      }),
      // Top sayfalar
      client.properties.runReport({
        property: getPropertyId(),
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
          ],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: "20",
        },
      }),
    ]);

    // Overview parse
    const overviewRows = (overviewRes as any).data?.rows || [];
    const ov = overviewRows[0];
    const totalPageViews = ov
      ? parseInt(ov.metricValues?.[0]?.value || "0", 10)
      : 0;
    const totalUsers = ov
      ? parseInt(ov.metricValues?.[1]?.value || "0", 10)
      : 0;
    const newUsers = ov
      ? parseInt(ov.metricValues?.[2]?.value || "0", 10)
      : 0;
    const sessions = ov
      ? parseInt(ov.metricValues?.[3]?.value || "0", 10)
      : 0;
    const avgSessionDuration = ov
      ? Math.round(parseFloat(ov.metricValues?.[4]?.value || "0"))
      : 0;
    const bounceRate = ov
      ? Math.round(parseFloat(ov.metricValues?.[5]?.value || "0") * 100)
      : 0;

    // Daily data parse
    const dailyRows = (dailyRes as any).data?.rows || [];
    const dailyData = dailyRows.map((row: any) => {
      const rawDate = row.dimensionValues?.[0]?.value || "";
      const formatted = rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : rawDate;
      return {
        date: formatted,
        pageViews: parseInt(row.metricValues?.[0]?.value || "0", 10),
        users: parseInt(row.metricValues?.[1]?.value || "0", 10),
      };
    });

    // Top pages parse
    const pageRows = (pagesRes as any).data?.rows || [];
    const topPages = pageRows.map((row: any) => ({
      page: row.dimensionValues?.[0]?.value || "",
      views: parseInt(row.metricValues?.[0]?.value || "0", 10),
      users: parseInt(row.metricValues?.[1]?.value || "0", 10),
    }));

    const result: GA4TrafficOverview = {
      totalPageViews,
      totalUsers,
      newUsers,
      sessions,
      avgSessionDuration,
      bounceRate,
      dailyData,
      topPages,
    };

    trafficCache = {
      key: cacheKey,
      data: result,
      expiresAt: Date.now() + TRAFFIC_CACHE_TTL_MS,
    };

    return result;
  } catch (error: any) {
    if (error?.code === 400 || error?.message?.includes('invalid_grant')) {
      analyticsClient = null;
      console.error("[GA4 Traffic] Auth error (client reset):", error?.message || error);
    } else {
      console.error("[GA4 Traffic] Error:", error);
    }
    return emptyResult;
  }
}

// ─── GA4 Yapılandırma Kontrolü ──────────────────────────
export function isGA4Configured(): boolean {
  return !!(
    process.env.GA4_PROPERTY_ID &&
    (process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      (process.env.GA_CLIENT_EMAIL && process.env.GA_PRIVATE_KEY))
  );
}
