/**
 * Test script for Tavily Research API
 *
 * Usage:
 *   tsx src/scripts/test-tavily-research.ts
 */

import {
  conductResearch,
  batchResearch,
  estimateResearchCost,
} from "@/lib/tavily-research";

async function testSingleResearch() {
  console.log("\n=== Test 1: Single Research ===\n");

  const topic = "Latest AI breakthroughs in February 2026";

  console.log(`📋 Topic: ${topic}`);
  console.log(
    `💰 Estimated cost: ${estimateResearchCost(1, "mini")} credits\n`,
  );

  const startTime = Date.now();

  try {
    const result = await conductResearch(topic, {
      model: "mini",
      citationFormat: "numbered",
      maxResults: 10,
      searchDepth: "advanced",
    });

    const duration = Date.now() - startTime;

    console.log("\n✅ Research completed!");
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Status: ${result.status}`);
    console.log(`🤖 Model: ${result.model}`);
    console.log(`📝 Content length: ${result.content.length} chars`);
    console.log(`🔗 Sources: ${result.sources.length}`);
    console.log(
      `\n📄 Content Preview:\n${result.content.substring(0, 500)}...\n`,
    );
    console.log(`\n🔗 Sources:`);
    result.sources.slice(0, 5).forEach((source, i) => {
      console.log(`  ${i + 1}. ${source.title}`);
      console.log(`     ${source.url}`);
    });
  } catch (error: any) {
    console.error("❌ Research failed:", error.message);
  }
}

async function testBatchResearch() {
  console.log("\n=== Test 2: Batch Research ===\n");

  const topics = [
    "AI breakthroughs this week",
    "New AI tools and frameworks released",
    "AI industry news and funding rounds",
  ];

  console.log(`📋 Topics: ${topics.length}`);
  topics.forEach((topic, i) => {
    console.log(`  ${i + 1}. ${topic}`);
  });
  console.log(
    `💰 Estimated cost: ${estimateResearchCost(topics.length, "mini")} credits\n`,
  );

  const startTime = Date.now();

  try {
    const results = await batchResearch(topics, {
      model: "mini",
      citationFormat: "numbered",
    });

    const duration = Date.now() - startTime;

    console.log("\n✅ Batch research completed!");
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Successful: ${results.length}/${topics.length}`);

    results.forEach((result, i) => {
      console.log(`\n--- Topic ${i + 1}: ${topics[i]} ---`);
      console.log(`Status: ${result.status}`);
      console.log(`Content: ${result.content.length} chars`);
      console.log(`Sources: ${result.sources.length}`);
      console.log(`Preview: ${result.content.substring(0, 200)}...`);
    });
  } catch (error: any) {
    console.error("❌ Batch research failed:", error.message);
  }
}

async function testWeeklyDigest() {
  console.log("\n=== Test 3: Weekly Digest Use Case ===\n");

  const weeklyTopics = [
    "AI breakthroughs this week",
    "New AI tools and frameworks",
    "AI industry news and funding",
  ];

  console.log("📰 Generating weekly AI digest...\n");
  console.log(
    `💰 Estimated cost: ${estimateResearchCost(weeklyTopics.length, "mini")} credits\n`,
  );

  try {
    const results = await batchResearch(weeklyTopics, {
      model: "mini",
      citationFormat: "numbered",
      searchDepth: "advanced",
    });

    console.log("\n✅ Weekly digest research completed!\n");

    // Simulate newsletter generation
    console.log("📧 Newsletter Preview:\n");
    console.log("=".repeat(60));
    console.log("AI WEEKLY DIGEST - Week of February 8, 2026");
    console.log("=".repeat(60));

    results.forEach((result, i) => {
      console.log(`\n## ${weeklyTopics[i]}\n`);
      console.log(result.content.substring(0, 300) + "...\n");
      console.log(`📚 Sources: ${result.sources.length} references`);
    });

    console.log("\n" + "=".repeat(60));
  } catch (error: any) {
    console.error("❌ Weekly digest generation failed:", error.message);
  }
}

async function main() {
  console.log("🚀 Tavily Research API Test Suite\n");

  // Check API key
  if (!process.env.TAVILY_API_KEY) {
    console.error("❌ TAVILY_API_KEY environment variable is not set");
    process.exit(1);
  }

  console.log("✅ TAVILY_API_KEY found\n");

  // Run tests
  await testSingleResearch();
  await testBatchResearch();
  await testWeeklyDigest();

  console.log("\n✅ All tests completed!\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
