/**
 * Test script for new AI-focused RSS feeds
 * Tests the 10 newly added RSS feeds to verify they work correctly
 */

import { fetchRSSFeed, AI_NEWS_RSS_FEEDS } from "../src/lib/rss";

async function testNewRSSFeeds() {
  console.log("🧪 YENİ AI RSS FEEDLER TEST EDİLİYOR...\n");
  console.log("=".repeat(80));

  // Yeni eklenen 10 feed (AI Business'tan başlayarak)
  const newFeeds = AI_NEWS_RSS_FEEDS.filter((feed) =>
    [
      "AI Business",
      "THE DECODER - AI News",
      "Unite.AI",
      "Analytics India Magazine",
      "The Rundown AI",
      "SiliconANGLE - AI",
      "AI Trends",
      "Synced - AI Review",
      "The Gradient",
      "The Algorithmic Bridge",
    ].includes(feed.name),
  );

  console.log(`📊 Test edilecek feed sayısı: ${newFeeds.length}\n`);

  const results = {
    success: [] as string[],
    failed: [] as string[],
    empty: [] as string[],
  };

  for (const feed of newFeeds) {
    try {
      console.log(`\n📡 Test ediliyor: ${feed.name}`);
      console.log(`   URL: ${feed.url}`);

      const items = await fetchRSSFeed(feed.url, feed.name, 1);

      if (items.length === 0) {
        console.log(`   ⚠️  UYARI: Feed boş`);
        results.empty.push(feed.name);
      } else {
        console.log(`   ✅ BAŞARILI: ${items.length} haber bulundu`);
        console.log(`   📰 İlk haber: ${items[0].title.substring(0, 80)}...`);
        results.success.push(feed.name);
      }
    } catch (error: any) {
      console.log(`   ❌ HATA: ${error.message}`);
      results.failed.push(feed.name);
    }

    // Rate limiting için kısa bekleme
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Özet rapor
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 TEST SONUÇLARI:\n");
  console.log(`✅ Başarılı: ${results.success.length}/${newFeeds.length}`);
  console.log(`❌ Başarısız: ${results.failed.length}/${newFeeds.length}`);
  console.log(`⚠️  Boş: ${results.empty.length}/${newFeeds.length}`);

  if (results.success.length > 0) {
    console.log("\n✅ BAŞARILI FEEDLER:");
    results.success.forEach((name) => console.log(`   - ${name}`));
  }

  if (results.failed.length > 0) {
    console.log("\n❌ BAŞARISIZ FEEDLER:");
    results.failed.forEach((name) => console.log(`   - ${name}`));
  }

  if (results.empty.length > 0) {
    console.log("\n⚠️  BOŞ FEEDLER:");
    results.empty.forEach((name) => console.log(`   - ${name}`));
  }

  console.log("\n" + "=".repeat(80));

  // Başarı oranı
  const successRate = (results.success.length / newFeeds.length) * 100;
  console.log(`\n🎯 BAŞARI ORANI: ${successRate.toFixed(1)}%`);

  if (successRate >= 80) {
    console.log("✅ Test başarılı! Yeni feedler kullanıma hazır.");
  } else if (successRate >= 60) {
    console.log("⚠️  Bazı feedler çalışmıyor, kontrol edilmeli.");
  } else {
    console.log(
      "❌ Çok fazla feed başarısız, konfigürasyon gözden geçirilmeli.",
    );
  }
}

// Script'i çalıştır
testNewRSSFeeds()
  .then(() => {
    console.log("\n✅ Test tamamlandı");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test hatası:", error);
    process.exit(1);
  });
