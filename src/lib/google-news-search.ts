import { XMLParser } from "fast-xml-parser";
import { getRedis } from "@/lib/redis";

export interface GoogleNewsSearchResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  parsed_url: string[];
  template: string;
  engines: string[];
  positions: number[];
  score: number;
  category: string;
  publishedDate?: string;
  thumbnail?: string;
  img_src?: string;
}

interface GoogleNewsRssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { "#text"?: string };
}

interface GoogleNewsRss {
  rss?: {
    channel?: {
      item?: GoogleNewsRssItem[] | GoogleNewsRssItem;
    };
  };
}

function parseHost(url: string): string[] {
  try {
    const u = new URL(url);
    return [u.protocol.replace(":", ""), u.host, u.pathname || "/"];
  } catch {
    return ["https", "", "/"];
  }
}

function decodeGoogleRedirect(link: string): string {
  try {
    const u = new URL(link);
    const target = u.searchParams.get("url") || u.searchParams.get("q");
    if (target) return target;
    return link;
  } catch {
    return link;
  }
}

async function resolveGoogleNewsLink(link: string): Promise<string> {
  const decoded = decodeGoogleRedirect(link);

  try {
    const u = new URL(decoded);
    const isGoogleNewsArticleLink =
      u.hostname === "news.google.com" && u.pathname.startsWith("/rss/articles/");

    if (!isGoogleNewsArticleLink) {
      return decoded;
    }

    try {
      const headResponse = await fetch(decoded, {
        method: "HEAD",
        redirect: "follow",
        headers: {
          "User-Agent": "AIHaberleri-GoogleNewsSearch/1.0",
        },
        cache: "no-store",
      });

      if (headResponse.url && headResponse.url !== decoded) {
        return decodeGoogleRedirect(headResponse.url);
      }
    } catch {
      // fall through to GET fallback
    }

    const getResponse = await fetch(decoded, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "AIHaberleri-GoogleNewsSearch/1.0",
      },
      cache: "no-store",
    });

    if (getResponse.url && getResponse.url !== decoded) {
      return decodeGoogleRedirect(getResponse.url);
    }

    return decoded;
  } catch {
    return decoded;
  }
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildRssUrl(query: string, language: string): string {
  const hl = language === "tr" ? "tr" : "en-US";
  const gl = language === "tr" ? "TR" : "US";
  const ceid = language === "tr" ? "TR:tr" : "US:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

async function normalizeItems(
  items: GoogleNewsRssItem[],
  count: number,
): Promise<GoogleNewsSearchResult[]> {
  const seen = new Set<string>();
  const out: GoogleNewsSearchResult[] = [];

  for (const [idx, item] of items.entries()) {
    const rawLink = item.link || "";
    const resolvedUrl = await resolveGoogleNewsLink(rawLink);
    if (!resolvedUrl || seen.has(resolvedUrl)) continue;
    seen.add(resolvedUrl);

    const title = (item.title || "").trim();
    const content = stripHtml(item.description || "").slice(0, 5000);
    const parsed = parseHost(resolvedUrl);
    const score = Math.max(0.15, Number((1 - idx / Math.max(items.length, 1)).toFixed(3)));

    out.push({
      title,
      url: resolvedUrl,
      content,
      engine: "google-news",
      parsed_url: parsed,
      template: "default.html",
      engines: ["google-news"],
      positions: [idx + 1],
      score,
      category: "news",
      publishedDate: item.pubDate,
    });

    if (out.length >= count) break;
  }

  return out;
}

type GoogleNewsStats = {
  requests: number;
  successes: number;
  timeouts: number;
  errors: number;
  fallbacks: number;
  zeroResults: number;
  lastLatencyMs: number | null;
  avgLatencyMs: number | null;
  fallbackRate: number;
  available: boolean;
  lastError: string | null;
  updatedAt: string;
  alertThreshold: number;
  shouldAlert: boolean;
  consecutiveFailures: number;
};

const GOOGLE_NEWS_STATS_KEY = "stats:google-news:v1";
const GOOGLE_NEWS_ALERT_THRESHOLD = 20;
const GOOGLE_NEWS_STATS_TTL_SECONDS = 7 * 24 * 60 * 60;

const defaultGoogleNewsStats: GoogleNewsStats = {
  requests: 0,
  successes: 0,
  timeouts: 0,
  errors: 0,
  fallbacks: 0,
  zeroResults: 0,
  lastLatencyMs: null,
  avgLatencyMs: null,
  fallbackRate: 0,
  available: true,
  lastError: null,
  updatedAt: new Date().toISOString(),
  alertThreshold: GOOGLE_NEWS_ALERT_THRESHOLD,
  shouldAlert: false,
  consecutiveFailures: 0,
};

let inMemoryGoogleNewsStats: GoogleNewsStats = { ...defaultGoogleNewsStats };

function clampNonNegativeInt(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.floor(num));
}

function normalizeStats(input: Partial<GoogleNewsStats> | null | undefined): GoogleNewsStats {
  const requests = clampNonNegativeInt(input?.requests);
  const fallbacks = clampNonNegativeInt(input?.fallbacks);
  const fallbackRate = requests > 0 ? Math.round((fallbacks / requests) * 100) : 0;

  const normalized: GoogleNewsStats = {
    requests,
    successes: clampNonNegativeInt(input?.successes),
    timeouts: clampNonNegativeInt(input?.timeouts),
    errors: clampNonNegativeInt(input?.errors),
    fallbacks,
    zeroResults: clampNonNegativeInt(input?.zeroResults),
    lastLatencyMs:
      typeof input?.lastLatencyMs === "number" && Number.isFinite(input.lastLatencyMs)
        ? Math.max(0, Math.round(input.lastLatencyMs))
        : null,
    avgLatencyMs:
      typeof input?.avgLatencyMs === "number" && Number.isFinite(input.avgLatencyMs)
        ? Math.max(0, Math.round(input.avgLatencyMs))
        : null,
    fallbackRate,
    available: input?.available !== false,
    lastError: typeof input?.lastError === "string" && input.lastError.trim().length > 0
      ? input.lastError.trim()
      : null,
    updatedAt:
      typeof input?.updatedAt === "string" && input.updatedAt
        ? input.updatedAt
        : new Date().toISOString(),
    alertThreshold: clampNonNegativeInt(input?.alertThreshold) || GOOGLE_NEWS_ALERT_THRESHOLD,
    shouldAlert: false,
    consecutiveFailures: clampNonNegativeInt(input?.consecutiveFailures),
  };

  normalized.shouldAlert = normalized.fallbackRate >= normalized.alertThreshold;
  return normalized;
}

export function getGoogleNewsStats(): GoogleNewsStats {
  return normalizeStats(inMemoryGoogleNewsStats);
}

export function resetGoogleNewsStats(): void {
  inMemoryGoogleNewsStats = { ...defaultGoogleNewsStats, updatedAt: new Date().toISOString() };
}

export async function getSharedGoogleNewsStats(): Promise<GoogleNewsStats | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get(GOOGLE_NEWS_STATS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<GoogleNewsStats>;
    return normalizeStats(parsed);
  } catch {
    return null;
  }
}

export async function googleNewsSearch(
  query: string,
  options: {
    count?: number;
    language?: string;
    time_range?: string;
    safesearch?: 0 | 1 | 2;
    categories?: string;
  } = {},
): Promise<GoogleNewsSearchResult[]> {
  const startedAt = Date.now();
  const count = Math.min(Math.max(options.count ?? 10, 1), 50);
  const language = options.language === "tr" ? "tr" : "en";
  const url = buildRssUrl(query, language);

  const current = getGoogleNewsStats();
  let nextStats: GoogleNewsStats = {
    ...current,
    requests: current.requests + 1,
    updatedAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "AIHaberleri-GoogleNewsSearch/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Google News RSS request failed: ${response.status}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      parseTagValue: true,
      trimValues: true,
    });

    const parsed = parser.parse(xml) as GoogleNewsRss;
    const itemNode = parsed.rss?.channel?.item;
    const items = Array.isArray(itemNode) ? itemNode : itemNode ? [itemNode] : [];
    const normalized = await normalizeItems(items, count);

    const latency = Date.now() - startedAt;
    const successes = current.successes + 1;
    const avgLatencyMs = current.avgLatencyMs === null
      ? latency
      : Math.round((current.avgLatencyMs * current.successes + latency) / Math.max(successes, 1));

    nextStats = normalizeStats({
      ...nextStats,
      successes,
      zeroResults: current.zeroResults + (normalized.length === 0 ? 1 : 0),
      lastLatencyMs: latency,
      avgLatencyMs,
      available: true,
      lastError: null,
      consecutiveFailures: 0,
      updatedAt: new Date().toISOString(),
    });

    inMemoryGoogleNewsStats = nextStats;
    const redis = getRedis();
    if (redis) {
      await redis.setex(GOOGLE_NEWS_STATS_KEY, GOOGLE_NEWS_STATS_TTL_SECONDS, JSON.stringify(nextStats));
    }

    return normalized;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google News request failed";
    const isTimeout = /timeout|abort/i.test(message);

    nextStats = normalizeStats({
      ...nextStats,
      errors: current.errors + (isTimeout ? 0 : 1),
      timeouts: current.timeouts + (isTimeout ? 1 : 0),
      fallbacks: current.fallbacks + 1,
      available: false,
      lastError: message,
      consecutiveFailures: current.consecutiveFailures + 1,
      updatedAt: new Date().toISOString(),
    });

    inMemoryGoogleNewsStats = nextStats;
    const redis = getRedis();
    if (redis) {
      await redis.setex(GOOGLE_NEWS_STATS_KEY, GOOGLE_NEWS_STATS_TTL_SECONDS, JSON.stringify(nextStats));
    }

    throw error;
  }
}

export async function calculateTrendScoreGoogleNews(
  title: string,
  description: string,
): Promise<number> {
  const query = `${title} ${description}`.trim().slice(0, 180);
  const results = await googleNewsSearch(query, { count: 8, language: "en" });

  if (results.length === 0) return 0;

  const domainSet = new Set<string>();
  for (const r of results) {
    try {
      domainSet.add(new URL(r.url).hostname);
    } catch {
      continue;
    }
  }

  const volumeScore = Math.min(45, results.length * 5);
  const diversityScore = Math.min(25, domainSet.size * 4);
  const freshnessScore = results.some((r) => !!r.publishedDate) ? 20 : 10;
  const topScore = Math.round(((results[0]?.score ?? 0) * 10));

  return Math.min(100, volumeScore + diversityScore + freshnessScore + topScore);
}
