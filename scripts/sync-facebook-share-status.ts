/**
 * Facebook Paylaşım Durumu Senkronizasyonu
 *
 * Bu script Facebook Page'deki postları kontrol eder ve
 * veritabanındaki facebookShared durumunu günceller.
 *
 * KULLANIM:
 * DATABASE_URL="postgresql://postgres:518518Erkan@77.42.68.4:5435/postgresainewsdb" npm run sync:facebook
 */

import { PrismaClient } from "@prisma/client";

// Production database için Prisma client
const db = new PrismaClient();

const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

interface FacebookPost {
  id: string;
  message: string;
  link?: string;
  created_time: string;
}

async function fetchFacebookPosts(): Promise<FacebookPost[]> {
  if (!FACEBOOK_PAGE_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) {
    throw new Error("Facebook API credentials not configured");
  }

  console.log("📡 Facebook Page postları çekiliyor...");

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/feed?fields=id,message,created_time&limit=100&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Facebook API Error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function syncFacebookShareStatus() {
  try {
    console.log(
      "🚀 Facebook paylaşım durumu senkronizasyonu başlatılıyor...\n",
    );

    // 1. Tüm PUBLISHED haberleri al
    const articles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        facebookShared: true,
      },
    });

    console.log(`📰 Toplam ${articles.length} yayında haber bulundu\n`);

    // 2. Facebook postlarını çek
    const facebookPosts = await fetchFacebookPosts();
    console.log(`📱 Facebook'tan ${facebookPosts.length} post çekildi\n`);

    // 3. Her haber için kontrol et
    let updatedCount = 0;
    let alreadyMarkedCount = 0;
    let notSharedCount = 0;

    for (const article of articles) {
      const articleUrl = `${SITE_URL}/news/${article.slug}`;

      // Facebook postlarında bu haberin linkini ara
      const isSharedOnFacebook = facebookPosts.some((post) => {
        // Link direkt eşleşiyor mu?
        if (post.link && post.link.includes(article.slug)) {
          return true;
        }

        // Message içinde link var mı?
        if (post.message && post.message.includes(articleUrl)) {
          return true;
        }

        // Title eşleşiyor mu? (message içinde)
        if (post.message && post.message.includes(article.title)) {
          return true;
        }

        return false;
      });

      // Veritabanı durumu ile Facebook durumu farklı mı?
      if (isSharedOnFacebook && !article.facebookShared) {
        // Facebook'ta var ama DB'de işaretli değil → Güncelle
        await db.article.update({
          where: { id: article.id },
          data: { facebookShared: true },
        });

        console.log(`✅ Güncellendi: "${article.title.substring(0, 60)}..."`);
        updatedCount++;
      } else if (isSharedOnFacebook && article.facebookShared) {
        // Zaten doğru işaretlenmiş
        alreadyMarkedCount++;
      } else if (!isSharedOnFacebook && !article.facebookShared) {
        // Paylaşılmamış ve DB'de de işaretli değil (doğru durum)
        notSharedCount++;
      } else if (!isSharedOnFacebook && article.facebookShared) {
        // DB'de işaretli ama Facebook'ta yok (muhtemelen silinmiş)
        console.log(
          `⚠️  Uyarı: "${article.title.substring(0, 60)}..." DB'de paylaşıldı olarak işaretli ama Facebook'ta bulunamadı`,
        );
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 SONUÇ RAPORU");
    console.log("=".repeat(60));
    console.log(`✅ Güncellenen haberler: ${updatedCount}`);
    console.log(`✓  Zaten doğru işaretlenmiş: ${alreadyMarkedCount}`);
    console.log(`○  Paylaşılmamış haberler: ${notSharedCount}`);
    console.log(`📰 Toplam kontrol edilen: ${articles.length}`);
    console.log("=".repeat(60) + "\n");

    if (updatedCount > 0) {
      console.log(
        `🎉 ${updatedCount} haberin Facebook paylaşım durumu güncellendi!`,
      );
    } else {
      console.log("✨ Tüm haberler zaten doğru durumda!");
    }
  } catch (error) {
    console.error("❌ Hata:", error);
    process.exit(1);
  }
}

// Script'i çalıştır
syncFacebookShareStatus()
  .then(() => {
    console.log("\n✅ Senkronizasyon tamamlandı!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Senkronizasyon başarısız:", error);
    process.exit(1);
  });
