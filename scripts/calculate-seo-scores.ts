/**
 * Calculate SEO Scores for All Articles
 *
 * Bu script tüm yayınlanmış makaleler için SEO skorlarını hesaplar
 */

import { db } from "../src/lib/db";
import {
  analyzeArticleSEO,
  saveSEORecommendations,
} from "../src/lib/seo-analyzer";

async function calculateAllSEOScores() {
  console.log("🚀 SEO skorlama sistemi başlatılıyor...\n");

  try {
    // Tüm yayınlanmış makaleleri al (limit yok)
    const articles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
      orderBy: {
        createdAt: "desc", // En yeniden eskiye
      },
    });

    console.log(`📊 Toplam ${articles.length} makale bulundu\n`);

    let successCount = 0;
    let errorCount = 0;

    // Her makale için SEO analizi yap
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const progress = `[${i + 1}/${articles.length}]`;

      try {
        console.log(
          `${progress} Analiz ediliyor: ${article.title.substring(0, 50)}...`,
        );

        // SEO analizi yap
        const analysis = await analyzeArticleSEO(article.id);

        // Önerileri kaydet
        if (analysis.recommendations.length > 0) {
          await saveSEORecommendations(article.id, analysis.recommendations);
        }

        console.log(`  ✅ SEO Skoru: ${analysis.score}/100`);
        console.log(
          `  📝 ${analysis.recommendations.length} öneri kaydedildi\n`,
        );

        successCount++;

        // Rate limiting için kısa bekleme
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `  ❌ Hata: ${error instanceof Error ? error.message : "Bilinmeyen hata"}\n`,
        );
        errorCount++;
      }
    }

    // Özet istatistikler
    console.log("\n" + "=".repeat(60));
    console.log("📊 SEO Skorlama Özeti");
    console.log("=".repeat(60));
    console.log(`✅ Başarılı: ${successCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log(`📈 Toplam: ${articles.length}`);

    // Ortalama SEO skoru
    const avgScore = await db.article.aggregate({
      where: { status: "PUBLISHED" },
      _avg: { seoScore: true },
    });

    console.log(
      `\n📊 Ortalama SEO Skoru: ${avgScore._avg.seoScore?.toFixed(1) || 0}/100`,
    );

    // Skor dağılımı
    const scoreDistribution = await db.$queryRaw<
      Array<{ range: string; count: bigint }>
    >`
      SELECT 
        CASE 
          WHEN "seoScore" >= 90 THEN '90-100 (Mükemmel)'
          WHEN "seoScore" >= 80 THEN '80-89 (İyi)'
          WHEN "seoScore" >= 70 THEN '70-79 (Orta)'
          WHEN "seoScore" >= 60 THEN '60-69 (Zayıf)'
          ELSE '0-59 (Kötü)'
        END as range,
        COUNT(*) as count
      FROM "Article"
      WHERE status = 'PUBLISHED'
      GROUP BY range
      ORDER BY range DESC
    `;

    console.log("\n📊 Skor Dağılımı:");
    scoreDistribution.forEach((dist: { range: string; count: bigint }) => {
      console.log(`  ${dist.range}: ${dist.count} makale`);
    });

    // En düşük skorlu makaleler
    const lowestScores = await db.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        title: true,
        seoScore: true,
        slug: true,
      },
      orderBy: { seoScore: "asc" },
      take: 5,
    });

    console.log("\n⚠️ En Düşük SEO Skorlu Makaleler:");
    lowestScores.forEach(
      (
        article: { title: string; seoScore: number | null; slug: string },
        index: number,
      ) => {
        console.log(
          `  ${index + 1}. ${article.title.substring(0, 50)}... (${article.seoScore ?? 0}/100)`,
        );
      },
    );

    // Toplam öneri sayısı
    const totalRecommendations = await db.sEORecommendation.count({
      where: { isResolved: false },
    });

    console.log(`\n📝 Toplam Aktif Öneri: ${totalRecommendations}`);

    // Öneri türlerine göre dağılım
    const recommendationsByType = await db.$queryRaw<
      Array<{ type: string; count: bigint }>
    >`
      SELECT type, COUNT(*) as count
      FROM "SEORecommendation"
      WHERE "isResolved" = false
      GROUP BY type
      ORDER BY count DESC
    `;

    console.log("\n📊 Öneri Türleri:");
    recommendationsByType.forEach((rec: { type: string; count: bigint }) => {
      console.log(`  ${rec.type}: ${rec.count} öneri`);
    });

    console.log("\n✅ SEO skorlama sistemi başarıyla tamamlandı!");
  } catch (error) {
    console.error("\n❌ Kritik hata:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Script'i çalıştır
calculateAllSEOScores();
