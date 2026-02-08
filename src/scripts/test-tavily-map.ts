/**
 * Test script for Tavily Map API
 *
 * Usage:
 *   tsx src/scripts/test-tavily-map.ts
 */

import {
  mapSite,
  mapDocumentation,
  batchMap,
  mapAndPrepareExtract,
  filterUrls,
  groupUrlsByPath,
} from "@/lib/tavily-map";

async function testBasicMap() {
  console.log("\n=== Test 1: Basic Site Map ===\n");

  const url = "https://platform.openai.com/docs";

  console.log(`📋 URL: ${url}\n`);

  const startTime = Date.now();

  try {
    const result = await mapSite(url, {
      maxDepth: 1,
      instructions: "Find API documentation pages",
      selectPaths: ["/docs/.*"],
      excludePaths: ["/blog/.*"],
    });

    const duration = Date.now() - startTime;

    console.log("\n✅ Site map completed!");
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Total URLs: ${result.totalUrls}`);

    console.log("\n📄 Sample URLs:");
    result.urls.slice(0, 10).forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });

    // Group URLs by path
    const grouped = groupUrlsByPath(result.urls);
    console.log("\n📁 URLs grouped by path:");
    Object.entries(grouped).forEach(([prefix, urls]) => {
      console.log(`  ${prefix}: ${urls.length} URLs`);
    });
  } catch (error: any) {
    console.error("❌ Site map failed:", error.message);
  }
}

async function testDocumentationMap() {
  console.log("\n=== Test 2: Documentation Map ===\n");

  const url = "https://docs.anthropic.com";
  const topic = "Find Claude API documentation and guides";

  console.log(`📋 URL: ${url}`);
  console.log(`🎯 Topic: ${topic}\n`);

  const startTime = Date.now();

  try {
    const result = await mapDocumentation(url, topic, {
      maxDepth: 2,
    });

    const duration = Date.now() - startTime;

    console.log("\n✅ Documentation map completed!");
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Total URLs: ${result.totalUrls}`);

    // Filter URLs
    const apiUrls = filterUrls(result.urls, [/\/api\//]);
    const guideUrls = filterUrls(result.urls, [/\/guide\//]);

    console.log(`\n📊 URL Breakdown:`);
    console.log(`  API URLs: ${apiUrls.length}`);
    console.log(`  Guide URLs: ${guideUrls.length}`);

    console.log("\n📄 Sample API URLs:");
    apiUrls.slice(0, 5).forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
  } catch (error: any) {
    console.error("❌ Documentation map failed:", error.message);
  }
}

async function testBatchMap() {
  console.log("\n=== Test 3: Batch Site Map ===\n");

  const sites = [
    {
      url: "https://platform.openai.com/docs",
      topic: "Find API documentation",
      options: { maxDepth: 1 },
    },
    {
      url: "https://docs.anthropic.com",
      topic: "Find Claude documentation",
      options: { maxDepth: 1 },
    },
  ];

  console.log(`📋 Sites: ${sites.length}`);
  sites.forEach((site, i) => {
    console.log(`  ${i + 1}. ${site.url}`);
  });
  console.log();

  const startTime = Date.now();

  try {
    const results = await batchMap(sites);

    const duration = Date.now() - startTime;

    console.log("\n✅ Batch map completed!");
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Successful: ${results.length}/${sites.length}`);

    results.forEach((result, i) => {
      console.log(`\n--- Site ${i + 1}: ${sites[i].url} ---`);
      console.log(`Total URLs: ${result.totalUrls}`);

      const grouped = groupUrlsByPath(result.urls);
      console.log(`Path groups: ${Object.keys(grouped).length}`);
      Object.entries(grouped)
        .slice(0, 3)
        .forEach(([prefix, urls]) => {
          console.log(`  ${prefix}: ${urls.length} URLs`);
        });
    });
  } catch (error: any) {
    console.error("❌ Batch map failed:", error.message);
  }
}

async function testMapAndExtractWorkflow() {
  console.log("\n=== Test 4: Map + Extract Workflow ===\n");

  const url = "https://platform.openai.com/docs";
  const topic = "Find API endpoint documentation";

  console.log(`📋 URL: ${url}`);
  console.log(`🎯 Topic: ${topic}\n`);

  try {
    // Step 1: Map site to discover URLs
    const mapResult = await mapAndPrepareExtract(url, topic, {
      maxDepth: 1,
      selectPaths: ["/docs/api/.*"],
    });

    console.log(
      `\n✅ Step 1 completed: ${mapResult.totalUrls} URLs discovered`,
    );

    // Step 2: Filter to API endpoints only
    const apiUrls = filterUrls(mapResult.urls, [/\/api\//]);
    console.log(`📊 Filtered to ${apiUrls.length} API URLs`);

    // Step 3: Prepare for extraction (limit to 20 for API limit)
    const urlsToExtract = apiUrls.slice(0, 20);
    console.log(`📦 Ready to extract ${urlsToExtract.length} URLs`);

    console.log("\n💡 Next step: Use batchExtract() to extract content");
    console.log("   Example:");
    console.log("   const extracted = await batchExtract(urlsToExtract);");

    console.log("\n📄 URLs ready for extraction:");
    urlsToExtract.slice(0, 5).forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
  } catch (error: any) {
    console.error("❌ Map + Extract workflow failed:", error.message);
  }
}

async function testUrlFiltering() {
  console.log("\n=== Test 5: URL Filtering ===\n");

  const sampleUrls = [
    "https://example.com/docs/api/chat",
    "https://example.com/docs/api/completions",
    "https://example.com/docs/guide/quickstart",
    "https://example.com/blog/announcement",
    "https://example.com/docs/reference/models",
  ];

  console.log("📋 Sample URLs:");
  sampleUrls.forEach((url, i) => {
    console.log(`  ${i + 1}. ${url}`);
  });

  // Test include patterns
  console.log("\n🔍 Filter: Include /api/");
  const apiUrls = filterUrls(sampleUrls, [/\/api\//]);
  apiUrls.forEach((url) => console.log(`  ✅ ${url}`));

  // Test exclude patterns
  console.log("\n🔍 Filter: Exclude /blog/");
  const nonBlogUrls = filterUrls(sampleUrls, undefined, [/\/blog\//]);
  nonBlogUrls.forEach((url) => console.log(`  ✅ ${url}`));

  // Test combined filters
  console.log("\n🔍 Filter: Include /docs/ AND Exclude /blog/");
  const docsUrls = filterUrls(sampleUrls, [/\/docs\//], [/\/blog\//]);
  docsUrls.forEach((url) => console.log(`  ✅ ${url}`));

  // Test grouping
  console.log("\n📁 Group by path:");
  const grouped = groupUrlsByPath(sampleUrls);
  Object.entries(grouped).forEach(([prefix, urls]) => {
    console.log(`  ${prefix}: ${urls.length} URLs`);
    urls.forEach((url) => console.log(`    - ${url}`));
  });
}

async function testComparisonWithCrawl() {
  console.log("\n=== Test 6: Map vs Crawl Comparison ===\n");

  const url = "https://platform.openai.com/docs";

  console.log("🗺️  Map API:");
  console.log("  ✅ Fast URL discovery");
  console.log("  ✅ Cheaper (no content extraction)");
  console.log("  ✅ Good for site structure analysis");
  console.log("  ❌ No content extracted");

  console.log("\n🕷️  Crawl API:");
  console.log("  ✅ Full content extraction");
  console.log("  ✅ Semantic chunking");
  console.log("  ❌ Slower");
  console.log("  ❌ More expensive (1 credit per page)");

  console.log("\n💡 Best Practice:");
  console.log("  1. Use Map to discover URLs");
  console.log("  2. Filter URLs by relevance");
  console.log("  3. Use Extract for targeted content (max 20 URLs)");
  console.log("  4. Use Crawl for comprehensive site analysis");

  console.log("\n📊 Example Workflow:");
  console.log("  Step 1: mapSite() → 100 URLs discovered");
  console.log("  Step 2: filterUrls() → 20 relevant URLs");
  console.log("  Step 3: batchExtract() → 20 credits used");
  console.log("  Total: Cheaper than crawling 100 pages!");
}

async function main() {
  console.log("🚀 Tavily Map API Test Suite\n");

  // Check API key
  if (!process.env.TAVILY_API_KEY) {
    console.error("❌ TAVILY_API_KEY environment variable is not set");
    process.exit(1);
  }

  console.log("✅ TAVILY_API_KEY found\n");

  // Run tests
  await testBasicMap();
  await testDocumentationMap();
  await testBatchMap();
  await testMapAndExtractWorkflow();
  await testUrlFiltering();
  await testComparisonWithCrawl();

  console.log("\n✅ All tests completed!\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
