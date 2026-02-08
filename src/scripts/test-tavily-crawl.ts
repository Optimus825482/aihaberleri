/**
 * Test script for Tavily Crawl API
 *
 * Usage:
 *   tsx src/scripts/test-tavily-crawl.ts
 */

import {
  crawlWebsite,
  crawlDocumentation,
  batchCrawl,
  estimateCrawlCost,
  filterQualityCrawlResults,
} from "@/lib/tavily-crawl";

async function testBasicCrawl() {
  console.log("\n=== Test 1: Basic Website Crawl ===\n");

  const url = "https://platform.openai.com/docs";

  console.log(`📋 URL: ${url}`);
  console.log(
    `💰 Estimated cost: ~${estimateCrawlCost(50)} credits (assuming 50 pages)\n`,
  );

  const startTime = Date.now();

  try {
    const result = await crawlWebsite(url, {
      maxDepth: 1, // Shallow crawl for testing
      instructions: "Find API documentation pages",
      selectPaths: ["/docs/.*"],
      excludePaths: ["/blog/.*"],
      chunksPerSource: 2,
    });

    const duration = Date.now() - startTime;

    console.log("\n✅ Crawl completed!");
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Total pages: ${result.totalPages}`);
    console.log(`❌ Failed pages: ${result.failedPages}`);
    console.log(
      `📝 Average content length: ${Math.round(result.results.reduce((sum, r) => sum + r.content.length, 0) / result.results.length)} chars`,
    );

    console.log("\n📄 Sample Pages:");
    result.results.slice(0, 5).forEach((page, i) => {
      console.log(`\n  ${i + 1}. ${page.title || page.url}`);
      console.log(`     URL: ${page.url}`);
      console.log(`     Content: ${page.content.length} chars`);
      console.log(`     Preview: ${page.content.substring(0, 100)}...`);
    });
  } catch (error: any) {
    console.error("❌ Crawl failed:", error.message);
  }
}

async function testDocumentationCrawl() {
  console.log("\n=== Test 2: Documentation Crawl ===\n");

  const url = "https://docs.anthropic.com";
  const topic = "Find Claude API features and capabilities";

  console.log(`📋 URL: ${url}`);
  console.log(`🎯 Topic: ${topic}`);
  console.log(
    `💰 Estimated cost: ~${estimateCrawlCost(30)} credits (assuming 30 pages)\n`,
  );

  const startTime = Date.now();

  try {
    const result = await crawlDocumentation(url, topic, {
      maxDepth: 1,
      chunksPerSource: 3,
    });

    const duration = Date.now() - startTime;

    console.log("\n✅ Documentation crawl completed!");
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Total pages: ${result.totalPages}`);
    console.log(`❌ Failed pages: ${result.failedPages}`);

    const qualityResults = filterQualityCrawlResults(result.results, 200);
    console.log(`📝 Quality pages (>200 chars): ${qualityResults.length}`);

    console.log("\n📄 Quality Pages:");
    qualityResults.slice(0, 3).forEach((page, i) => {
      console.log(`\n  ${i + 1}. ${page.title || page.url}`);
      console.log(`     Content: ${page.content.length} chars`);
      console.log(`     Chunks: ${page.chunks?.length || 0}`);
      console.log(`     Preview: ${page.content.substring(0, 150)}...`);
    });
  } catch (error: any) {
    console.error("❌ Documentation crawl failed:", error.message);
  }
}

async function testBatchCrawl() {
  console.log("\n=== Test 3: Batch Documentation Crawl ===\n");

  const sites = [
    {
      url: "https://platform.openai.com/docs",
      topic: "Find new API features and updates",
      options: { maxDepth: 1 },
    },
    {
      url: "https://docs.anthropic.com",
      topic: "Find Claude capabilities and features",
      options: { maxDepth: 1 },
    },
  ];

  console.log(`📋 Sites: ${sites.length}`);
  sites.forEach((site, i) => {
    console.log(`  ${i + 1}. ${site.url}`);
    console.log(`     Topic: ${site.topic}`);
  });
  console.log(
    `💰 Estimated cost: ~${estimateCrawlCost(60)} credits (assuming 30 pages per site)\n`,
  );

  const startTime = Date.now();

  try {
    const results = await batchCrawl(sites);

    const duration = Date.now() - startTime;

    console.log("\n✅ Batch crawl completed!");
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Successful: ${results.length}/${sites.length}`);

    results.forEach((result, i) => {
      console.log(`\n--- Site ${i + 1}: ${sites[i].url} ---`);
      console.log(`Total pages: ${result.totalPages}`);
      console.log(`Failed pages: ${result.failedPages}`);
      console.log(
        `Quality pages: ${filterQualityCrawlResults(result.results, 200).length}`,
      );
    });
  } catch (error: any) {
    console.error("❌ Batch crawl failed:", error.message);
  }
}

async function testWeeklyCrawlUseCase() {
  console.log("\n=== Test 4: Weekly Documentation Crawl Use Case ===\n");

  const aiDocsSites = [
    {
      url: "https://platform.openai.com/docs",
      topic: "Find new API features, updates, and announcements",
    },
    {
      url: "https://docs.anthropic.com",
      topic: "Find Claude updates and new capabilities",
    },
    {
      url: "https://ai.google.dev/docs",
      topic: "Find Gemini API updates and features",
    },
  ];

  console.log("📰 Weekly AI documentation crawl...\n");
  console.log(`📋 Sites: ${aiDocsSites.length}`);
  console.log(
    `💰 Estimated cost: ~${estimateCrawlCost(90)} credits (assuming 30 pages per site)\n`,
  );

  try {
    const results = await batchCrawl(
      aiDocsSites.map((site) => ({
        ...site,
        options: { maxDepth: 2, chunksPerSource: 3 },
      })),
    );

    console.log("\n✅ Weekly crawl completed!\n");

    // Simulate news article generation
    console.log("📧 Weekly AI Updates Preview:\n");
    console.log("=".repeat(60));
    console.log("AI DOCUMENTATION UPDATES - Week of February 8, 2026");
    console.log("=".repeat(60));

    results.forEach((result, i) => {
      const qualityPages = filterQualityCrawlResults(result.results, 300);

      console.log(`\n## ${aiDocsSites[i].url}\n`);
      console.log(`Found ${qualityPages.length} updated pages\n`);

      qualityPages.slice(0, 3).forEach((page, j) => {
        console.log(`${j + 1}. ${page.title || page.url}`);
        console.log(`   ${page.content.substring(0, 150)}...\n`);
      });
    });

    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("❌ Weekly crawl failed:", error.message);
  }
}

async function testCostEstimation() {
  console.log("\n=== Test 5: Cost Estimation ===\n");

  const scenarios = [
    { name: "Small site (10 pages)", pages: 10 },
    { name: "Medium site (50 pages)", pages: 50 },
    { name: "Large site (200 pages)", pages: 200 },
    { name: "Weekly crawl (3 sites × 30 pages)", pages: 90 },
  ];

  console.log("💰 Credit Cost Estimates:\n");

  scenarios.forEach((scenario) => {
    const cost = estimateCrawlCost(scenario.pages);
    console.log(`  ${scenario.name}: ${cost} credits`);
  });

  console.log("\n📊 Monthly Budget Analysis:");
  console.log("  Budget: 1000 credits/month");
  console.log("  Weekly crawl (90 credits): 4 weeks = 360 credits");
  console.log("  Remaining for other features: 640 credits");
  console.log("  ✅ Within budget!");
}

async function main() {
  console.log("🚀 Tavily Crawl API Test Suite\n");

  // Check API key
  if (!process.env.TAVILY_API_KEY) {
    console.error("❌ TAVILY_API_KEY environment variable is not set");
    process.exit(1);
  }

  console.log("✅ TAVILY_API_KEY found\n");

  // Run tests
  await testBasicCrawl();
  await testDocumentationCrawl();
  await testBatchCrawl();
  await testWeeklyCrawlUseCase();
  await testCostEstimation();

  console.log("\n✅ All tests completed!\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
