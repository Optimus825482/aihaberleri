/**
 * Test RSS + Trend Analysis Integration
 *
 * Bu script RSS feed okuma ve Brave Search trend analizini test eder
 */

import { fetchAllRSSFeeds, filterRecentArticles } from "../src/lib/rss";
import { rankArticlesByTrend, getTrendingAITopics } from "../src/lib/brave";
import { fetchAINews } from "../src/services/news.service";

async function testRSSTrendIntegration() {
  console.log("🧪 RSS + Trend Analizi Entegrasyon Testi Başlıyor...\n");

  try {
    // Test 1: RSS Feed Reading
    console.log("📝 Test 1: RSS Feed Okuma");
    console.log("=".repeat(60));

    const rssItems = await fetchAllRSSFeeds();
    console.log(`✅ Toplam ${rssItems.length} haber toplandı`);

    if (rssItems.length > 0) {
      console.log("\nİlk 3 Haber:");
      rssItems.slice(0, 3).forEach((item, i) => {
        console.log(`\n  ${i + 1}. ${item.title}`);
        console.log(`     Kaynak: ${item.source}`);
        console.log(`     Tarih: ${item.pubDate}`);
        console.log(`     URL: ${item.link.substring(0, 60)}...`);
      });
    }
    console.log("");

    // Test 2: Recent Articles Filter
    console.log("📝 Test 2: Son 48 Saat Filtresi");
    console.log("=".repeat(60));

    const recentItems = filterRecentArticles(rssItems, 48);
    console.log(`✅ Son 48 saatte ${recentItems.length} haber`);
    console.log("");

    // Test 3: Trending Topics
    console.log("📝 Test 3: Trend AI Konuları");
    console.log("=".repeat(60));

    const trendingTopics = await getTrendingAITopics();
    console.log(`✅ ${trendingTopics.length} trend konu bulundu:`);
    trendingTopics.slice(0, 5).forEach((topic, i) => {
      console.log(`  ${i + 1}. ${topic}`);
    });
    console.log("");

    // Test 4: Trend Analysis
    console.log("📝 Test 4: Trend Analizi (İlk 5 Haber)");
    console.log("=".repeat(60));

    const itemsToAnalyze = (
      recentItems.length > 0 ? recentItems : rssItems
    ).slice(0, 5);
    console.log(`${itemsToAnalyze.length} haber analiz ediliyor...`);

    const rankings = await rankArticlesByTrend(
      itemsToAnalyze.map((item) => ({
        title: item.title,
        description: item.description,
      })),
    );

    console.log("\n✅ Trend Sıralaması:");
    rankings.forEach((ranking, i) => {
      const item = itemsToAnalyze[ranking.index];
      console.log(`\n  ${i + 1}. Skor: ${Math.round(ranking.score)}`);
      console.log(`     Başlık: ${item.title.substring(0, 70)}...`);
      console.log(`     Kaynak: ${item.source}`);
    });
    console.log("");

    // Test 5: Full Integration
    console.log("📝 Test 5: Tam Entegrasyon (fetchAINews)");
    console.log("=".repeat(60));

    const newsArticles = await fetchAINews();
    console.log(`✅ ${newsArticles.length} trend haber seçildi`);

    if (newsArticles.length > 0) {
      console.log("\nTop 5 Trend Haberler:");
      newsArticles.slice(0, 5).forEach((article, i) => {
        console.log(`\n  ${i + 1}. ${article.title.substring(0, 70)}...`);
        console.log(`     Kaynak: ${article.source}`);
        console.log(`     Trend Skoru: ${Math.round(article.trendScore || 0)}`);
        console.log(`     URL: ${article.url.substring(0, 60)}...`);
      });
    }
    console.log("");

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ Tüm Testler Başarılı!");
    console.log("=".repeat(60));
    console.log("\n📊 Özet:");
    console.log(`  ✅ RSS feed okuma: ${rssItems.length} haber`);
    console.log(`  ✅ Son 48 saat: ${recentItems.length} haber`);
    console.log(`  ✅ Trend konular: ${trendingTopics.length} konu`);
    console.log(`  ✅ Trend analizi: ${rankings.length} haber sıralandı`);
    console.log(`  ✅ Final seçim: ${newsArticles.length} haber`);
    console.log("\n🎉 RSS + Trend Analizi entegrasyonu hazır!");
    console.log("\n💡 Agent artık:");
    console.log("  1. 10+ RSS kaynağından haber toplar");
    console.log("  2. Son 48 saatteki haberleri filtreler");
    console.log("  3. Brave Search ile trend analizi yapar");
    console.log("  4. En popüler 20 haberi seçer");
    console.log("  5. DeepSeek ile yeniden yazar");
    console.log("  6. Pollinations.ai ile görsel oluşturur");
    console.log("  7. Yayınlar!");
  } catch (error) {
    console.error("\n❌ Test Hatası:", error);
    if (error instanceof Error) {
      console.error("Hata Mesajı:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run tests
testRSSTrendIntegration();
