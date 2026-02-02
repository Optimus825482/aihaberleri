/**
 * Test Smart Filtering System
 *
 * Usage:
 *   npx tsx scripts/test-smart-filtering.ts
 */

import { fetchAINews } from "@/services/news.service";
import { runSmartFiltering } from "@/services/smart-filtering.service";

async function main() {
  console.log("🚀 Testing Smart Filtering System\n");

  // Step 1: Fetch AI news
  console.log("📰 Step 1: Fetching AI news...");
  const newsArticles = await fetchAINews();
  console.log(`✅ Fetched ${newsArticles.length} articles\n`);

  if (newsArticles.length === 0) {
    console.log("❌ No articles found. Exiting.");
    process.exit(1);
  }

  // Step 2: Run smart filtering
  console.log("🎯 Step 2: Running smart filtering pipeline...\n");
  const result = await runSmartFiltering(newsArticles, {
    batchSize: 10,
    topPerBatch: 5,
    targetCount: 5,
    timeWindowDays: 7,
  });

  // Step 3: Display results
  console.log("\n📊 RESULTS:");
  console.log(`${"=".repeat(60)}`);
  console.log(`Input Articles:        ${result.stats.input_count}`);
  console.log(`After Batch Filter:    ${result.stats.stage1_count}`);
  console.log(`After Topic Extract:   ${result.stats.stage2_count}`);
  console.log(`After Smart Select:    ${result.stats.stage3_count}`);
  console.log(
    `Duplicate Rate:        ${(result.stats.duplicate_rate * 100).toFixed(1)}%`,
  );
  console.log(
    `Processing Time:       ${(result.stats.processing_time_ms / 1000).toFixed(1)}s`,
  );
  console.log(`${"=".repeat(60)}\n`);

  // Step 4: Display selected articles
  console.log("✅ SELECTED ARTICLES:");
  result.stage3_unique.forEach((article, index) => {
    console.log(
      `\n${index + 1}. [${article.trendScore || 0}] ${article.topic}`,
    );
    console.log(`   ${article.title}`);
    console.log(`   ${article.url}`);
  });

  console.log("\n✅ Test completed successfully!");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
