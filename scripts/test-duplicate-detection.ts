/**
 * Test Duplicate Detection System
 *
 * Bu script duplicate detection sistemini test eder
 */

import { isDuplicateNews } from "../src/services/news.service";

async function testDuplicateDetection() {
  console.log("🧪 Duplicate Detection Test Başlıyor...\n");

  // Test 1: Exact Match
  console.log("Test 1: Exact Title Match");
  const test1 = await isDuplicateNews(
    "Google Chrome, Çok Adımlı İşlemleri Otomatik Yapan 'Auto Browse' Özelliğini Tanıttı",
  );
  console.log(`Result: ${test1.isDuplicate ? "❌ DUPLICATE" : "✅ UNIQUE"}`);
  if (test1.isDuplicate) {
    console.log(`Reason: ${test1.reason}`);
    console.log(`Similar Article ID: ${test1.similarArticleId}`);
  }
  console.log("");

  // Test 2: Similar Title (should detect as duplicate)
  console.log("Test 2: Similar Title (80%+ match)");
  const test2 = await isDuplicateNews(
    "Google Chrome Çok Adımlı İşlemleri Otomatik Yapan Auto Browse Özelliği Tanıttı",
  );
  console.log(`Result: ${test2.isDuplicate ? "❌ DUPLICATE" : "✅ UNIQUE"}`);
  if (test2.isDuplicate) {
    console.log(`Reason: ${test2.reason}`);
    console.log(`Similar Article ID: ${test2.similarArticleId}`);
  }
  console.log("");

  // Test 3: Amazon duplicate test
  console.log("Test 3: Amazon 16 Bin İşten Çıkarma (should detect duplicates)");
  const test3 = await isDuplicateNews(
    "Amazon 16 Bin Personel Pozisyonunu Kapatıyor",
  );
  console.log(`Result: ${test3.isDuplicate ? "❌ DUPLICATE" : "✅ UNIQUE"}`);
  if (test3.isDuplicate) {
    console.log(`Reason: ${test3.reason}`);
    console.log(`Similar Article ID: ${test3.similarArticleId}`);
  }
  console.log("");

  // Test 4: ASML duplicate test
  console.log("Test 4: ASML Rekor Sipariş (should detect duplicates)");
  const test4 = await isDuplicateNews(
    "ASML Yapay Zeka Talebiyle Rekor Sipariş Aldı",
  );
  console.log(`Result: ${test4.isDuplicate ? "❌ DUPLICATE" : "✅ UNIQUE"}`);
  if (test4.isDuplicate) {
    console.log(`Reason: ${test4.reason}`);
    console.log(`Similar Article ID: ${test4.similarArticleId}`);
  }
  console.log("");

  // Test 5: Completely different news (should be unique)
  console.log("Test 5: Completely Different News (should be unique)");
  const test5 = await isDuplicateNews(
    "Yeni Bir Teknoloji Şirketi Kuruldu ve 100 Milyon Dolar Yatırım Aldı",
  );
  console.log(`Result: ${test5.isDuplicate ? "❌ DUPLICATE" : "✅ UNIQUE"}`);
  if (test5.isDuplicate) {
    console.log(`Reason: ${test5.reason}`);
    console.log(`Similar Article ID: ${test5.similarArticleId}`);
  }
  console.log("");

  console.log("✅ Test tamamlandı!");
}

// Run tests
testDuplicateDetection()
  .then(() => {
    console.log("\n🎉 Tüm testler başarıyla tamamlandı!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test hatası:", error);
    process.exit(1);
  });
