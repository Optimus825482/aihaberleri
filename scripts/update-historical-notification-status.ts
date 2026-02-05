import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateHistoricalStatus() {
  console.log("🔄 Geçmiş bildirim durumları güncelleniyor...\n");

  try {
    // Tüm yayınlanmış haberleri al
    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        titleEn: true,
        indexNowStatus: true,
        facebookShared: true,
        googleIndexStatus: true,
        indexNowStatusEn: true,
        googleIndexStatusEn: true,
      },
    });

    console.log(`📊 Toplam ${articles.length} yayınlanmış haber bulundu\n`);

    let updatedCount = 0;

    for (const article of articles) {
      const updates: any = {};

      // Türkçe IndexNow durumu
      if (
        article.indexNowStatus === "SUBMITTED" &&
        !article.googleIndexStatus
      ) {
        updates.googleIndexStatus = "PENDING";
      }

      // İngilizce IndexNow durumu (eğer İngilizce çeviri varsa)
      if (
        article.titleEn &&
        article.indexNowStatusEn === "SUBMITTED" &&
        !article.googleIndexStatusEn
      ) {
        updates.googleIndexStatusEn = "PENDING";
      }

      // Güncelleme gerekiyorsa
      if (Object.keys(updates).length > 0) {
        await prisma.article.update({
          where: { id: article.id },
          data: updates,
        });

        updatedCount++;
        console.log(`✅ Güncellendi: ${article.title}`);
        if (updates.googleIndexStatusEn) {
          console.log(`   └─ İngilizce: ${article.titleEn}`);
        }
      }
    }

    console.log(`\n✅ Toplam ${updatedCount} haber güncellendi`);
    console.log(`📊 ${articles.length - updatedCount} haber zaten güncel\n`);

    // Özet istatistikler
    const stats = await prisma.article.groupBy({
      by: ["googleIndexStatus"],
      where: {
        status: "PUBLISHED",
      },
      _count: true,
    });

    console.log("📈 Google Bildirim Durumu (Türkçe):");
    stats.forEach((stat) => {
      console.log(
        `   ${stat.googleIndexStatus || "NULL"}: ${stat._count} haber`,
      );
    });

    const statsEn = await prisma.article.groupBy({
      by: ["googleIndexStatusEn"],
      where: {
        status: "PUBLISHED",
        titleEn: { not: null },
      },
      _count: true,
    });

    console.log("\n📈 Google Bildirim Durumu (İngilizce):");
    statsEn.forEach((stat) => {
      console.log(
        `   ${stat.googleIndexStatusEn || "NULL"}: ${stat._count} haber`,
      );
    });
  } catch (error) {
    console.error("❌ Hata:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateHistoricalStatus()
  .then(() => {
    console.log("\n✅ İşlem tamamlandı!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ İşlem başarısız:", error);
    process.exit(1);
  });
