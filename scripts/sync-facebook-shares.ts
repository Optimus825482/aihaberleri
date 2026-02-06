/**
 * Facebook paylaşımlarını Article tablosundan SocialShare tablosuna senkronize et
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Facebook paylaşımlarını senkronize ediliyor...\n");

  // Article tablosunda facebookShared=true olan ancak SocialShare kaydı olmayan haberleri bul
  const sharedArticles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      facebookShared: true,
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });

  console.log(
    `📊 Articles tablosunda ${sharedArticles.length} Facebook paylaşımı bulundu\n`,
  );

  // SocialShare tablosunda mevcut kayıtları kontrol et
  const existingShares = await prisma.socialShare.findMany({
    where: {
      platform: "FACEBOOK",
    },
    select: {
      articleId: true,
    },
  });

  const existingArticleIds = new Set(existingShares.map((s) => s.articleId));
  console.log(
    `📊 SocialShare tablosunda ${existingShares.length} FACEBOOK kaydı mevcut\n`,
  );

  // Eksik kayıtları oluştur
  const missingShares = sharedArticles.filter(
    (article) => !existingArticleIds.has(article.id),
  );

  console.log(`🔍 ${missingShares.length} eksik SocialShare kaydı bulundu\n`);

  if (missingShares.length > 0) {
    // Toplu oluştur
    const createData = missingShares.map((article) => ({
      articleId: article.id,
      platform: "FACEBOOK" as const,
      status: "SHARED" as const,
      postUrl: null,
      sharedAt: article.updatedAt,
    }));

    const result = await prisma.socialShare.createMany({
      data: createData,
      skipDuplicates: true,
    });

    console.log(`✅ ${result.count} SocialShare kaydı oluşturuldu\n`);
  }

  // İstatistikleri göster
  const stats = await prisma.socialShare.groupBy({
    by: ["platform", "status"],
    _count: { id: true },
  });

  console.log("\n📈 SocialShare İstatistikleri:");
  stats.forEach((s) => {
    console.log(`   ${s.platform} - ${s.status}: ${s._count.id}`);
  });

  const totalPublished = await prisma.article.count({
    where: { status: "PUBLISHED" },
  });

  const facebookSharedCount = await prisma.socialShare.count({
    where: { platform: "FACEBOOK", status: "SHARED" },
  });

  console.log(`\n📊 Özet:`);
  console.log(`   Toplam yayınlanan haber: ${totalPublished}`);
  console.log(`   Facebook'ta paylaşılan: ${facebookSharedCount}`);
  console.log(`   Paylaşılmayan: ${totalPublished - facebookSharedCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
