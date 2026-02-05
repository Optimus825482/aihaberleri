/**
 * Tüm İngilizce haberleri IndexNow'a toplu gönder
 * Kullanım: npx tsx scripts/batch-indexnow-en.ts
 */

import { db } from "../src/lib/db";
import { submitUrlsToIndexNow } from "../src/lib/seo/indexnow";

async function main() {
  console.log("🌍 İngilizce haberler IndexNow'a gönderiliyor...\n");

  // Tüm EN çevirileri al
  const translations = await db.$queryRaw<{ id: string; slug: string }[]>`
    SELECT 
      a.id,
      at.slug
    FROM "Article" a
    JOIN "ArticleTranslation" at ON a.id = at."articleId" AND at.locale = 'en'
    WHERE a.status = 'PUBLISHED'
      AND (a."indexNowStatusEn" = 'PENDING' OR a."indexNowStatusEn" IS NULL)
  `;

  console.log(`📊 ${translations.length} haber bulundu\n`);

  if (translations.length === 0) {
    console.log("✅ Tüm haberler zaten gönderilmiş!");
    process.exit(0);
  }

  // URL'leri oluştur (/en/news/ prefix ile)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  const urls = translations.map((t) => `${baseUrl}/en/news/${t.slug}`);
  const ids = translations.map((t) => t.id);

  console.log(`🚀 ${urls.length} URL IndexNow'a gönderiliyor...`);
  console.log(`   Örnek: ${urls[0]}`);
  console.log(`   Örnek: ${urls[1]}`);
  console.log(`   Örnek: ${urls[2]}\n`);

  // Batch gönder (IndexNow 10,000 URL limit)
  const batchSize = 500;
  let successCount = 0;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batchUrls = urls.slice(i, i + batchSize);
    const batchIds = ids.slice(i, i + batchSize);

    console.log(
      `📤 Batch ${Math.floor(i / batchSize) + 1}: ${batchUrls.length} URL gönderiliyor...`,
    );

    try {
      const success = await submitUrlsToIndexNow(batchUrls);

      if (success) {
        // DB'yi raw SQL ile güncelle (Prisma schema sync sorunu için)
        const idList = batchIds.map((id) => `'${id}'`).join(",");
        await db.$executeRawUnsafe(`
          UPDATE "Article" 
          SET "indexNowStatusEn" = 'SUBMITTED'
          WHERE id IN (${idList})
        `);
        successCount += batchUrls.length;
        console.log(`   ✅ ${batchUrls.length} URL başarıyla gönderildi`);
      } else {
        console.log(`   ⚠️ Batch başarısız oldu`);
      }
    } catch (error: any) {
      console.error(`   ❌ Hata: ${error.message}`);
    }

    // Rate limit için bekle
    if (i + batchSize < urls.length) {
      console.log("   ⏳ 2 saniye bekleniyor...\n");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(
    `\n🏁 Tamamlandı! ${successCount}/${urls.length} URL gönderildi.`,
  );
  await db.$disconnect();
  process.exit(0);
}

main().catch(console.error);
