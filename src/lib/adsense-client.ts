/**
 * Google AdSense Management API Client
 *
 * AdSense gelir verilerini çekmek için kullanılır.
 * AdSense'e özel service account VEYA GA4 ile ortak service account kullanabilir.
 *
 * Env Variables:
 * - ADSENSE_ACCOUNT_ID: AdSense publisher hesap ID (örn: pub-2444093901783574)
 *
 * Auth (öncelik sırasıyla):
 * 1. ADSENSE_CLIENT_EMAIL + ADSENSE_PRIVATE_KEY  (AdSense'e özel service account)
 * 2. ADSENSE_SERVICE_ACCOUNT_KEY                  (AdSense'e özel JSON key)
 * 3. GA_CLIENT_EMAIL + GA_PRIVATE_KEY              (GA4 ile ortak - fallback)
 * 4. GOOGLE_SERVICE_ACCOUNT_KEY                    (Genel JSON key - fallback)
 */

import { google, adsense_v2 } from "googleapis";
import { createPrivateKey } from "crypto";

// ─── Cache ───────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const reportCache = new Map<string, CacheEntry<any>>();

// ─── Client ──────────────────────────────────────────────
let adsenseClient: adsense_v2.Adsense | null = null;

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

  // Env değeri tek/çift tırnak içine alınmış olabilir
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

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
    const lines = key
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
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

  // Son kontrol: BEGIN marker var mı?
  if (!key.includes("-----BEGIN")) {
    console.warn(
      "[AdSense] Private key BEGIN marker bulunamadı. Key format hatalı olabilir.",
    );
  }

  return key;
}

function isValidPrivateKey(key: string | undefined): boolean {
  if (!key) return false;
  try {
    createPrivateKey({ key, format: "pem" });
    return true;
  } catch {
    return false;
  }
}

function getClient(): adsense_v2.Adsense {
  if (adsenseClient) return adsenseClient;

  // ─── 0. OAuth 2.0 Refresh Token (EN ÖNCELİKLİ) ───
  const oauthClientId = process.env.ADSENSE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.ADSENSE_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.ADSENSE_OAUTH_REFRESH_TOKEN;

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    console.log("[AdSense] Auth yöntemi: OAuth 2.0 Refresh Token");
    const oauth2Client = new google.auth.OAuth2(
      oauthClientId,
      oauthClientSecret,
    );
    oauth2Client.setCredentials({ refresh_token: oauthRefreshToken });

    adsenseClient = google.adsense({ version: "v2", auth: oauth2Client });
    console.log("[AdSense] OAuth client başarıyla oluşturuldu");
    console.log(
      "[AdSense] Account ID:",
      process.env.ADSENSE_ACCOUNT_ID || "TANIMLI DEĞİL!",
    );
    return adsenseClient;
  }

  // ─── Service Account Fallback'ler ───
  let credentials: { client_email: string; private_key: string } | null = null;

  const adsenseEmail = process.env.ADSENSE_CLIENT_EMAIL;
  const adsenseKey = parsePemKey(process.env.ADSENSE_PRIVATE_KEY);
  const adsenseJsonKey = process.env.ADSENSE_SERVICE_ACCOUNT_KEY;
  const gaEmail = process.env.GA_CLIENT_EMAIL;
  const gaKey = parsePemKey(process.env.GA_PRIVATE_KEY);
  const googleJsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (adsenseEmail && adsenseKey && isValidPrivateKey(adsenseKey)) {
    console.log("[AdSense] Auth yöntemi: ADSENSE_CLIENT_EMAIL");
    credentials = { client_email: adsenseEmail, private_key: adsenseKey };
  }

  if (!credentials && adsenseJsonKey) {
    console.log("[AdSense] Auth yöntemi: ADSENSE_SERVICE_ACCOUNT_KEY (JSON)");
    try {
      const parsed = JSON.parse(adsenseJsonKey);
      const parsedPrivateKey = parsePemKey(parsed.private_key);
      if (!isValidPrivateKey(parsedPrivateKey)) {
        throw new Error("ADSENSE_SERVICE_ACCOUNT_KEY private_key geçersiz.");
      }
      credentials = {
        client_email: parsed.client_email,
        private_key: parsedPrivateKey as string,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("ADSENSE_SERVICE_ACCOUNT_KEY geçerli bir JSON değil.");
      }
      throw error;
    }
  }

  if (!credentials && gaEmail && gaKey && isValidPrivateKey(gaKey)) {
    console.log("[AdSense] Auth yöntemi: GA_CLIENT_EMAIL fallback");
    credentials = { client_email: gaEmail, private_key: gaKey };
  }

  if (!credentials && googleJsonKey) {
    console.log("[AdSense] Auth yöntemi: GOOGLE_SERVICE_ACCOUNT_KEY fallback");
    try {
      const parsed = JSON.parse(googleJsonKey);
      const parsedPrivateKey = parsePemKey(parsed.private_key);
      if (!isValidPrivateKey(parsedPrivateKey)) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY private_key geçersiz.");
      }
      credentials = {
        client_email: parsed.client_email,
        private_key: parsedPrivateKey as string,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY geçerli bir JSON değil.");
      }
      throw error;
    }
  }

  if (!credentials) {
    throw new Error(
      "AdSense API yapılandırması eksik. ADSENSE_OAUTH_REFRESH_TOKEN veya service account bilgileri gerekli.",
    );
  }

  console.log("[AdSense] Auth identity:", credentials.client_email);
  console.log(
    "[AdSense] Account ID:",
    process.env.ADSENSE_ACCOUNT_ID || "TANIMLI DEĞİL!",
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/adsense.readonly"],
  });

  adsenseClient = google.adsense({ version: "v2", auth });
  console.log("[AdSense] Client başarıyla oluşturuldu");
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
    const hasOAuth =
      !!process.env.ADSENSE_OAUTH_CLIENT_ID &&
      !!process.env.ADSENSE_OAUTH_CLIENT_SECRET &&
      !!process.env.ADSENSE_OAUTH_REFRESH_TOKEN;
    const hasServiceAccount =
      (!!process.env.ADSENSE_CLIENT_EMAIL &&
        !!process.env.ADSENSE_PRIVATE_KEY) ||
      !!process.env.ADSENSE_SERVICE_ACCOUNT_KEY ||
      (!!process.env.GA_CLIENT_EMAIL && !!process.env.GA_PRIVATE_KEY) ||
      !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    return hasAccount && (hasOAuth || hasServiceAccount);
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
  const num = parseFloat(val);
  return isNaN(num) ? fallback : num;
}

function parseMicros(val: string | undefined | null): number {
  if (!val) return 0;
  const num = parseFloat(val);
  // AdSense API v2 değerleri doğrudan para birimi cinsinden döner (micros DEĞİL)
  return isNaN(num) ? 0 : num;
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
