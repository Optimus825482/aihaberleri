/**
 * Migration Script: Eski sosyal medya paylaşımlarını SocialShare tablosuna aktar
 *
 * Bu script:
 * 1. facebookShared=true olan makaleleri FACEBOOK + tr olarak işaretler
 * 2. facebookSharedEn=true olan makaleleri FACEBOOK + en olarak işaretler
 *
 * Kullanım: npx ts-node scripts/migrate-social-shares.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateSocialShares() {
  console.log("🔄 Eski sosyal medya paylaşımları migrate ediliyor...\n");

  // 1. Facebook TR - facebookShared=true olanlar
  const facebookTRArticles = await prisma.article.findMany({
    where: {
      facebookShared: true,
      status: "PUBLISHED",
    },
    select: { id: true, slug: true, publishedAt: true },
  });

  console.log(`📘 Facebook TR: ${facebookTRArticles.length} makale bulundu`);

  let facebookTRCreated = 0;
  let facebookTRSkipped = 0;

  // Batch upsert için hazırla
  for (let i = 0; i < facebookTRArticles.length; i++) {
    const article = facebookTRArticles[i];
    if (i % 100 === 0)
      console.log(`   İşleniyor: ${i}/${facebookTRArticles.length}`);
    try {
      await prisma.socialShare.upsert({
        where: {
          articleId_platform_language: {
            articleId: article.id,
            platform: "FACEBOOK",
            language: "tr",
          },
        },
        create: {
          articleId: article.id,
          platform: "FACEBOOK",
          language: "tr",
          status: "SHARED",
          sharedAt: article.publishedAt || new Date(),
          postId: "migrated-from-legacy",
        },
        update: {}, // Zaten varsa dokunma
      });
      facebookTRCreated++;
    } catch (e) {
      facebookTRSkipped++;
    }
  }

  console.log(
    `   ✅ Oluşturuldu: ${facebookTRCreated}, ⏭️ Zaten var: ${facebookTRSkipped}`,
  );

  // 2. Facebook EN - facebookSharedEn=true olanlar
  const facebookENArticles = await prisma.article.findMany({
    where: {
      facebookSharedEn: true,
      status: "PUBLISHED",
    },
    select: { id: true, slug: true, publishedAt: true },
  });

  console.log(`\n📘 Facebook EN: ${facebookENArticles.length} makale bulundu`);

  let facebookENCreated = 0;
  let facebookENSkipped = 0;

  for (const article of facebookENArticles) {
    try {
      await prisma.socialShare.upsert({
        where: {
          articleId_platform_language: {
            articleId: article.id,
            platform: "FACEBOOK",
            language: "en",
          },
        },
        create: {
          articleId: article.id,
          platform: "FACEBOOK",
          language: "en",
          status: "SHARED",
          sharedAt: article.publishedAt || new Date(),
          postId: "migrated-from-legacy",
        },
        update: {},
      });
      facebookENCreated++;
    } catch (e) {
      facebookENSkipped++;
    }
  }

  console.log(
    `   ✅ Oluşturuldu: ${facebookENCreated}, ⏭️ Zaten var: ${facebookENSkipped}`,
  );

  // 3. Twitter TR - Tüm PUBLISHED makaleleri Twitter paylaşıldı olarak işaretle
  // (Çünkü eski sistem her makaleyi tweet atıyordu)
  const publishedArticles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: { id: true, publishedAt: true },
  });

  console.log(
    `\n🐦 Twitter TR: ${publishedArticles.length} makale bulundu (tüm PUBLISHED)`,
  );

  let twitterTRCreated = 0;
  let twitterTRSkipped = 0;

  for (const article of publishedArticles) {
    try {
      await prisma.socialShare.upsert({
        where: {
          articleId_platform_language: {
            articleId: article.id,
            platform: "TWITTER",
            language: "tr",
          },
        },
        create: {
          articleId: article.id,
          platform: "TWITTER",
          language: "tr",
          status: "SHARED",
          sharedAt: article.publishedAt || new Date(),
          postId: "migrated-from-legacy",
        },
        update: {},
      });
      twitterTRCreated++;
    } catch (e) {
      twitterTRSkipped++;
    }
  }

  console.log(
    `   ✅ Oluşturuldu: ${twitterTRCreated}, ⏭️ Zaten var: ${twitterTRSkipped}`,
  );

  // Özet
  console.log("\n" + "=".repeat(50));
  console.log("📊 MİGRASYON ÖZETI:");
  console.log("=".repeat(50));
  console.log(`   Facebook TR: ${facebookTRCreated} yeni kayıt`);
  console.log(`   Facebook EN: ${facebookENCreated} yeni kayıt`);
  console.log(`   Twitter TR:  ${twitterTRCreated} yeni kayıt`);
  console.log("=".repeat(50));
  console.log("\n⚠️  NOT: Bluesky, Mastodon, Tumblr için eski kayıtlar yok.");
  console.log(
    "   Bu platformlarda sadece birkaç haber paylaşılmış (3-8 adet).",
  );
  console.log(
    "   Bunları manuel olarak admin panelinden işaretleyebilirsiniz.",
  );
  console.log("\n✅ Migrasyon tamamlandı!");
}

migrateSocialShares()
  .catch((e) => {
    console.error("❌ Migrasyon hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
