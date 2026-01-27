/**
 * Comprehensive RSS Feed Validation Script
 * Tests all 90+ RSS feeds and generates detailed report
 */

import axios from "axios";
import { parseStringPromise } from "xml2js";
import { AI_NEWS_RSS_FEEDS } from "../src/lib/rss";

interface FeedTestResult {
  name: string;
  url: string;
  language: string;
  status: "success" | "failed" | "timeout" | "invalid";
  responseTime: number;
  itemCount: number;
  error?: string;
}

interface TestSummary {
  total: number;
  success: number;
  failed: number;
  timeout: number;
  invalid: number;
  byLanguage: {
    en: { total: number; success: number };
    tr: { total: number; success: number };
  };
  avgResponseTime: number;
  totalItems: number;
}

/**
 * Test a single RSS feed
 */
async function testFeed(
  feed: { name: string; url: string; language: string },
  timeout: number = 15000,
): Promise<FeedTestResult> {
  const startTime = Date.now();

  try {
    const response = await axios.get(feed.url, {
      timeout,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      validateStatus: (status) => status === 200,
    });

    const responseTime = Date.now() - startTime;
    const xml = response.data;

    // Parse XML
    const parsed = await parseStringPromise(xml, {
      trim: true,
      normalize: true,
      explicitArray: false,
    });

    // Count items
    let itemCount = 0;
    if (parsed.rss?.channel?.item) {
      itemCount = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item.length
        : 1;
    } else if (parsed.feed?.entry) {
      itemCount = Array.isArray(parsed.feed.entry)
        ? parsed.feed.entry.length
        : 1;
    }

    if (itemCount === 0) {
      return {
        name: feed.name,
        url: feed.url,
        language: feed.language,
        status: "invalid",
        responseTime,
        itemCount: 0,
        error: "No items found in feed",
      };
    }

    return {
      name: feed.name,
      url: feed.url,
      language: feed.language,
      status: "success",
      responseTime,
      itemCount,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return {
        name: feed.name,
        url: feed.url,
        language: feed.language,
        status: "timeout",
        responseTime,
        itemCount: 0,
        error: "Request timeout",
      };
    }

    return {
      name: feed.name,
      url: feed.url,
      language: feed.language,
      status: "failed",
      responseTime,
      itemCount: 0,
      error: error.message,
    };
  }
}

/**
 * Test all feeds with concurrency control
 */
async function testAllFeeds(
  maxConcurrent: number = 10,
): Promise<FeedTestResult[]> {
  console.log(`\n🧪 Testing ${AI_NEWS_RSS_FEEDS.length} RSS feeds...\n`);

  const results: FeedTestResult[] = [];
  const feeds = [...AI_NEWS_RSS_FEEDS];

  // Process in batches
  for (let i = 0; i < feeds.length; i += maxConcurrent) {
    const batch = feeds.slice(i, i + maxConcurrent);
    const batchNumber = Math.floor(i / maxConcurrent) + 1;
    const totalBatches = Math.ceil(feeds.length / maxConcurrent);

    console.log(
      `📦 Batch ${batchNumber}/${totalBatches} (${batch.length} feeds)`,
    );

    const batchPromises = batch.map((feed) => testFeed(feed));
    const batchResults = await Promise.all(batchPromises);

    results.push(...batchResults);

    // Print batch results
    batchResults.forEach((result) => {
      const icon =
        result.status === "success"
          ? "✅"
          : result.status === "timeout"
            ? "⏱️"
            : result.status === "invalid"
              ? "⚠️"
              : "❌";
      console.log(
        `  ${icon} ${result.name} (${result.responseTime}ms, ${result.itemCount} items)`,
      );
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });

    // Small delay between batches
    if (i + maxConcurrent < feeds.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Generate test summary
 */
function generateSummary(results: FeedTestResult[]): TestSummary {
  const summary: TestSummary = {
    total: results.length,
    success: results.filter((r) => r.status === "success").length,
    failed: results.filter((r) => r.status === "failed").length,
    timeout: results.filter((r) => r.status === "timeout").length,
    invalid: results.filter((r) => r.status === "invalid").length,
    byLanguage: {
      en: {
        total: results.filter((r) => r.language === "en").length,
        success: results.filter(
          (r) => r.language === "en" && r.status === "success",
        ).length,
      },
      tr: {
        total: results.filter((r) => r.language === "tr").length,
        success: results.filter(
          (r) => r.language === "tr" && r.status === "success",
        ).length,
      },
    },
    avgResponseTime:
      results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
    totalItems: results.reduce((sum, r) => sum + r.itemCount, 0),
  };

  return summary;
}

/**
 * Print detailed report
 */
function printReport(results: FeedTestResult[], summary: TestSummary) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 RSS FEED TEST REPORT");
  console.log("=".repeat(80));

  console.log("\n📈 OVERALL STATISTICS:");
  console.log(`  Total Feeds: ${summary.total}`);
  console.log(
    `  ✅ Success: ${summary.success} (${((summary.success / summary.total) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  ❌ Failed: ${summary.failed} (${((summary.failed / summary.total) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  ⏱️  Timeout: ${summary.timeout} (${((summary.timeout / summary.total) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  ⚠️  Invalid: ${summary.invalid} (${((summary.invalid / summary.total) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  ⚡ Avg Response Time: ${summary.avgResponseTime.toFixed(0)}ms`,
  );
  console.log(`  📰 Total Items: ${summary.totalItems}`);

  console.log("\n🌍 BY LANGUAGE:");
  console.log(
    `  English (en): ${summary.byLanguage.en.success}/${summary.byLanguage.en.total} success (${((summary.byLanguage.en.success / summary.byLanguage.en.total) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  Turkish (tr): ${summary.byLanguage.tr.success}/${summary.byLanguage.tr.total} success (${((summary.byLanguage.tr.success / summary.byLanguage.tr.total) * 100).toFixed(1)}%)`,
  );

  // Failed feeds
  const failedFeeds = results.filter((r) => r.status !== "success");
  if (failedFeeds.length > 0) {
    console.log("\n❌ FAILED FEEDS:");
    failedFeeds.forEach((feed) => {
      console.log(`  • ${feed.name}`);
      console.log(`    URL: ${feed.url}`);
      console.log(`    Status: ${feed.status}`);
      console.log(`    Error: ${feed.error || "Unknown"}`);
    });
  }

  // Top 10 fastest feeds
  const fastestFeeds = [...results]
    .filter((r) => r.status === "success")
    .sort((a, b) => a.responseTime - b.responseTime)
    .slice(0, 10);

  console.log("\n⚡ TOP 10 FASTEST FEEDS:");
  fastestFeeds.forEach((feed, index) => {
    console.log(
      `  ${index + 1}. ${feed.name} (${feed.responseTime}ms, ${feed.itemCount} items)`,
    );
  });

  // Top 10 slowest feeds
  const slowestFeeds = [...results]
    .filter((r) => r.status === "success")
    .sort((a, b) => b.responseTime - a.responseTime)
    .slice(0, 10);

  console.log("\n🐌 TOP 10 SLOWEST FEEDS:");
  slowestFeeds.forEach((feed, index) => {
    console.log(
      `  ${index + 1}. ${feed.name} (${feed.responseTime}ms, ${feed.itemCount} items)`,
    );
  });

  console.log("\n" + "=".repeat(80));
}

/**
 * Save report to file
 */
function saveReport(results: FeedTestResult[], summary: TestSummary) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    summary,
    results,
  };

  const fs = require("fs");
  const reportPath = "RSS-FEED-TEST-REPORT.json";

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    const results = await testAllFeeds(10);
    const summary = generateSummary(results);

    printReport(results, summary);
    saveReport(results, summary);

    // Exit with error code if too many failures
    const successRate = (summary.success / summary.total) * 100;
    if (successRate < 80) {
      console.error(
        `\n⚠️  WARNING: Success rate is below 80% (${successRate.toFixed(1)}%)`,
      );
      process.exit(1);
    }

    console.log(
      `\n✅ Test completed successfully! Success rate: ${successRate.toFixed(1)}%`,
    );
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Run tests
main();
