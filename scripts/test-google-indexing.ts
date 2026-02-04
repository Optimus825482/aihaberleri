/**
 * Google Indexing API Test Script
 *
 * Kullanım:
 * npx tsx scripts/test-google-indexing.ts
 */

import {
  notifyGoogle,
  notifyGoogleBatch,
  getNotificationMetadata,
  notifyNewsToGoogle,
} from "../src/lib/seo/google-indexing-api";

async function testGoogleIndexingAPI() {
  console.log("🚀 Google Indexing API Test Başlıyor...\n");

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://aihaberleri.com.tr";
  const testUrl = `${baseUrl}/test-haber-slug`;

  try {
    // Test 1: Tek URL bildirimi
    console.log("📝 Test 1: Tek URL Bildirimi");
    console.log("URL:", testUrl);
    const result1 = await notifyGoogle(testUrl, "URL_UPDATED");
    console.log("Sonuç:", result1);
    console.log("");

    // Test 2: Bildirim durumu sorgulama
    console.log("📊 Test 2: Bildirim Durumu Sorgulama");
    const result2 = await getNotificationMetadata(testUrl);
    console.log("Sonuç:", result2);
    console.log("");

    // Test 3: Toplu bildirim
    console.log("📦 Test 3: Toplu Bildirim (3 URL)");
    const batchUrls = [
      { url: `${baseUrl}/test-1`, type: "URL_UPDATED" as const },
      { url: `${baseUrl}/test-2`, type: "URL_UPDATED" as const },
      { url: `${baseUrl}/test-3`, type: "URL_UPDATED" as const },
    ];
    const result3 = await notifyGoogleBatch(batchUrls);
    console.log("Sonuç:", result3);
    console.log("");

    // Test 4: Helper fonksiyon
    console.log("🔧 Test 4: Helper Fonksiyon (notifyNewsToGoogle)");
    const result4 = await notifyNewsToGoogle("test-haber-slug-2");
    console.log("Sonuç:", result4);
    console.log("");

    console.log("✅ Tüm testler tamamlandı!");
  } catch (error) {
    console.error("❌ Test hatası:", error);
    process.exit(1);
  }
}

// Test'i çalıştır
testGoogleIndexingAPI();
