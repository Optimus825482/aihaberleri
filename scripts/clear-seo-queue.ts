/**
 * Clear SEO Queue Script
 *
 * SEO Optimization agent was removed from pipeline.
 * This script cleans up any remaining SEO jobs in Redis.
 *
 * Usage (on production server):
 * docker exec <container-id> npx tsx scripts/clear-seo-queue.ts
 */

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://aihaberleri-redis:6379";
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";

const SEO_QUEUE_NAMES = [
  "bull:seo-optimization:wait",
  "bull:seo-optimization:active",
  "bull:seo-optimization:completed",
  "bull:seo-optimization:failed",
  "bull:seo-optimization:delayed",
  "bull:seo-optimization:paused",
];

async function clearSEOQueue() {
  console.log("🧹 SEO Queue Temizleme Başlatılıyor...\n");

  const redis = new Redis(REDIS_URL, {
    password: REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  });

  try {
    for (const queueKey of SEO_QUEUE_NAMES) {
      console.log(`� Kontrol ediliyor: ${queueKey}`);

      // Check if queue exists
      const exists = await redis.exists(queueKey);
      if (!exists) {
        console.log(`   ⚠️ Queue bulunamadı: ${queueKey}\n`);
        continue;
      }

      // Get queue length
      const length = await redis.llen(queueKey);
      console.log(`   � Mevcut job sayısı: ${length}`);

      if (length > 0) {
        // Delete all jobs in queue
        await redis.del(queueKey);
        console.log(`   ✅ ${length} job temizlendi\n`);
      } else {
        console.log(`   ℹ️ Queue zaten boş\n`);
      }
    }

    // Also clean up any SEO-related keys
    console.log("🔍 SEO ile ilgili diğer key'ler aranıyor...");
    const seoKeys = await redis.keys("bull:seo-optimization:*");

    if (seoKeys.length > 0) {
      console.log(`   📋 ${seoKeys.length} ek key bulundu`);
      for (const key of seoKeys) {
        await redis.del(key);
      }
      console.log(`   ✅ Tüm SEO key'leri temizlendi\n`);
    } else {
      console.log(`   ℹ️ Ek key bulunamadı\n`);
    }

    console.log("✅ SEO queue'ları başarıyla temizlendi!");
    console.log(
      "\n📝 Not: Yeni job'lar artık doğrudan DATABASE_PUBLISHER'a gidecek.",
    );
  } catch (error) {
    console.error("❌ Hata oluştu:", error);
    throw error;
  } finally {
    await redis.quit();
  }
}

clearSEOQueue()
  .then(() => {
    console.log("\n✅ Script başarıyla tamamlandı");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script hatası:", error);
    process.exit(1);
  });
