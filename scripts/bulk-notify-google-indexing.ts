/**
 * Toplu Google Indexing API Bildirimi
 *
 * Mevcut tüm yayınlanmış haberleri Google'a bildirir.
 * Batch işlem yapar (100'er URL).
 */

import { db } from "../src/lib/db";
import { notifyGoogleBatch } from "../src/lib/seo/google-indexing-api";

async function bulkNotifyGoogleIndexing() {
  console.log("🚀 Toplu Google Indexing API bildirimi başlıyor...\n");

  try {
    // Tüm yayınlanmış haberleri al
    const articles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        publishedAt: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    console.log(`📊 Toplam ${articles.length} yayınlanmış haber bulundu\n`);

    if (articles.length === 0) {
      console.log("⚠️ Bildirilecek haber bulunamadı");
      return;
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

    // Google Indexing API batch limiti: 100 URL
    const BATCH_SIZE = 100;
    let totalSuccess = 0;
    let totalFailed = 0;

    // Batch'lere böl
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(articles.length / BATCH_SIZE);

      console.log(
        `\n📦 Batch ${batchNumber}/${totalBatches} işleniyor (${batch.length} haber)...`,
      );

      // URL'leri hazırla
      const urls = batch.map((article) => ({
        url: `${baseUrl}/news/${article.slug}`,
        type: "URL_UPDATED" as const,
      }));

      // Batch bildirim gönder
      const result = await notifyGoogleBatch(urls);

      if (result.success) {
        totalSuccess += result.successCount || 0;
        totalFailed += result.failCount || 0;

        console.log(`✅ Batch ${batchNumber} tamamlandı:`);
        console.log(`   Başarılı: ${result.successCount}`);
        console.log(`   Başarısız: ${result.failCount}`);

        // Başarısız olanları göster
        if (result.results) {
          const failed = result.results.filter((r) => !r.success);
          if (failed.length > 0) {
            console.log(`\n   ❌ Başarısız URL'ler:`);
            failed.forEach((f) => {
              console.log(`      - ${f.url}`);
              console.log(`        Hata: ${f.error}`);
            });
          }
        }
      } else {
        console.error(`❌ Batch ${batchNumber} başarısız:`, result.error);
        totalFailed += batch.length;
      }

      // Rate limiting için bekleme (Google API quota koruması)
      if (i + BATCH_SIZE < articles.length) {
        console.log("⏳ 2 saniye bekleniyor (rate limit koruması)...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Özet
    console.log("\n" + "=".repeat(60));
    console.log("📊 TOPLU BİLDİRİM ÖZETİ");
    console.log("=".repeat(60));
    console.log(`Toplam Haber: ${articles.length}`);
    console.log(`✅ Başarılı: ${totalSuccess}`);
    console.log(`❌ Başarısız: ${totalFailed}`);
    console.log(
      `📈 Başarı Oranı: ${((totalSuccess / articles.length) * 100).toFixed(1)}%`,
    );
    console.log("=".repeat(60));

    // İngilizce çeviriler için de bildirim (varsa)
    console.log("\n🌍 İngilizce çeviriler kontrol ediliyor...");

    const translations = await db.$queryRaw<{ slug: string }[]>`
      SELECT DISTINCT slug 
      FROM "ArticleTranslation" 
      WHERE locale = 'en'
      LIMIT 1000
    `;

    if (translations.length > 0) {
      console.log(`📊 ${translations.length} İngilizce çeviri bulundu\n`);

      let enSuccess = 0;
      let enFailed = 0;

      // İngilizce URL'leri batch'le
      for (let i = 0; i < translations.length; i += BATCH_SIZE) {
        const batch = translations.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(translations.length / BATCH_SIZE);

        console.log(
          `\n📦 EN Batch ${batchNumber}/${totalBatches} işleniyor (${batch.length} çeviri)...`,
        );

        const urls = batch.map((t) => ({
          url: `${baseUrl}/en/news/${t.slug}`,
          type: "URL_UPDATED" as const,
        }));

        const result = await notifyGoogleBatch(urls);

        if (result.success) {
          enSuccess += result.successCount || 0;
          enFailed += result.failCount || 0;
          console.log(
            `✅ EN Batch ${batchNumber}: ${result.successCount} başarılı, ${result.failCount} başarısız`,
          );
        } else {
          enFailed += batch.length;
          console.error(`❌ EN Batch ${batchNumber} başarısız`);
        }

        if (i + BATCH_SIZE < translations.length) {
          console.log("⏳ 2 saniye bekleniyor...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      console.log("\n" + "=".repeat(60));
      console.log("📊 İNGİLİZCE ÇEVİRİ BİLDİRİM ÖZETİ");
      console.log("=".repeat(60));
      console.log(`Toplam Çeviri: ${translations.length}`);
      console.log(`✅ Başarılı: ${enSuccess}`);
      console.log(`❌ Başarısız: ${enFailed}`);
      console.log(
        `📈 Başarı Oranı: ${((enSuccess / translations.length) * 100).toFixed(1)}%`,
      );
      console.log("=".repeat(60));
    } else {
      console.log("ℹ️ İngilizce çeviri bulunamadı");
    }

    console.log("\n✅ Toplu bildirim tamamlandı!");
    console.log("\n📝 Sonraki adımlar:");
    console.log("   1. Search Console'da service account iznini kontrol et");
    console.log(
      "   2. 5-10 dakika sonra Google Search Console'da URL'leri kontrol et",
    );
    console.log("   3. URL Inspection Tool ile indexing durumunu sorgula");
  } catch (error) {
    console.error("❌ Toplu bildirim hatası:", error);
    process.exit(1);
  }
}

// Script'i çalıştır
bulkNotifyGoogleIndexing()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
