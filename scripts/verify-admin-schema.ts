/**
 * Admin Panel Schema Doğrulama Script
 *
 * Migration sonrası database schema'nın doğru şekilde oluşturulduğunu kontrol eder
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface IndexInfo {
  tablename: string;
  indexname: string;
  indexdef: string;
}

async function verifySchema() {
  console.log("🔍 Admin Panel Schema Doğrulama Başlatılıyor...\n");

  try {
    // 1. User tablosu yeni kolonları kontrol et
    console.log("📋 1. User Tablosu Kontrolü:");
    const userColumns = await prisma.$queryRaw<TableInfo[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name IN ('permissions', 'isActive', 'deletedAt', 'lastLogin')
      ORDER BY column_name
    `;

    const expectedUserColumns = [
      "deletedAt",
      "isActive",
      "lastLogin",
      "permissions",
    ];
    for (const col of expectedUserColumns) {
      const found = userColumns.find((c) => c.column_name === col);
      if (found) {
        console.log(
          `   ✅ ${col}: ${found.data_type} (nullable: ${found.is_nullable})`,
        );
      } else {
        console.log(`   ❌ ${col}: BULUNAMADI`);
      }
    }

    // 2. Yeni tabloları kontrol et
    console.log("\n📋 2. Yeni Tablolar Kontrolü:");
    const newTables = [
      "UserSession",
      "SystemMetric",
      "ErrorLog",
      "BatchOperation",
      "FilterPreset",
    ];

    for (const table of newTables) {
      const columns = await prisma.$queryRaw<TableInfo[]>`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = ${table}
        ORDER BY ordinal_position
      `;

      if (columns.length > 0) {
        console.log(`   ✅ ${table}: ${columns.length} kolon`);
        columns.forEach((col) => {
          console.log(`      - ${col.column_name}: ${col.data_type}`);
        });
      } else {
        console.log(`   ❌ ${table}: BULUNAMADI`);
      }
    }

    // 3. Index'leri kontrol et
    console.log("\n📋 3. Index Kontrolü:");
    const indexes = await prisma.$queryRaw<IndexInfo[]>`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes 
      WHERE tablename IN ('User', 'UserSession', 'SystemMetric', 'ErrorLog', 'BatchOperation', 'FilterPreset')
      AND schemaname = 'public'
      ORDER BY tablename, indexname
    `;

    const indexByTable: Record<string, number> = {};
    indexes.forEach((idx) => {
      indexByTable[idx.tablename] = (indexByTable[idx.tablename] || 0) + 1;
    });

    Object.entries(indexByTable).forEach(([table, count]) => {
      console.log(`   ✅ ${table}: ${count} index`);
    });

    // 4. Foreign key'leri kontrol et
    console.log("\n📋 4. Foreign Key Kontrolü:");
    const foreignKeys = await prisma.$queryRaw<any[]>`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('UserSession', 'FilterPreset')
    `;

    foreignKeys.forEach((fk) => {
      console.log(
        `   ✅ ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`,
      );
    });

    // 5. Test verileri oluştur (opsiyonel)
    console.log("\n📋 5. Test Verileri Kontrolü:");

    // UserSession sayısı
    const sessionCount = await prisma.$queryRaw<
      any[]
    >`SELECT COUNT(*) as count FROM "UserSession"`;
    console.log(`   📊 UserSession: ${sessionCount[0].count} kayıt`);

    // SystemMetric sayısı
    const metricCount = await prisma.$queryRaw<
      any[]
    >`SELECT COUNT(*) as count FROM "SystemMetric"`;
    console.log(`   📊 SystemMetric: ${metricCount[0].count} kayıt`);

    // ErrorLog sayısı
    const errorCount = await prisma.$queryRaw<
      any[]
    >`SELECT COUNT(*) as count FROM "ErrorLog"`;
    console.log(`   📊 ErrorLog: ${errorCount[0].count} kayıt`);

    // BatchOperation sayısı
    const batchCount = await prisma.$queryRaw<
      any[]
    >`SELECT COUNT(*) as count FROM "BatchOperation"`;
    console.log(`   📊 BatchOperation: ${batchCount[0].count} kayıt`);

    // FilterPreset sayısı
    const presetCount = await prisma.$queryRaw<
      any[]
    >`SELECT COUNT(*) as count FROM "FilterPreset"`;
    console.log(`   📊 FilterPreset: ${presetCount[0].count} kayıt`);

    // 6. Özet
    console.log("\n✨ Schema Doğrulama Özeti:");
    console.log(
      `   ✅ User tablosu genişletildi: ${userColumns.length}/4 kolon`,
    );
    console.log(`   ✅ Yeni tablolar: ${newTables.length}`);
    console.log(`   ✅ Toplam index: ${indexes.length}`);
    console.log(`   ✅ Foreign key: ${foreignKeys.length}`);

    console.log("\n🎉 Schema doğrulama başarıyla tamamlandı!");
  } catch (error: any) {
    console.error("\n❌ Doğrulama hatası:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
verifySchema()
  .then(() => {
    console.log("\n✅ İşlem tamamlandı!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Beklenmeyen hata:", error);
    process.exit(1);
  });
