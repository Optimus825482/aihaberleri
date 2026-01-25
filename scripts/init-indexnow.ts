/**
 * IndexNow Initialization Script
 * İlk kurulum için IndexNow key oluştur ve tüm article'ları submit et
 */

import {
  writeIndexNowKeyFile,
  submitAllArticlesToIndexNow,
} from "../src/lib/seo";

async function initIndexNow() {
  console.log("🚀 IndexNow initialization başlatılıyor...\n");

  try {
    // 1. Key dosyasını oluştur
    console.log("📝 IndexNow key dosyası oluşturuluyor...");
    await writeIndexNowKeyFile();
    console.log("✅ Key dosyası oluşturuldu\n");

    // 2. Tüm article'ları submit et
    console.log("📤 Tüm article'lar IndexNow'a gönderiliyor...");
    const result = await submitAllArticlesToIndexNow();

    if (result.success) {
      console.log(`✅ ${result.count} article başarıyla gönderildi`);
    } else {
      console.log(`⚠️ Article'lar gönderilemedi`);
    }

    console.log("\n✨ IndexNow initialization tamamlandı!");
    console.log("\n📋 Sonraki adımlar:");
    console.log("1. public/ klasöründeki .txt dosyasını kontrol edin");
    console.log(
      "2. Yeni article yayınlandığında otomatik submit için webhook ekleyin",
    );
    console.log("3. Google Search Console'da sitemap'i submit edin");
  } catch (error) {
    console.error("❌ Hata:", error);
    process.exit(1);
  }
}

initIndexNow();
