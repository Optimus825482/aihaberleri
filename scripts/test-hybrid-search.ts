/**
 * Test Hybrid Search System
 * Tests Brave + Tavily integration with automatic fallback
 */

import {
  hybridSearch,
  calculateTrendScoreHybrid,
  rankArticlesByTrendHybrid,
  getProviderStats,
} from "../src/lib/hybrid-search";

async function testHybridSearch() {
  console.log("🧪 Hybrid Search System Test Başlatılıyor...\n");

  // ============================================
  // TEST 1: Basic Hybrid Search
  // ============================================
  console.log("📋 TEST 1: Basic Hybrid Search");
  console.log("─".repeat(50));

  try {
    const results = await hybridSearch("OpenAI GPT-4 latest news", {
      count: 5,
      freshness: "pd",
    });

    console.log(`✅ ${results.length} sonuç bulundu`);
    console.log("\nİlk 3 sonuç:");
    results.slice(0, 3).forEach((r, i) => {
      console.log(`\n${i + 1}. [${r.provider.toUpperCase()}] ${r.title}`);
      console.log(`   URL: ${r.url}`);
      console.log(`   Açıklama: ${r.description.substring(0, 100)}...`);
    });
  } catch (error: any) {
    console.error("❌ Test 1 başarısız:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // ============================================
  // TEST 2: Trend Score Calculation
  // ============================================
  console.log("📋 TEST 2: Trend Score Calculation");
  console.log("─".repeat(50));

  const testArticles = [
    {
      title: "OpenAI Launches New GPT-5 Model with Advanced Reasoning",
      description:
        "OpenAI has announced GPT-5, featuring breakthrough reasoning capabilities and multimodal understanding.",
    },
    {
      title: "Google Releases Gemini 2.0 with Enhanced AI Features",
      description:
        "Google's latest Gemini 2.0 brings improved performance and new AI capabilities to developers.",
    },
    {
      title: "Meta AI Introduces Llama 3 for Open Source Community",
      description:
        "Meta releases Llama 3, the most powerful open-source language model to date.",
    },
  ];

  console.log(
    `\n${testArticles.length} makale için trend skoru hesaplanıyor...\n`,
  );

  for (const article of testArticles) {
    try {
      const score = await calculateTrendScoreHybrid(
        article.title,
        article.description,
      );
      console.log(`✅ "${article.title.substring(0, 50)}..."`);
      console.log(`   Trend Skoru: ${Math.round(score)}`);
    } catch (error: any) {
      console.error(`❌ Skor hesaplanamadı: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // ============================================
  // TEST 3: Batch Ranking (Rate Limit Test)
  // ============================================
  console.log("📋 TEST 3: Batch Ranking (Rate Limit Testi)");
  console.log("─".repeat(50));

  const batchArticles = [
    {
      title: "AI Breakthrough: New Model Achieves Human-Level Performance",
      description:
        "Researchers announce major AI milestone in reasoning tasks.",
    },
    {
      title: "Tech Giants Invest Billions in AI Infrastructure",
      description: "Major tech companies expand AI data centers worldwide.",
    },
    {
      title: "AI Regulation: New Laws Proposed in Europe",
      description:
        "European Union proposes comprehensive AI regulation framework.",
    },
    {
      title: "Startup Raises $100M for AI-Powered Healthcare",
      description:
        "New AI startup secures funding for medical diagnosis platform.",
    },
    {
      title: "AI in Education: Schools Adopt New Learning Tools",
      description:
        "Educational institutions integrate AI-powered learning systems.",
    },
    {
      title: "Quantum Computing Meets AI: New Research Breakthrough",
      description:
        "Scientists combine quantum computing with AI for faster processing.",
    },
    {
      title: "AI Ethics: Researchers Call for Responsible Development",
      description:
        "Leading AI researchers publish guidelines for ethical AI development.",
    },
    {
      title: "Voice AI Reaches New Accuracy Milestone",
      description:
        "Speech recognition technology achieves 99% accuracy in tests.",
    },
    {
      title: "AI-Generated Art Wins International Competition",
      description: "Controversial win sparks debate about AI creativity.",
    },
    {
      title: "Autonomous Vehicles: AI System Passes Safety Tests",
      description:
        "Self-driving car AI demonstrates improved safety performance.",
    },
  ];

  console.log(
    `\n${batchArticles.length} makale sıralanıyor (rate limit testi)...\n`,
  );

  try {
    const rankings = await rankArticlesByTrendHybrid(batchArticles);

    console.log("\n✅ Sıralama tamamlandı!");
    console.log("\n🏆 Top 5 Trending Makaleler:");
    rankings.slice(0, 5).forEach((r, i) => {
      const article = batchArticles[r.index];
      console.log(`\n${i + 1}. Skor: ${Math.round(r.score)}`);
      console.log(`   ${article.title}`);
    });
  } catch (error: any) {
    console.error("❌ Test 3 başarısız:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // ============================================
  // TEST 4: Provider Statistics
  // ============================================
  console.log("📋 TEST 4: Provider İstatistikleri");
  console.log("─".repeat(50));

  const stats = getProviderStats();

  console.log("\n📊 Brave Search:");
  console.log(
    `   Durum: ${stats.brave.available ? "✅ Aktif" : "🚫 Devre Dışı"}`,
  );
  console.log(`   Toplam İstek: ${stats.brave.requests}`);
  console.log(`   Toplam Hata: ${stats.brave.errors}`);
  if (stats.brave.lastError) {
    console.log(
      `   Son Hata: ${stats.brave.lastError.toLocaleString("tr-TR")}`,
    );
  }

  console.log("\n📊 Tavily Search:");
  console.log(
    `   Durum: ${stats.tavily.available ? "✅ Aktif" : "🚫 Devre Dışı"}`,
  );
  console.log(`   Toplam İstek: ${stats.tavily.requests}`);
  console.log(`   Toplam Hata: ${stats.tavily.errors}`);
  if (stats.tavily.lastError) {
    console.log(
      `   Son Hata: ${stats.tavily.lastError.toLocaleString("tr-TR")}`,
    );
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // ============================================
  // SUMMARY
  // ============================================
  console.log("📊 TEST ÖZET");
  console.log("─".repeat(50));

  const totalRequests = stats.brave.requests + stats.tavily.requests;
  const totalErrors = stats.brave.errors + stats.tavily.errors;
  const successRate =
    totalRequests > 0
      ? ((totalRequests - totalErrors) / totalRequests) * 100
      : 0;

  console.log(`\n✅ Toplam İstek: ${totalRequests}`);
  console.log(`❌ Toplam Hata: ${totalErrors}`);
  console.log(`📈 Başarı Oranı: ${successRate.toFixed(1)}%`);

  if (stats.brave.requests > 0 && stats.tavily.requests > 0) {
    console.log("\n🎯 Hibrit sistem başarıyla çalışıyor!");
    console.log("   Her iki provider da kullanıldı.");
  } else if (stats.brave.requests > 0) {
    console.log("\n⚠️ Sadece Brave kullanıldı");
  } else if (stats.tavily.requests > 0) {
    console.log("\n⚠️ Sadece Tavily kullanıldı");
  }

  console.log("\n✅ Tüm testler tamamlandı!\n");
}

// Run tests
testHybridSearch().catch((error) => {
  console.error("❌ Test suite failed:", error);
  process.exit(1);
});
