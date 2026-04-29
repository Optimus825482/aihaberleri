import { XMLParser } from "fast-xml-parser";

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

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildRssUrl(query: string, language: string): string {
  const hl = language === "tr" ? "tr" : "en-US";
  const gl = language === "tr" ? "TR" : "US";
  const ceid = language === "tr" ? "TR:tr" : "US:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

function normalizeItems(items: GoogleNewsRssItem[], count: number): GoogleNewsSearchResult[] {
  const seen = new Set<string>();
  const out: GoogleNewsSearchResult[] = [];

  for (const [idx, item] of items.entries()) {
    const rawLink = item.link || "";
    const resolvedUrl = decodeGoogleRedirect(rawLink);
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

export function getGoogleNewsStats() {
  return {
    requests: 0,
    successes: 0,
    timeouts: 0,
    errors: 0,
    fallbacks: 0,
    zeroResults: 0,
    lastLatencyMs: null as number | null,
    avgLatencyMs: null as number | null,
    fallbackRate: 0,
    available: true,
    lastError: null as string | null,
    updatedAt: new Date().toISOString(),
    alertThreshold: 0,
    shouldAlert: false,
    consecutiveFailures: 0,
  };
}

export function resetGoogleNewsStats(): void {
  return;
}

export async function getSharedGoogleNewsStats() {
  return null;
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
  const count = Math.min(Math.max(options.count ?? 10, 1), 50);
  const language = options.language === "tr" ? "tr" : "en";
  const url = buildRssUrl(query, language);

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

  return normalizeItems(items, count);
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
