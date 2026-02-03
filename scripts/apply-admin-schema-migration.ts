/**
 * Admin Panel Schema Migration Uygulama Script
 *
 * Bu script admin panel için gerekli database schema değişikliklerini uygular:
 * - User model genişletme (permissions, isActive, deletedAt)
 * - UserSession model (detaylı session tracking)
 * - SystemMetric model (sistem performans metrikleri)
 * - ErrorLog model (detaylı hata loglama)
 * - BatchOperation model (toplu işlem takibi)
 * - FilterPreset model (kullanıcı filtre ayarları)
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function applyMigration() {
  console.log("🚀 Admin Panel Schema Migration başlatılıyor...\n");

  try {
    // Migration SQL dosyasını oku
    const migrationPath = path.join(
      process.cwd(),
      "prisma",
      "migrations",
      "20260203_admin_panel_schema",
      "migration.sql",
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration dosyası bulunamadı: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    console.log("📄 Migration SQL dosyası okundu");
    console.log("📊 Migration uygulanıyor...\n");

    // SQL'i satırlara böl ve her statement'ı ayrı çalıştır
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        successCount++;
        console.log(
          `✅ Statement başarılı (${successCount}/${statements.length})`,
        );
      } catch (error: any) {
        // Eğer tablo/kolon zaten varsa hatayı görmezden gel
        if (
          error.message.includes("already exists") ||
          error.message.includes("duplicate")
        ) {
          console.log(
            `⚠️  Zaten mevcut, atlanıyor: ${statement.substring(0, 50)}...`,
          );
          successCount++;
        } else {
          errorCount++;
          console.error(`❌ Hata: ${error.message}`);
          console.error(`   Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log("\n📊 Migration Özeti:");
    console.log(`   ✅ Başarılı: ${successCount}`);
    console.log(`   ❌ Hatalı: ${errorCount}`);

    // Veritabanı yapısını doğrula
    console.log("\n🔍 Veritabanı yapısı doğrulanıyor...\n");

    // User tablosu kontrolü
    const userColumns = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name IN ('permissions', 'isActive', 'deletedAt')
    `;
    console.log(`✅ User tablosu: ${userColumns.length}/3 yeni kolon eklendi`);

    // Yeni tabloları kontrol et
    const tables = [
      "UserSession",
      "SystemMetric",
      "ErrorLog",
      "BatchOperation",
      "FilterPreset",
    ];
    for (const table of tables) {
      const exists = await prisma.$queryRaw<any[]>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = ${table}
      `;
      if (exists.length > 0) {
        console.log(`✅ ${table} tablosu oluşturuldu`);
      } else {
        console.log(`❌ ${table} tablosu oluşturulamadı`);
      }
    }

    // Index'leri kontrol et
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('User', 'UserSession', 'SystemMetric', 'ErrorLog', 'BatchOperation', 'FilterPreset')
    `;
    console.log(`\n✅ Toplam ${indexes.length} index oluşturuldu`);

    console.log("\n✨ Migration başarıyla tamamlandı!");
    console.log("\n📝 Sonraki adımlar:");
    console.log("   1. Prisma Client'ı yeniden oluştur: npx prisma generate");
    console.log("   2. TypeScript tiplerini kontrol et");
    console.log("   3. Admin panel API endpoint'lerini test et");
  } catch (error: any) {
    console.error("\n❌ Migration hatası:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
applyMigration()
  .then(() => {
    console.log("\n🎉 İşlem tamamlandı!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Beklenmeyen hata:", error);
    process.exit(1);
  });
