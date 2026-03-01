/**
 * RSS Feed Health Check Script
 * Tests ALL feeds in AI_NEWS_RSS_FEEDS for accessibility and valid XML.
 *
 * Usage: npx tsx scripts/test-all-rss-feeds.ts
 */

// Import feeds directly by reading the array
import { AI_NEWS_RSS_FEEDS } from "../src/lib/rss";

interface FeedResult {
  name: string;
  url: string;
  status: "OK" | "FAIL";
  httpStatus?: number;
  error?: string;
  contentType?: string;
  itemCount?: number;
  responseTime: number;
}

async function testFeed(feed: {
  name: string;
  url: string;
  language: string;
}): Promise<FeedResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const resp = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (AIHaberleri RSS Checker/1.0)",
        Accept:
          "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    const contentType = resp.headers.get("content-type") || "unknown";

    if (!resp.ok) {
      return {
        name: feed.name,
        url: feed.url,
        status: "FAIL",
        httpStatus: resp.status,
        error: `HTTP ${resp.status} ${resp.statusText}`,
        contentType,
        responseTime: elapsed,
      };
    }

    // Read body and check if it looks like XML/RSS
    const body = await resp.text();
    const hasXmlMarkers =
      body.includes("<rss") ||
      body.includes("<feed") ||
      body.includes("<channel") ||
      body.includes("<?xml") ||
      body.includes("<entry");

    // Count items roughly
    const itemMatches =
      body.match(/<item[\s>]/g) || body.match(/<entry[\s>]/g) || [];

    if (!hasXmlMarkers) {
      return {
        name: feed.name,
        url: feed.url,
        status: "FAIL",
        httpStatus: resp.status,
        error: "Response is not valid XML/RSS",
        contentType,
        responseTime: elapsed,
      };
    }

    return {
      name: feed.name,
      url: feed.url,
      status: "OK",
      httpStatus: resp.status,
      contentType,
      itemCount: itemMatches.length,
      responseTime: elapsed,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    let errorMsg = err.message || String(err);
    if (err.name === "AbortError") errorMsg = "TIMEOUT (12s)";
    return {
      name: feed.name,
      url: feed.url,
      status: "FAIL",
      error: errorMsg,
      responseTime: elapsed,
    };
  }
}

async function main() {
  // Filter only active feeds (not commented out)
  const feeds = AI_NEWS_RSS_FEEDS;
  console.log(`\n🔍 Testing ${feeds.length} RSS feeds...\n`);
  console.log("─".repeat(100));

  const results: FeedResult[] = [];
  const BATCH_SIZE = 8; // parallel batch size

  for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
    const batch = feeds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(testFeed));

    for (const r of batchResults) {
      results.push(r);
      const icon = r.status === "OK" ? "✅" : "❌";
      const items = r.itemCount !== undefined ? ` [${r.itemCount} items]` : "";
      const http = r.httpStatus ? ` HTTP ${r.httpStatus}` : "";
      const err = r.error ? ` → ${r.error}` : "";
      const time = `${r.responseTime}ms`;
      console.log(
        `${icon} ${r.name.padEnd(40)} ${time.padStart(7)}${http}${items}${err}`,
      );
    }
  }

  // Summary
  console.log("\n" + "═".repeat(100));
  const ok = results.filter((r) => r.status === "OK");
  const fail = results.filter((r) => r.status === "FAIL");

  console.log(
    `\n📊 SUMMARY: ${ok.length}/${results.length} feeds OK, ${fail.length} FAILED\n`,
  );

  if (fail.length > 0) {
    console.log("❌ FAILED FEEDS:");
    console.log("─".repeat(80));
    for (const f of fail) {
      console.log(`  ${f.name}`);
      console.log(`    URL: ${f.url}`);
      console.log(`    Error: ${f.error}`);
      console.log();
    }
  }

  // Group by tier (based on comments in the feed list)
  const okByResponseTime = [...ok].sort(
    (a, b) => b.responseTime - a.responseTime,
  );
  if (okByResponseTime.length > 0) {
    console.log("\n⏱️  SLOWEST OK FEEDS (>3s):");
    console.log("─".repeat(80));
    for (const f of okByResponseTime.filter((r) => r.responseTime > 3000)) {
      console.log(`  ${f.name.padEnd(40)} ${f.responseTime}ms`);
    }
  }

  // New feeds check
  const newFeedNames = [
    "MIT News - AI",
    "Stanford HAI",
    "AI2 (Allen Institute)",
    "arXiv cs.AI",
    "CMU AI",
    "NIST AI",
    "NVIDIA Developer Blog",
    "AWS AI Blog",
    "Meta AI (FB News)",
    "IBM Developer AI",
    "Intel AI Blog",
    "DataRobot Blog",
    "The Guardian - AI",
    "Financial Times - AI",
    "New York Times - Tech",
    "The Conversation - AI",
    "AI Weekly",
    "DailyAI",
    "AIwire",
    "AI Time Journal",
    "InsideAI",
    "fast.ai Blog",
    "O'Reilly",
    "Coursera Blog",
    "Kaggle Blog",
    "OpenCV AI",
    "Indian Express - AI",
    "Mint - AI",
    "France 24 - AI",
    "Future of Life Institute",
    "Partnership on AI",
    "AI Ethics",
  ];

  const newResults = results.filter((r) => newFeedNames.includes(r.name));
  const newOk = newResults.filter((r) => r.status === "OK");
  const newFail = newResults.filter((r) => r.status === "FAIL");

  console.log(
    `\n🆕 NEW FEEDS (result.md): ${newOk.length}/${newResults.length} OK, ${newFail.length} FAILED`,
  );
  if (newFail.length > 0) {
    console.log("  Failed new feeds:");
    for (const f of newFail) {
      console.log(`    ❌ ${f.name}: ${f.error}`);
    }
  }

  // Exit code
  process.exit(fail.length > 0 ? 1 : 0);
}

main().catch(console.error);
