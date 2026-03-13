import axios from "axios";
import { parseStringPromise } from "xml2js";
import {
  ALL_INTERNATIONAL_SOURCES,
  type RSSSource,
} from "../src/config/rss-sources";

type FeedAuditStatus = "success" | "empty" | "failed" | "timeout";

interface FeedAuditResult {
  id: string;
  name: string;
  language: RSSSource["language"];
  url: string;
  isActive: boolean;
  status: FeedAuditStatus;
  itemCount: number;
  responseTimeMs: number;
  error?: string;
}

const CONCURRENCY = 6;
const TIMEOUT_MS = 15_000;

function toItems(parsed: any): unknown[] {
  if (parsed?.rss?.channel?.item) {
    return Array.isArray(parsed.rss.channel.item)
      ? parsed.rss.channel.item
      : [parsed.rss.channel.item];
  }

  if (parsed?.feed?.entry) {
    return Array.isArray(parsed.feed.entry)
      ? parsed.feed.entry
      : [parsed.feed.entry];
  }

  return [];
}

async function auditFeed(source: RSSSource): Promise<FeedAuditResult> {
  const startedAt = Date.now();

  try {
    const response = await axios.get(source.url, {
      timeout: TIMEOUT_MS,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      validateStatus: (status) => status === 200,
    });

    const parsed = await parseStringPromise(response.data, {
      trim: true,
      normalize: true,
      explicitArray: false,
    });

    const items = toItems(parsed);

    return {
      id: source.id,
      name: source.name,
      language: source.language,
      url: source.url,
      isActive: source.isActive,
      status: items.length > 0 ? "success" : "empty",
      itemCount: items.length,
      responseTimeMs: Date.now() - startedAt,
    };
  } catch (error: any) {
    return {
      id: source.id,
      name: source.name,
      language: source.language,
      url: source.url,
      isActive: source.isActive,
      status: error?.code === "ECONNABORTED" ? "timeout" : "failed",
      itemCount: 0,
      responseTimeMs: Date.now() - startedAt,
      error: error?.message || String(error),
    };
  }
}

async function auditSources(sources: RSSSource[]): Promise<FeedAuditResult[]> {
  const results: FeedAuditResult[] = [];

  for (let index = 0; index < sources.length; index += CONCURRENCY) {
    const batch = sources.slice(index, index + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(auditFeed));
    results.push(...batchResults);
    console.log(
      `BATCH_DONE=${Math.min(index + CONCURRENCY, sources.length)}/${sources.length}`,
    );
  }

  return results;
}

async function main() {
  const mode = process.argv.includes("--all") ? "all" : "active";
  const sources =
    mode === "all"
      ? ALL_INTERNATIONAL_SOURCES
      : ALL_INTERNATIONAL_SOURCES.filter((source) => source.isActive);

  console.log(`MODE=${mode}`);
  console.log(`SOURCE_COUNT=${sources.length}`);

  const results = await auditSources(sources);
  const success = results.filter((result) => result.status === "success");
  const broken = results.filter((result) => result.status !== "success");

  console.log(`SUCCESS_COUNT=${success.length}`);
  console.log(`BROKEN_COUNT=${broken.length}`);
  console.log("BROKEN_JSON_START");
  console.log(JSON.stringify(broken, null, 2));
  console.log("BROKEN_JSON_END");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
