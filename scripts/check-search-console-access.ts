/**
 * Search Console Erişim Kontrolü
 *
 * Bu script, service account'un Search Console'da doğru şekilde
 * eklenip eklenmediğini kontrol eder.
 *
 * Kullanım:
 * npx tsx scripts/check-search-console-access.ts
 */

import { notifyGoogle } from "../src/lib/seo/google-indexing-api";

async function checkSearchConsoleAccess() {
  console.log("🔍 Search Console Erişim Kontrolü Başlıyor...\n");

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://aihaberleri.com.tr";
  const testUrl = `${baseUrl}/test-indexing-api-${Date.now()}`;

  console.log("📋 Kontrol Bilgileri:");
  console.log(
    "   Service Account: indexer-718@aihaberleri-46042.iam.gserviceaccount.com",
  );
  console.log("   Test URL:", testUrl);
  console.log("   Base URL:", baseUrl);
  console.log("");

  try {
    console.log("🚀 Test bildirimi gönderiliyor...\n");

    const result = await notifyGoogle(testUrl, "URL_UPDATED");

    if (result.success) {
      console.log(
        "✅ BAŞARILI! Service account doğru şekilde yapılandırılmış.\n",
      );
      console.log("📊 Yanıt:", JSON.stringify(result.data, null, 2));
      console.log("");
      console.log("🎉 Google Indexing API kullanıma hazır!");
      console.log("");
      console.log("📝 Sonraki adımlar:");
      console.log("   1. Haber oluşturma endpoint'ine entegre edin");
      console.log("   2. Haber güncelleme endpoint'ine entegre edin");
      console.log("   3. Haber silme endpoint'ine entegre edin");
      console.log("");
    } else {
      console.log("❌ HATA! Service account yapılandırması eksik.\n");
      console.log("🔴 Hata:", result.error);
      console.log("");

      if (result.error?.includes("Permission denied")) {
        console.log("📋 ÇÖZÜM ADIMLARI:\n");
        console.log(
          "1. Search Console'a git: https://search.google.com/search-console",
        );
        console.log(
          "2. Property'yi seç (aihaberleri.com.tr veya https://aihaberleri.com.tr)",
        );
        console.log("3. Settings (⚙️) → Users and permissions");
        console.log('4. "Add user" butonuna tıkla');
        console.log(
          "5. Email'i yapıştır: indexer-718@aihaberleri-46042.iam.gserviceaccount.com",
        );
        console.log('6. "Owner" rolünü seç');
        console.log('7. "Add" butonuna tıkla');
        console.log("8. Bu script'i tekrar çalıştır");
        console.log("");
        console.log("📚 Detaylı rehber: docs/SEARCH-CONSOLE-SETUP.md");
        console.log("");
      } else if (result.error?.includes("Invalid attribute")) {
        console.log("📋 ÇÖZÜM:\n");
        console.log(
          "URL formatı hatalı. NEXT_PUBLIC_BASE_URL environment variable'ını kontrol edin.",
        );
        console.log("");
      } else if (result.error?.includes("quota")) {
        console.log("📋 ÇÖZÜM:\n");
        console.log(
          "Günlük kota aşıldı. Yarın tekrar deneyin veya kota artışı isteyin.",
        );
        console.log("");
      } else {
        console.log("📋 ÇÖZÜM:\n");
        console.log(
          "Beklenmeyen hata. Detaylar için yukarıdaki hata mesajını inceleyin.",
        );
        console.log("");
      }

      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Beklenmeyen hata:", error.message);
    console.log("");
    console.log("📋 Kontrol edilecekler:");
    console.log("   1. aihaberleri-46042-861df20fa232.json dosyası mevcut mu?");
    console.log("   2. googleapis paketi yüklü mü? (npm install googleapis)");
    console.log("   3. NEXT_PUBLIC_BASE_URL environment variable tanımlı mı?");
    console.log("");
    process.exit(1);
  }
}

// Kontrol başlat
checkSearchConsoleAccess();
