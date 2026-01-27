/**
 * Test script for Tavily API optimization
 * Tests rate limiter, batch processing, and caching
 */

import { rankArticlesByTrendTavily } from "../src/lib/tavily";

// Mock articles (simulating 600 news articles)
function generateMockArticles(count: number) {
  const topics = [
    "AI breakthrough in natural language processing",
    "New machine learning model achieves state-of-the-art results",
    "OpenAI releases new GPT model with improved capabilities",
    "Google announces major AI research findings",
    "Robotics company demonstrates autonomous navigation",
    "Deep learning advances in computer vision",
    "AI ethics debate intensifies in tech industry",
    "Startup raises $100M for AI-powered healthcare",
    "Neural network architecture shows promising results",
    "AI regulation framework proposed by government",
  ];

  const articles = [];
  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    articles.push({
      title: `${topic} - Article ${i + 1}`,
      description: `This is a detailed description about ${topic.toLowerCase()}. It contains important information about recent developments.`,
    });
  }
  return articles;
}

async function testOptimization() {
  console.log("🧪 Tavily Optimization Test Starting...\n");

  // Test 1: Small batch (should complete quickly)
  console.log("📊 Test 1: Small batch (10 articles)");
  const smallBatch = generateMockArticles(10);
  const start1 = Date.now();
  try {
    const results1 = await rankArticlesByTrendTavily(smallBatch);
    const duration1 = Date.now() - start1;
    console.log(`✅ Test 1 passed: ${duration1}ms`);
    console.log(
      `   Top 3: ${results1
        .slice(0, 3)
        .map((r) => `#${r.index + 1} (${Math.round(r.score)})`)
        .join(", ")}\n`,
    );
  } catch (error: any) {
    console.error(`❌ Test 1 failed: ${error.message}\n`);
  }

  // Test 2: Medium batch (should use batch processing)
  console.log("📊 Test 2: Medium batch (50 articles)");
  const mediumBatch = generateMockArticles(50);
  const start2 = Date.now();
  try {
    const results2 = await rankArticlesByTrendTavily(mediumBatch);
    const duration2 = Date.now() - start2;
    console.log(`✅ Test 2 passed: ${duration2}ms`);
    console.log(`   Expected: ~10-15 seconds (5 batches × 1s delay)`);
    console.log(
      `   Top 3: ${results2
        .slice(0, 3)
        .map((r) => `#${r.index + 1} (${Math.round(r.score)})`)
        .join(", ")}\n`,
    );
  } catch (error: any) {
    console.error(`❌ Test 2 failed: ${error.message}\n`);
  }

  // Test 3: Large batch (should trigger smart sampling)
  console.log("📊 Test 3: Large batch (150 articles - should sample to 100)");
  const largeBatch = generateMockArticles(150);
  const start3 = Date.now();
  try {
    const results3 = await rankArticlesByTrendTavily(largeBatch);
    const duration3 = Date.now() - start3;
    console.log(`✅ Test 3 passed: ${duration3}ms`);
    console.log(`   Expected: ~20-25 seconds (10 batches × 1s delay)`);
    console.log(`   Processed: ${results3.length} articles (should be 100)`);
    console.log(
      `   Top 3: ${results3
        .slice(0, 3)
        .map((r) => `#${r.index + 1} (${Math.round(r.score)})`)
        .join(", ")}\n`,
    );
  } catch (error: any) {
    console.error(`❌ Test 3 failed: ${error.message}\n`);
  }

  // Test 4: Cache test (run same batch twice)
  console.log("📊 Test 4: Cache test (run same 10 articles twice)");
  const cacheBatch = generateMockArticles(10);

  const start4a = Date.now();
  try {
    await rankArticlesByTrendTavily(cacheBatch);
    const duration4a = Date.now() - start4a;
    console.log(`   First run: ${duration4a}ms`);

    const start4b = Date.now();
    await rankArticlesByTrendTavily(cacheBatch);
    const duration4b = Date.now() - start4b;
    console.log(
      `   Second run: ${duration4b}ms (should be faster due to cache)`,
    );

    if (duration4b < duration4a * 0.8) {
      console.log(
        `✅ Test 4 passed: Cache is working (${Math.round((1 - duration4b / duration4a) * 100)}% faster)\n`,
      );
    } else {
      console.log(`⚠️  Test 4 warning: Cache might not be working optimally\n`);
    }
  } catch (error: any) {
    console.error(`❌ Test 4 failed: ${error.message}\n`);
  }

  console.log("🎉 All tests completed!");
}

// Run tests
testOptimization().catch(console.error);
