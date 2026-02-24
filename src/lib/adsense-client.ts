/**
 * Google AdSense Management API Client
 *
 * AdSense gelir verilerini çekmek için kullanılır.
 * GA4 client ile aynı service account veya ayrı credentials kullanabilir.
 *
 * Env Variables:
 * - ADSENSE_ACCOUNT_ID: AdSense publisher hesap ID (örn: pub-2444093901783574)
 * - GA_CLIENT_EMAIL + GA_PRIVATE_KEY veya GOOGLE_SERVICE_ACCOUNT_KEY
 */

import { google, adsense_v2 } from "googleapis";

// ─── Cache ───────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const reportCache = new Map<string, CacheEntry<any>>();

// ─── Client ──────────────────────────────────────────────
let adsenseClient: adsense_v2.Adsense | null = null;

function getClient(): adsense_v2.Adsense {
  if (adsenseClient) return adsenseClient;

  let credentials: { client_email: string; private_key: string };

  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    credentials = { client_email: clientEmail, private_key: privateKey };
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      credentials = {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY geçerli bir JSON değil.");
    }
  } else {
    throw new Error(
      "AdSense API yapılandırması eksik. GA_CLIENT_EMAIL + GA_PRIVATE_KEY veya GOOGLE_SERVICE_ACCOUNT_KEY gerekli.",
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/adsense.readonly"],
  });

  adsenseClient = google.adsense({ version: "v2", auth });
  return adsenseClient;
}

function getAccountId(): string {
  const id = process.env.ADSENSE_ACCOUNT_ID;
  if (!id) throw new Error("ADSENSE_ACCOUNT_ID env variable gerekli.");
  return `accounts/${id.replace("accounts/", "")}`;
}

export function isAdSenseConfigured(): boolean {
  try {
    const hasAccount = !!process.env.ADSENSE_ACCOUNT_ID;
    const hasAuth =
      (!!process.env.GA_CLIENT_EMAIL && !!process.env.GA_PRIVATE_KEY) ||
      !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    return hasAccount && hasAuth;
  } catch {
    return false;
  }
}

// ─── Date Helpers ────────────────────────────────────────
function toAdSenseDate(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function getStartOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Types ───────────────────────────────────────────────
export interface AdSenseEarnings {
  todayEarnings: number;
  monthEarnings: number;
  totalEarnings: number;
  todayClicks: number;
  todayImpressions: number;
  todayPageViews: number;
  todayCtr: number;
  todayCpc: number;
  todayRpm: number;
  todayPageRpm: number;
  monthClicks: number;
  monthImpressions: number;
  monthCtr: number;
  monthRpm: number;
}

export interface AdSenseDailyReport {
  date: string;
  earnings: number;
  clicks: number;
  impressions: number;
  pageViews: number;
  ctr: number;
  cpc: number;
  rpm: number;
}

export interface AdSenseDetailedReport {
  dailyData: AdSenseDailyReport[];
  byCountry: Array<{
    country: string;
    earnings: number;
    clicks: number;
    impressions: number;
  }>;
  byPage: Array<{
    page: string;
    earnings: number;
    clicks: number;
    impressions: number;
    rpm: number;
  }>;
  byAdUnit: Array<{
    adUnit: string;
    earnings: number;
    clicks: number;
    impressions: number;
  }>;
  summary: AdSenseEarnings;
}

// ─── Helper: parse report rows ──────────────────────────
function parseMetricValue(
  val: string | undefined | null,
  fallback = 0,
): number {
  if (!val) return fallback;
  // AdSense returns micros for earnings (value * 1_000_000)
  const num = parseFloat(val);
  return isNaN(num) ? fallback : num;
}

function parseMicros(val: string | undefined | null): number {
  if (!val) return 0;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num / 1_000_000;
}

// ─── Report Fetchers ────────────────────────────────────

/**
 * Bugünkü, bu ayki ve toplam kazanç
 */
export async function getAdSenseEarnings(): Promise<AdSenseEarnings> {
  const cacheKey = "adsense:earnings";
  const cached = reportCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const client = getClient();
  const account = getAccountId();
  const today = getToday();
  const startOfMonth = getStartOfMonth();
  const todayDate = toAdSenseDate(today);
  const monthStartDate = toAdSenseDate(startOfMonth);

  // Paralel sorgular: bugün, bu ay, tüm zamanlar
  const [todayReport, monthReport, allTimeReport] = await Promise.all([
    // Bugün
    client.accounts.reports.generate({
      account,
      dateRange: "CUSTOM",
      "startDate.year": todayDate.year,
      "startDate.month": todayDate.month,
      "startDate.day": todayDate.day,
      "endDate.year": todayDate.year,
      "endDate.month": todayDate.month,
      "endDate.day": todayDate.day,
      metrics: [
        "ESTIMATED_EARNINGS",
        "CLICKS",
        "IMPRESSIONS",
        "PAGE_VIEWS",
        "COST_PER_CLICK",
        "PAGE_VIEWS_CTR",
        "PAGE_VIEWS_RPM",
        "IMPRESSIONS_RPM",
      ],
    }),
    // Bu ay
    client.accounts.reports.generate({
      account,
      dateRange: "CUSTOM",
      "startDate.year": monthStartDate.year,
      "startDate.month": monthStartDate.month,
      "startDate.day": monthStartDate.day,
      "endDate.year": todayDate.year,
      "endDate.month": todayDate.month,
      "endDate.day": todayDate.day,
      metrics: [
        "ESTIMATED_EARNINGS",
        "CLICKS",
        "IMPRESSIONS",
        "PAGE_VIEWS_CTR",
        "IMPRESSIONS_RPM",
      ],
    }),
    // Tüm zamanlar (son 3 yıl)
    client.accounts.reports.generate({
      account,
      dateRange: "CUSTOM",
      "startDate.year": todayDate.year - 3,
      "startDate.month": 1,
      "startDate.day": 1,
      "endDate.year": todayDate.year,
      "endDate.month": todayDate.month,
      "endDate.day": todayDate.day,
      metrics: ["ESTIMATED_EARNINGS"],
    }),
  ]);

  const todayRow = todayReport.data?.rows?.[0]?.cells || [];
  const monthRow = monthReport.data?.rows?.[0]?.cells || [];
  const allTimeRow = allTimeReport.data?.rows?.[0]?.cells || [];

  const result: AdSenseEarnings = {
    todayEarnings: parseMicros(todayRow[0]?.value),
    todayClicks: parseMetricValue(todayRow[1]?.value),
    todayImpressions: parseMetricValue(todayRow[2]?.value),
    todayPageViews: parseMetricValue(todayRow[3]?.value),
    todayCpc: parseMicros(todayRow[4]?.value),
    todayCtr: parseMetricValue(todayRow[5]?.value),
    todayPageRpm: parseMicros(todayRow[6]?.value),
    todayRpm: parseMicros(todayRow[7]?.value),
    monthEarnings: parseMicros(monthRow[0]?.value),
    monthClicks: parseMetricValue(monthRow[1]?.value),
    monthImpressions: parseMetricValue(monthRow[2]?.value),
    monthCtr: parseMetricValue(monthRow[3]?.value),
    monthRpm: parseMicros(monthRow[4]?.value),
    totalEarnings: parseMicros(allTimeRow[0]?.value),
  };

  reportCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return result;
}

/**
 * Belirli tarih aralığı için günlük detaylı rapor
 */
export async function getAdSenseDailyReport(
  startDate: Date,
  endDate: Date,
): Promise<AdSenseDailyReport[]> {
  const cacheKey = `adsense:daily:${startDate.toISOString().split("T")[0]}:${endDate.toISOString().split("T")[0]}`;
  const cached = reportCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const client = getClient();
  const account = getAccountId();
  const start = toAdSenseDate(startDate);
  const end = toAdSenseDate(endDate);

  const report = await client.accounts.reports.generate({
    account,
    dateRange: "CUSTOM",
    "startDate.year": start.year,
    "startDate.month": start.month,
    "startDate.day": start.day,
    "endDate.year": end.year,
    "endDate.month": end.month,
    "endDate.day": end.day,
    dimensions: ["DATE"],
    metrics: [
      "ESTIMATED_EARNINGS",
      "CLICKS",
      "IMPRESSIONS",
      "PAGE_VIEWS",
      "COST_PER_CLICK",
      "PAGE_VIEWS_CTR",
      "IMPRESSIONS_RPM",
    ],
    orderBy: ["DATE"],
  });

  const result: AdSenseDailyReport[] = (report.data?.rows || []).map((row) => {
    const dims = row.cells || [];
    return {
      date: dims[0]?.value || "",
      earnings: parseMicros(dims[1]?.value),
      clicks: parseMetricValue(dims[2]?.value),
      impressions: parseMetricValue(dims[3]?.value),
      pageViews: parseMetricValue(dims[4]?.value),
      cpc: parseMicros(dims[5]?.value),
      ctr: parseMetricValue(dims[6]?.value),
      rpm: parseMicros(dims[7]?.value),
    };
  });

  reportCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return result;
}

/**
 * Detaylı rapor — country, page, ad unit breakdown
 */
export async function getAdSenseDetailedReport(
  days: number = 30,
): Promise<AdSenseDetailedReport> {
  const cacheKey = `adsense:detailed:${days}`;
  const cached = reportCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const client = getClient();
  const account = getAccountId();
  const today = getToday();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);
  const start = toAdSenseDate(startDate);
  const end = toAdSenseDate(today);

  const commonParams = {
    account,
    dateRange: "CUSTOM" as const,
    "startDate.year": start.year,
    "startDate.month": start.month,
    "startDate.day": start.day,
    "endDate.year": end.year,
    "endDate.month": end.month,
    "endDate.day": end.day,
  };

  const [dailyReport, countryReport, pageReport, adUnitReport] =
    await Promise.all([
      // Günlük kırılım
      client.accounts.reports.generate({
        ...commonParams,
        dimensions: ["DATE"],
        metrics: [
          "ESTIMATED_EARNINGS",
          "CLICKS",
          "IMPRESSIONS",
          "PAGE_VIEWS",
          "COST_PER_CLICK",
          "PAGE_VIEWS_CTR",
          "IMPRESSIONS_RPM",
        ],
        orderBy: ["DATE"],
      }),
      // Ülke kırılımı
      client.accounts.reports.generate({
        ...commonParams,
        dimensions: ["COUNTRY_NAME"],
        metrics: ["ESTIMATED_EARNINGS", "CLICKS", "IMPRESSIONS"],
        orderBy: ["-ESTIMATED_EARNINGS"],
      }),
      // Sayfa kırılımı (URL)
      client.accounts.reports.generate({
        ...commonParams,
        dimensions: ["URL_CHANNEL_NAME"],
        metrics: [
          "ESTIMATED_EARNINGS",
          "CLICKS",
          "IMPRESSIONS",
          "IMPRESSIONS_RPM",
        ],
        orderBy: ["-ESTIMATED_EARNINGS"],
      }),
      // Reklam birimi kırılımı
      client.accounts.reports.generate({
        ...commonParams,
        dimensions: ["AD_UNIT_NAME"],
        metrics: ["ESTIMATED_EARNINGS", "CLICKS", "IMPRESSIONS"],
        orderBy: ["-ESTIMATED_EARNINGS"],
      }),
    ]);

  const dailyData: AdSenseDailyReport[] = (dailyReport.data?.rows || []).map(
    (row) => {
      const c = row.cells || [];
      return {
        date: c[0]?.value || "",
        earnings: parseMicros(c[1]?.value),
        clicks: parseMetricValue(c[2]?.value),
        impressions: parseMetricValue(c[3]?.value),
        pageViews: parseMetricValue(c[4]?.value),
        cpc: parseMicros(c[5]?.value),
        ctr: parseMetricValue(c[6]?.value),
        rpm: parseMicros(c[7]?.value),
      };
    },
  );

  const byCountry = (countryReport.data?.rows || [])
    .map((row) => {
      const c = row.cells || [];
      return {
        country: c[0]?.value || "Unknown",
        earnings: parseMicros(c[1]?.value),
        clicks: parseMetricValue(c[2]?.value),
        impressions: parseMetricValue(c[3]?.value),
      };
    })
    .slice(0, 20);

  const byPage = (pageReport.data?.rows || [])
    .map((row) => {
      const c = row.cells || [];
      return {
        page: c[0]?.value || "Unknown",
        earnings: parseMicros(c[1]?.value),
        clicks: parseMetricValue(c[2]?.value),
        impressions: parseMetricValue(c[3]?.value),
        rpm: parseMicros(c[4]?.value),
      };
    })
    .slice(0, 30);

  const byAdUnit = (adUnitReport.data?.rows || []).map((row) => {
    const c = row.cells || [];
    return {
      adUnit: c[0]?.value || "Unknown",
      earnings: parseMicros(c[1]?.value),
      clicks: parseMetricValue(c[2]?.value),
      impressions: parseMetricValue(c[3]?.value),
    };
  });

  const summary = await getAdSenseEarnings();

  const result: AdSenseDetailedReport = {
    dailyData,
    byCountry,
    byPage,
    byAdUnit,
    summary,
  };

  reportCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return result;
}

/**
 * Analiz için tüm metrikleri tek seferde çekmek
 */
export async function getAdSenseMetricsForAnalysis(): Promise<{
  summary: AdSenseEarnings;
  last30Days: AdSenseDailyReport[];
  last7Days: AdSenseDailyReport[];
  byCountry: AdSenseDetailedReport["byCountry"];
  byPage: AdSenseDetailedReport["byPage"];
  byAdUnit: AdSenseDetailedReport["byAdUnit"];
}> {
  const today = getToday();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [summary, detailed, last7Days] = await Promise.all([
    getAdSenseEarnings(),
    getAdSenseDetailedReport(30),
    getAdSenseDailyReport(sevenDaysAgo, today),
  ]);

  return {
    summary,
    last30Days: detailed.dailyData,
    last7Days,
    byCountry: detailed.byCountry,
    byPage: detailed.byPage,
    byAdUnit: detailed.byAdUnit,
  };
}
