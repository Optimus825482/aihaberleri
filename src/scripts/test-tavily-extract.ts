/**
 * Test script for Tavily Extract API
 *
 * Usage:
 *   tsx src/scripts/test-tavily-extract.ts
 */

import {
  extractUrl,
  batchExtract,
  priorityExtract,
  estimateExtractCost,
  filterQualityResults,
} from "@/lib/tavily-extract";

async function testSingleExtract() {
  console.log("\n=== Test 1: Single URL Extraction ===\n");

  const url = "https://techcrunch.com/2024/01/15/openai-announces-gpt-4-turbo/";

  console.log(`📋 URL: ${url}`);
  console.log(`💰 Estimated cost: ${estimateExtractCost(1)} credit\n`);

  const startTime = Date.now();

  try {
    const result = await extractUrl(url, {
      query: "AI news",
      chunksPerSource: 3,
      extractDepth: "basic",
    });

    const duration = Date.now() - startTime;

    console.log("\n✅ Extraction completed!");
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Status: ${result.failed ? "FAILED" : "SUCCESS"}`);
    console.log(`📝 Content length: ${result.content.length} chars`);
    console.log(`📄 Raw content length: ${result.rawContent.length} chars`);
    console.log(`🧩 Chunks: ${result.chunks?.length || 0}`);

    if (!result.failed) {
      console.log(
        `\n📄 Content Preview:\n${result.content.substring(0, 500)}...\n`,
      );
    } else {
      console.log(`\n❌ Error: ${result.error}`);
    }
  } catch (error: any) {
    console.error("❌ Extraction failed:", error.message);
  }
}

async function testBatchExtract() {
  console.log("\n=== Test 2: Batch URL Extraction ===\n");

  const urls = [
    "https://techcrunch.com/2024/01/15/openai-announces-gpt-4-turbo/",
    "https://www.theverge.com/2024/1/10/24032975/google-gemini-ai-model-announcement",
    "https://www.wired.com/story/anthropic-claude-3-ai-assistant/",
    "https://invalid-url-that-will-fail.com/article",
  ];

  console.log(`📋 URLs: ${urls.length}`);
  urls.forEach((url, i) => {
    console.log(`  ${i + 1}. ${url}`);
  });
  console.log(
    `💰 Estimated cost: ${estimateExtractCost(urls.length)} credits\n`,
  );

  const startTime = Date.now();

  try {
    const results = await batchExtract(urls, {
      query: "AI breakthroughs",
      chunksPerSource: 3,
      extractDepth: "basic",
    });

    const duration = Date.now() - startTime;

    console.log("\n✅ Batch extraction completed!");
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);

    const successful = results.filter((r) => !r.failed);
    const failed = results.filter((r) => r.failed);

    console.log(`📊 Successful: ${successful.length}/${urls.length}`);
    console.log(`❌ Failed: ${failed.length}/${urls.length}`);

    console.log("\n📄 Results:");
    results.forEach((result, i) => {
      console.log(`\n  ${i + 1}. ${result.url}`);
      console.log(`     Status: ${result.failed ? "FAILED" : "SUCCESS"}`);
      if (!result.failed) {
        console.log(`     Content: ${result.content.length} chars`);
        console.log(`     Chunks: ${result.chunks?.length || 0}`);
        console.log(`     Preview: ${result.content.substring(0, 100)}...`);
      } else {
        console.log(`     Error: ${result.error}`);
      }
    });

    // Test quality filtering
    const qualityResults = filterQualityResults(results, 100);
    console.log(
      `\n✅ Quality filtered: ${qualityResults.length}/${results.length} (min 100 chars)`,
    );
  } catch (error: any) {
    console.error("❌ Batch extraction failed:", error.message);
  }
}

async function testPriorityExtract() {
  console.log("\n=== Test 3: Priority-Based Extraction ===\n");

  const urls = [
    "https://techcrunch.com/2024/01/15/openai-announces-gpt-4-turbo/",
    "https://www.theverge.com/2024/1/10/24032975/google-gemini-ai-model-announcement",
  ];

  console.log("Testing high-priority extraction (priority: 90)...\n");

  try {
    const highPriorityResults = await priorityExtract(urls, 90, {
      query: "AI news",
      chunksPerSource: 3,
    });

    console.log(
      `✅ High priority: ${highPriorityResults.filter((r) => !r.failed).length}/${urls.length} successful`,
    );
  } catch (error: any) {
    console.error("❌ High priority extraction failed:", error.message);
  }

  console.log("\nTesting low-priority extraction (priority: 50)...\n");

  try {
    const lowPriorityResults = await priorityExtract(urls, 50, {
      query: "AI news",
      chunksPerSource: 3,
    });

    console.log(`📊 Low priority: Skipped Tavily (use fallback)`);
    console.log(
      `   Failed results: ${lowPriorityResults.filter((r) => r.failed).length}/${urls.length}`,
    );
  } catch (error: any) {
    console.error("❌ Low priority extraction failed:", error.message);
  }
}

async function testRSSFeedUseCase() {
  console.log("\n=== Test 4: RSS Feed Processing Use Case ===\n");

  // Simulate RSS feed URLs
  const rssFeedUrls = [
    "https://techcrunch.com/2024/01/15/openai-announces-gpt-4-turbo/",
    "https://www.theverge.com/2024/1/10/24032975/google-gemini-ai-model-announcement",
    "https://www.wired.com/story/anthropic-claude-3-ai-assistant/",
  ];

  console.log("📰 Processing RSS feed URLs...\n");
  console.log(`📋 URLs: ${rssFeedUrls.length}`);
  console.log(
    `💰 Estimated cost: ${estimateExtractCost(rssFeedUrls.length)} credits\n`,
  );

  try {
    const results = await batchExtract(rssFeedUrls, {
      query: "AI news and breakthroughs",
      chunksPerSource: 3,
      extractDepth: "basic",
    });

    const qualityResults = filterQualityResults(results, 200);

    console.log("\n✅ RSS feed processing completed!");
    console.log(`📊 Total URLs: ${rssFeedUrls.length}`);
    console.log(`✅ Successful: ${results.filter((r) => !r.failed).length}`);
    console.log(`📝 Quality results (>200 chars): ${qualityResults.length}`);

    console.log("\n📄 Extracted Articles:");
    qualityResults.forEach((result, i) => {
      console.log(`\n  ${i + 1}. ${result.url}`);
      console.log(`     Content: ${result.content.length} chars`);
      console.log(`     Preview: ${result.content.substring(0, 150)}...`);
    });
  } catch (error: any) {
    console.error("❌ RSS feed processing failed:", error.message);
  }
}

async function testLargeBatch() {
  console.log("\n=== Test 5: Large Batch (>20 URLs) ===\n");

  // Generate 25 URLs to test batching
  const urls = Array.from(
    { length: 25 },
    (_, i) => `https://example.com/article-${i + 1}`,
  );

  console.log(`📋 URLs: ${urls.length} (will be split into batches of 20)`);
  console.log(
    `💰 Estimated cost: ${estimateExtractCost(urls.length)} credits\n`,
  );

  try {
    const results = await batchExtract(urls, {
      chunksPerSource: 2,
      extractDepth: "basic",
    });

    console.log("\n✅ Large batch extraction completed!");
    console.log(`📊 Total results: ${results.length}`);
    console.log(`✅ Successful: ${results.filter((r) => !r.failed).length}`);
    console.log(`❌ Failed: ${results.filter((r) => r.failed).length}`);
  } catch (error: any) {
    console.error("❌ Large batch extraction failed:", error.message);
  }
}

async function main() {
  console.log("🚀 Tavily Extract API Test Suite\n");

  // Check API key
  if (!process.env.TAVILY_API_KEY) {
    console.error("❌ TAVILY_API_KEY environment variable is not set");
    process.exit(1);
  }

  console.log("✅ TAVILY_API_KEY found\n");

  // Run tests
  await testSingleExtract();
  await testBatchExtract();
  await testPriorityExtract();
  await testRSSFeedUseCase();
  await testLargeBatch();

  console.log("\n✅ All tests completed!\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
