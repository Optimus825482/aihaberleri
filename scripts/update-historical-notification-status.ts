/**
 * Geçmiş Haberlerin Bildirim Durumlarını Güncelleme
 *
 * Bu script:
 * - IndexNow ve Facebook'u "SUBMITTED" olarak işaretler
 * - Google'ı "PENDING" olarak işaretler
 */

import { db } from "@/lib/db";

async function updateHistoricalStatus() {
  console.log("🔄 Geçmiş haberlerin bildirim durumları güncelleniyor...\n");

  try {
    // 1. Tüm yayınlanmış haberleri al
    const articles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        publishedAt: true,
        indexNowStatus: true,
        googleIndexStatus: true,
        facebookShared: true,
      },
    });

    console.log(`📊 Toplam ${articles.length} yayınlanmış haber bulundu\n`);

    let indexNowUpdated = 0;
    let googleUpdated = 0;
    let facebookUpdated = 0;

    // 2. Her haberi güncelle
    for (const article of articles) {
      const updates: any = {};

      // IndexNow - Eğer PENDING veya null ise SUBMITTED yap
      if (!article.indexNowStatus || article.indexNowStatus === "PENDING") {
        updates.indexNowStatus = "SUBMITTED";
        updates.indexedAt = article.publishedAt; // Yayın tarihini kullan
        indexNowUpdated++;
      }

      // Google - Eğer SUBMITTED ise PENDING yap (tekrar gönderilecek)
      if (article.googleIndexStatus === "SUBMITTED") {
        updates.googleIndexStatus = "PENDING";
        updates.googleIndexedAt = null;
        googleUpdated++;
      } else if (!article.googleIndexStatus) {
        updates.googleIndexStatus = "PENDING";
        googleUpdated++;
      }

      // Facebook - Eğer false ise true yap
      if (!article.facebookShared) {
        updates.facebookShared = true;
        facebookUpdated++;
      }

      // Güncelleme varsa uygula
      if (Object.keys(updates).length > 0) {
        await db.article.update({
          where: { id: article.id },
          data: updates,
        });
      }
    }

    console.log("\n✅ Güncelleme tamamlandı!\n");
    console.log(`📈 İstatistikler:`);
    console.log(
      `   - IndexNow: ${indexNowUpdated} haber "Gönderildi" olarak işaretlendi`,
    );
    console.log(
      `   - Google: ${googleUpdated} haber "Gönderilmedi" olarak işaretlendi`,
    );
    console.log(
      `   - Facebook: ${facebookUpdated} haber "Gönderildi" olarak işaretlendi`,
    );
    console.log(`\n🎯 Sonuç: Tüm geçmiş haberler güncellendi!`);
  } catch (error) {
    console.error("❌ Hata:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Script'i çalıştır
updateHistoricalStatus()
  .then(() => {
    console.log("\n✨ Script başarıyla tamamlandı!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script başarısız:", error);
    process.exit(1);
  });
