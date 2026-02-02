/**
 * Apply Visitor Real-Time Indexes
 *
 * This script applies the recommended composite indexes for real-time visitor tracking.
 * Run this after reviewing the SQL script: scripts/add-visitor-realtime-indexes.sql
 *
 * Usage:
 *   npx tsx scripts/apply-visitor-indexes.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function applyVisitorIndexes() {
  console.log("🚀 Applying Visitor Real-Time Indexes...\n");

  try {
    // 1. Create composite index: Country + Last Activity
    console.log("📊 Creating index: Visitor_country_lastActivity_idx");
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Visitor_country_lastActivity_idx"
      ON "Visitor"("country", "lastActivity" DESC)
      WHERE "country" IS NOT NULL;
    `);
    console.log("✅ Index created: Visitor_country_lastActivity_idx\n");

    // 2. Create composite index: City + Last Activity
    console.log("📊 Creating index: Visitor_city_lastActivity_idx");
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Visitor_city_lastActivity_idx"
      ON "Visitor"("city", "lastActivity" DESC)
      WHERE "city" IS NOT NULL;
    `);
    console.log("✅ Index created: Visitor_city_lastActivity_idx\n");

    // 3. Create composite index: ISP + Last Activity (optional)
    console.log("📊 Creating index: Visitor_isp_lastActivity_idx");
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Visitor_isp_lastActivity_idx"
      ON "Visitor"("isp", "lastActivity" DESC)
      WHERE "isp" IS NOT NULL;
    `);
    console.log("✅ Index created: Visitor_isp_lastActivity_idx\n");

    // 4. Update table statistics
    console.log("📊 Updating table statistics...");
    await prisma.$executeRawUnsafe(`ANALYZE "Visitor";`);
    console.log("✅ Statistics updated\n");

    // 5. Verify indexes
    console.log("🔍 Verifying indexes...");
    const indexes = await prisma.$queryRaw<
      Array<{
        indexname: string;
        indexdef: string;
      }>
    >`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'Visitor'
        AND indexname IN (
          'Visitor_country_lastActivity_idx',
          'Visitor_city_lastActivity_idx',
          'Visitor_isp_lastActivity_idx'
        )
      ORDER BY indexname;
    `;

    console.log("\n📋 Created Indexes:");
    indexes.forEach((idx) => {
      console.log(`  ✅ ${idx.indexname}`);
    });

    // 6. Check index sizes
    console.log("\n📊 Index Sizes:");
    const sizes = await prisma.$queryRaw<
      Array<{
        indexname: string;
        index_size: string;
      }>
    >`
      SELECT
        indexrelname as indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE tablename = 'Visitor'
        AND indexrelname IN (
          'Visitor_country_lastActivity_idx',
          'Visitor_city_lastActivity_idx',
          'Visitor_isp_lastActivity_idx'
        )
      ORDER BY indexrelname;
    `;

    sizes.forEach((size) => {
      console.log(`  ${size.indexname}: ${size.index_size}`);
    });

    console.log("\n✅ All indexes applied successfully!");
    console.log("\n📝 Next Steps:");
    console.log("  1. Monitor index usage for 24 hours");
    console.log("  2. Run: npx tsx scripts/verify-visitor-indexes.ts");
    console.log("  3. Check query performance improvements");
    console.log("  4. Schedule weekly VACUUM ANALYZE\n");
  } catch (error) {
    console.error("❌ Error applying indexes:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
applyVisitorIndexes()
  .then(() => {
    console.log("🎉 Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
