/**
 * SearXNG Test Script
 * Tests SearXNG integration and hybrid search with 3 providers
 */

import { searxngSearch, calculateTrendScoreSearXNG } from "../src/lib/searxng";
import {
  hybridSearch,
  calculateTrendScoreHybrid,
  getProviderStats,
} from "../src/lib/hybrid-search";

async function testSearXNG() {
  console.log("🧪 SearXNG Test Başlatılıyor...\n");

  // ============================================
  // TEST 1: Basic SearXNG Search
  // ============================================
  console.log("📋 TEST 1: Basic SearXNG Search");
  console.log("━".repeat(50));

  try {
    const query = "artificial intelligence news";
    console.log(`🔍 Query: "${query}"\n`);

    const results = await searxngSearch(query, {
      count: 5,
      time_range: "week",
    });

    console.log(`✅ ${results.length} sonuç bulundu:\n`);

    results.slice(0, 3).forEach((result, i) => {
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Engine: ${result.engine}`);
      console.log(`   Score: ${result.score}`);
      console.log(`   Content: ${result.content.substring(0, 100)}...`);
      console.log();
    });
  } catch (error: any) {
    console.error("❌ SearXNG search failed:", error.message);
  }

  // ============================================
  // TEST 2: SearXNG Trend Score
  // ============================================
  console.log("\n📋 TEST 2: SearXNG Trend Score");
  console.log("━".repeat(50));

  try {
    const title = "OpenAI releases GPT-5";
    const description = "OpenAI announces the release of GPT-5";

    console.log(`📰 Title: "${title}"`);
    console.log(`📝 Description: "${description}"\n`);

    const score = await calculateTrendScoreSearXNG(title, description);

    console.log(`✅ Trend Score: ${Math.round(score)}`);
  } catch (error: any) {
    console.error("❌ Trend score calculation failed:", error.message);
  }

  // ============================================
  // TEST 3: Hybrid Search (3 Providers)
  // ============================================
  console.log("\n📋 TEST 3: Hybrid Search (Brave + Tavily + SearXNG)");
  console.log("━".repeat(50));

  try {
    const query = "machine learning trends 2026";
    console.log(`🔍 Query: "${query}"\n`);

    // Test 1: Default (round-robin)
    console.log("🔄 Test 3.1: Round-robin (otomatik seçim)");
    const results1 = await hybridSearch(query, { count: 3 });
    console.log(
      `✅ ${results1.length} sonuç (provider: ${results1[0]?.provider})\n`,
    );

    // Test 2: Preferred provider (SearXNG)
    console.log("🎯 Test 3.2: Preferred provider (SearXNG)");
    const results2 = await hybridSearch(query, {
      count: 3,
      preferredProvider: "searxng",
    });
    console.log(
      `✅ ${results2.length} sonuç (provider: ${results2[0]?.provider})\n`,
    );

    // Test 3: Fallback test (simulate Brave failure)
    console.log("🔄 Test 3.3: Fallback test");
    const results3 = await hybridSearch(query, {
      count: 3,
      preferredProvider: "brave", // Will fallback to Tavily or SearXNG if Brave fails
    });
    console.log(
      `✅ ${results3.length} sonuç (provider: ${results3[0]?.provider})\n`,
    );
  } catch (error: any) {
    console.error("❌ Hybrid search failed:", error.message);
  }

  // ============================================
  // TEST 4: Hybrid Trend Score
  // ============================================
  console.log("\n📋 TEST 4: Hybrid Trend Score (3 Providers)");
  console.log("━".repeat(50));

  try {
    const articles = [
      {
        title: "Google announces Gemini 2.0",
        description: "Google releases new AI model",
      },
      {
        title: "Tesla unveils new robotaxi",
        description: "Tesla shows autonomous vehicle",
      },
      {
        title: "Meta releases Llama 4",
        description: "Meta announces new open-source model",
      },
    ];

    console.log(`📊 ${articles.length} haber analiz ediliyor...\n`);

    for (const article of articles) {
      console.log(`📰 "${article.title}"`);
      const score = await calculateTrendScoreHybrid(
        article.title,
        article.description,
      );
      console.log(`   Score: ${Math.round(score)}\n`);
    }
  } catch (error: any) {
    console.error("❌ Hybrid trend score failed:", error.message);
  }

  // ============================================
  // TEST 5: Provider Statistics
  // ============================================
  console.log("\n📋 TEST 5: Provider Statistics");
  console.log("━".repeat(50));

  const stats = getProviderStats();

  console.log("📈 Provider İstatistikleri:\n");

  console.log("🔵 Brave Search:");
  console.log(`   Requests: ${stats.brave.requests}`);
  console.log(`   Errors: ${stats.brave.errors}`);
  console.log(
    `   Status: ${stats.brave.available ? "✅ Aktif" : "🚫 Devre Dışı"}`,
  );
  console.log(
    `   Last Error: ${stats.brave.lastError ? stats.brave.lastError.toISOString() : "None"}`,
  );
  console.log();

  console.log("🟣 Tavily API:");
  console.log(`   Requests: ${stats.tavily.requests}`);
  console.log(`   Errors: ${stats.tavily.errors}`);
  console.log(
    `   Status: ${stats.tavily.available ? "✅ Aktif" : "🚫 Devre Dışı"}`,
  );
  console.log(
    `   Last Error: ${stats.tavily.lastError ? stats.tavily.lastError.toISOString() : "None"}`,
  );
  console.log();

  console.log("🟢 SearXNG (Self-hosted):");
  console.log(`   Requests: ${stats.searxng.requests}`);
  console.log(`   Errors: ${stats.searxng.errors}`);
  console.log(
    `   Status: ${stats.searxng.available ? "✅ Aktif" : "🚫 Devre Dışı"}`,
  );
  console.log(
    `   Last Error: ${stats.searxng.lastError ? stats.searxng.lastError.toISOString() : "None"}`,
  );
  console.log();

  // Calculate total requests
  const totalRequests =
    stats.brave.requests + stats.tavily.requests + stats.searxng.requests;
  console.log(`📊 Toplam İstek: ${totalRequests}`);
  console.log(
    `   Brave: ${((stats.brave.requests / totalRequests) * 100).toFixed(1)}%`,
  );
  console.log(
    `   Tavily: ${((stats.tavily.requests / totalRequests) * 100).toFixed(1)}%`,
  );
  console.log(
    `   SearXNG: ${((stats.searxng.requests / totalRequests) * 100).toFixed(1)}%`,
  );

  console.log("\n✅ Tüm testler tamamlandı!");
}

// Run tests
testSearXNG().catch((error) => {
  console.error("❌ Test suite failed:", error);
  process.exit(1);
});
