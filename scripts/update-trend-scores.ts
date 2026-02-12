/**
 * Tüm makalelerin trend skorlarını içerik bazlı hesaplar ve günceller.
 * View/engagement verisi gerekmez — title, excerpt, publishedAt, source kullanır.
 *
 * Usage: npx tsx scripts/update-trend-scores.ts [--batch=100] [--dry-run]
 */

import { PrismaClient } from "@prisma/client";
import { calculateTrendScore } from "@/lib/trend-scoring";

const prisma = new PrismaClient();
const BATCH_SIZE = parseInt(
  process.argv.find((a) => a.startsWith("--batch="))?.split("=")[1] || "100",
);
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log("📊 Trend Skoru Güncelleme");
  console.log(`⚙️  Batch: ${BATCH_SIZE} | DryRun: ${DRY_RUN}`);
  console.log("=".repeat(60));

  const articles = await prisma.article.findMany({
    where: { language: "tr", status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      sourceUrl: true,
      slug: true,
      trendScore: true,
    },
    orderBy: { publishedAt: "desc" },
  });

  console.log(`📰 ${articles.length} makale bulundu\n`);

  let updated = 0;
  let trending = 0;
  let scoreDistribution = {
    low: 0,
    moderate: 0,
    popular: 0,
    trending: 0,
    viral: 0,
  };

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const updates: { id: string; score: number; isTrending: boolean }[] = [];

    for (const article of batch) {
      const breakdown = calculateTrendScore({
        title: article.title,
        description: article.excerpt || undefined,
        publishedAt: article.publishedAt,
        url: article.sourceUrl || undefined,
      });

      const score = breakdown.total;
      const isTrend = score >= 40;

      updates.push({ id: article.id, score, isTrending: isTrend });

      if (score <= 20) scoreDistribution.low++;
      else if (score <= 40) scoreDistribution.moderate++;
      else if (score <= 60) scoreDistribution.popular++;
      else if (score <= 80) scoreDistribution.trending++;
      else scoreDistribution.viral++;

      if (isTrend) trending++;
    }

    if (!DRY_RUN) {
      // Batch update with transaction
      await prisma.$transaction(
        updates.map((u) =>
          prisma.article.update({
            where: { id: u.id },
            data: {
              trendScore: u.score,
              isTrending: u.isTrending,
            },
          }),
        ),
      );
    }

    updated += batch.length;
    const pct = ((updated / articles.length) * 100).toFixed(1);
    process.stdout.write(`\r⏳ ${updated}/${articles.length} (${pct}%)`);
  }

  console.log(`\n\n${"=".repeat(60)}`);
  console.log("📊 SONUÇLAR:");
  console.log(`  Güncellenen: ${updated}`);
  console.log(`  Trending (>40): ${trending}`);
  console.log(`\n📈 Skor Dağılımı:`);
  console.log(`  0-20  (Düşük):    ${scoreDistribution.low}`);
  console.log(`  21-40 (Orta):     ${scoreDistribution.moderate}`);
  console.log(`  41-60 (Popüler):  ${scoreDistribution.popular}`);
  console.log(`  61-80 (Trending): ${scoreDistribution.trending}`);
  console.log(`  81-100 (Viral):   ${scoreDistribution.viral}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Fatal:", e.message);
  prisma.$disconnect();
  process.exit(1);
});
