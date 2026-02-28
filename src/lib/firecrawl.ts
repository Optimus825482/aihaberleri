/**
 * Firecrawl API Integration
 *
 * Premium web scraping — LAST RESORT only.
 * Used ONLY for articles that failed the DatabasePublisher quality gate
 * AND only when cheaper layers (SearXNG + Exa) returned insufficient sources.
 *
 * Credit budget: 500 scrapes maximum (1 credit = 1 page).
 * Counter is persisted in Redis so it survives restarts.
 *
 * API Key: FIRECRAWL_API_KEY (env var)
 * Docs: https://docs.firecrawl.dev
 */

import FirecrawlApp from "@mendable/firecrawl-js";
import { getRedis } from "@/lib/redis";

// ─── Credit budget ──────────────────────────────────────────────────────────
const FIRECRAWL_MAX_CREDITS = 500;
const REDIS_CREDITS_KEY = "firecrawl:credits-used";

/** Returns how many credits have been consumed so far (0 if Redis unavailable). */
export async function getFirecrawlCreditsUsed(): Promise<number> {
  try {
    const redis = getRedis();
    if (!redis) return 0;
    const val = await redis.get(REDIS_CREDITS_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

/** Returns remaining credits. Negative means over-budget. */
export async function getFirecrawlCreditsRemaining(): Promise<number> {
  return FIRECRAWL_MAX_CREDITS - (await getFirecrawlCreditsUsed());
}

/**
 * Consume one credit.
 * Returns true  → credit accepted, caller may proceed.
 * Returns false → budget exhausted, caller must skip Firecrawl.
 */
async function consumeCredit(): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return true; // Redis unavailable → fail-open
    // INCR is atomic — safe under concurrency
    const used = await redis.incr(REDIS_CREDITS_KEY);
    if (used > FIRECRAWL_MAX_CREDITS) {
      // Over budget — roll back the increment so the counter stays accurate
      await redis.decr(REDIS_CREDITS_KEY);
      console.warn(
        `[firecrawl] ⛔ Credit budget exhausted (${FIRECRAWL_MAX_CREDITS} used). Skipping scrape.`,
      );
      return false;
    }
    console.log(
      `[firecrawl] 💳 Credit consumed: ${used}/${FIRECRAWL_MAX_CREDITS} used`,
    );
    return true;
  } catch (err: any) {
    // Redis failure — allow the call but log the warning
    console.warn(
      `[firecrawl] ⚠️ Redis credit check failed: ${err?.message} — proceeding without counter`,
    );
    return true;
  }
}

// ─── SDK singleton ───────────────────────────────────────────────────────────
let _client: FirecrawlApp | null = null;

function getClient(): FirecrawlApp {
  if (!_client) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }
    _client = new FirecrawlApp({ apiKey });
  }
  return _client;
}

export interface FirecrawlPageResult {
  url: string;
  title: string;
  content: string; // markdown
  statusCode?: number;
}

export interface FirecrawlSearchResult {
  url: string;
  title: string;
  content: string; // markdown snippet
  description?: string;
}

// ============================================================
// SCRAPE — Single URL full-page extraction
// ============================================================

/**
 * Scrape a single URL and return its clean markdown content.
 * Falls back to empty string (never throws) so callers stay resilient.
 *
 * @param url  Target page URL
 * @param timeoutMs  Per-request timeout in ms (default: 15 000)
 */
export async function firecrawlScrape(
  url: string,
  timeoutMs = 15_000,
): Promise<FirecrawlPageResult> {
  // ── Guard 1: API key ──────────────────────────────────────────────────────
  if (!process.env.FIRECRAWL_API_KEY) {
    return { url, title: "", content: "" };
  }

  // ── Guard 2: Credit budget ────────────────────────────────────────────────
  const allowed = await consumeCredit();
  if (!allowed) {
    return { url, title: "", content: "" };
  }

  const app = getClient();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Firecrawl SDK v4: app.scrape(url, options) → returns Document
    const result = await app.scrape(url, {
      formats: ["markdown"],
      excludeTags: [
        "nav",
        "footer",
        "header",
        "aside",
        "script",
        "style",
      ] as any,
    });

    if (!result.markdown) {
      console.warn(`[firecrawl] scrape returned no markdown for ${url}`);
      return { url, title: "", content: "" };
    }

    const markdown = result.markdown;
    const metadata = (result as any).metadata ?? {};
    const title: string = metadata.title ?? "";
    const statusCode: number | undefined = metadata.statusCode;

    return { url, title, content: markdown, statusCode };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn(`[firecrawl] scrape timeout (${timeoutMs}ms) for ${url}`);
    } else {
      console.warn(`[firecrawl] scrape error for ${url}: ${err?.message}`);
    }
    return { url, title: "", content: "" };
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// SEARCH — Find related pages with markdown content
// ============================================================

/**
 * Search the web via Firecrawl and return results with extracted markdown.
 * Returns empty array on any error so callers stay resilient.
 *
 * @param query   Search query
 * @param limit   Max results to return (default: 5)
 */
export async function firecrawlSearch(
  query: string,
  limit = 5,
): Promise<FirecrawlSearchResult[]> {
  const app = getClient();

  try {
    // Firecrawl search returns pages with their extracted content
    const result = await (app as any).search(query, {
      limit,
      scrapeOptions: {
        formats: ["markdown"],
      },
    });

    if (!result?.success || !Array.isArray(result.data)) {
      return [];
    }

    return (result.data as any[]).map((item) => ({
      url: item.url ?? "",
      title: item.metadata?.title ?? item.title ?? "",
      content: item.markdown ?? item.content ?? "",
      description: item.description ?? "",
    }));
  } catch (err: any) {
    console.warn(`[firecrawl] search error for "${query}": ${err?.message}`);
    return [];
  }
}

// ============================================================
// AVAILABILITY CHECK
// ============================================================

/** Returns true when FIRECRAWL_API_KEY is set (does not validate the key) */
export function isFirecrawlAvailable(): boolean {
  return !!process.env.FIRECRAWL_API_KEY;
}
