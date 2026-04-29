/**
 * Search Provider Metric Migration Script
 *
 * Bu script:
 * 1. Prisma schema'yı kontrol eder
 * 2. Migration oluşturur
 * 3. Database'e uygular
 * 4. Test verisi ekler (opsiyonel)
 *
 * Kullanım:
 * ```bash
 * # Migration oluştur ve uygula
 * npx tsx scripts/apply-search-provider-migration.ts
 *
 * # Test verisi ile
 * npx tsx scripts/apply-search-provider-migration.ts --with-test-data
 * ```
 */

import { execSync } from "child_process";
import { db } from "../src/lib/db";

async function main() {
  const args = process.argv.slice(2);
  const withTestData = args.includes("--with-test-data");

  console.log("🚀 Search Provider Metric Migration başlatılıyor...\n");

  try {
    // Step 1: Prisma schema kontrolü
    console.log("📋 Step 1: Prisma schema kontrol ediliyor...");
    const schemaContent = require("fs").readFileSync(
      "prisma/schema.prisma",
      "utf-8",
    );

    if (!schemaContent.includes("model SearchProviderMetric")) {
      console.error("❌ SearchProviderMetric modeli schema'da bulunamadı!");
      console.log(
        "   Lütfen önce prisma/schema.prisma dosyasına modeli ekleyin.",
      );
      process.exit(1);
    }

    console.log("✅ SearchProviderMetric modeli schema'da mevcut\n");

    // Step 2: Migration oluştur
    console.log("📋 Step 2: Migration oluşturuluyor...");
    try {
      execSync(
        "npx prisma migrate dev --name add_search_provider_metric --create-only",
        { stdio: "inherit" },
      );
      console.log("✅ Migration dosyası oluşturuldu\n");
    } catch (error) {
      console.log("⚠️ Migration zaten mevcut veya oluşturulamadı\n");
    }

    // Step 3: Migration uygula
    console.log("📋 Step 3: Migration database'e uygulanıyor...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Migration başarıyla uygulandı\n");

    // Step 4: Prisma Client yeniden oluştur
    console.log("📋 Step 4: Prisma Client yeniden oluşturuluyor...");
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("✅ Prisma Client güncellendi\n");

    // Step 5: Test verisi ekle (opsiyonel)
    if (withTestData) {
      console.log("📋 Step 5: Test verisi ekleniyor...");
      await addTestData();
      console.log("✅ Test verisi eklendi\n");
    }

    // Step 6: Verification
    console.log("📋 Step 6: Verification yapılıyor...");
    const count = await db.searchProviderMetric.count();
    console.log(
      `✅ SearchProviderMetric tablosu erişilebilir (${count} kayıt)\n`,
    );

    console.log("🎉 Migration başarıyla tamamlandı!\n");
    console.log("📝 Sonraki adımlar:");
    console.log("   1. Cron job'u aktive edin (vercel.json)");
    console.log("   2. Frontend monitoring sayfasını güncelleyin");
    console.log("   3. Test edin: npm run test:search-providers\n");
  } catch (error: any) {
    console.error("❌ Migration hatası:", error.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

/**
 * Test verisi ekle
 * Son 24 saat için örnek metrikler oluşturur
 */
async function addTestData() {
  const now = new Date();
  const testData = [];

  // Son 24 saat için her saat bir kayıt
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);

    // Brave
    testData.push({
      provider: "brave",
      timestamp,
      requests: Math.floor(Math.random() * 10) + 1, // 1-10
      errors: Math.floor(Math.random() * 2), // 0-1
      available: Math.random() > 0.1, // 90% available
      avgResponseTime: Math.random() * 500 + 100, // 100-600ms
    });

    // Tavily
    testData.push({
      provider: "tavily",
      timestamp,
      requests: Math.floor(Math.random() * 10) + 1,
      errors: Math.floor(Math.random() * 2),
      available: Math.random() > 0.1,
      avgResponseTime: Math.random() * 500 + 100,
    });

    // Google News (primary, daha fazla request)
    testData.push({
      provider: "google-news",
      timestamp,
      requests: Math.floor(Math.random() * 50) + 20, // 20-70
      errors: Math.floor(Math.random() * 3), // 0-2
      available: Math.random() > 0.05, // 95% available
      avgResponseTime: Math.random() * 300 + 50, // 50-350ms
    });
  }

  await db.searchProviderMetric.createMany({
    data: testData,
  });

  console.log(`   ${testData.length} test kaydı eklendi`);
}

main();
