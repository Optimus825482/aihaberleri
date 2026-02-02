/**
 * Apply Database Performance Optimizations
 * Executes SQL optimization script on production database
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:518518Erkan@77.42.68.4:5435/postgresainewsdb",
    },
  },
});

async function applyOptimizations() {
  console.log("🚀 APPLYING DATABASE OPTIMIZATIONS\n");
  console.log("=".repeat(80));

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, "optimize-db-performance.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    // Split by semicolon and filter out comments/empty lines
    const statements = sqlContent
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`\n📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith("--")) continue;

      // Extract first line for logging
      const firstLine = statement.split("\n")[0].substring(0, 80);

      try {
        console.log(
          `[${i + 1}/${statements.length}] Executing: ${firstLine}...`,
        );

        await prisma.$executeRawUnsafe(statement);

        console.log(`   ✅ Success\n`);
        successCount++;
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}\n`);
        errorCount++;

        // Continue with other statements even if one fails
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 OPTIMIZATION SUMMARY\n");
    console.log("=".repeat(80));
    console.log(`Total statements: ${statements.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log("=".repeat(80));

    if (errorCount === 0) {
      console.log("\n🎉 All optimizations applied successfully!");
    } else {
      console.log(
        `\n⚠️  ${errorCount} optimizations failed. Check errors above.`,
      );
    }

    // Run final ANALYZE
    console.log("\n📊 Running final ANALYZE...");
    await prisma.$executeRaw`ANALYZE;`;
    console.log("✅ ANALYZE complete\n");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run optimizations
applyOptimizations()
  .then(() => {
    console.log("✅ Database optimization completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Database optimization failed:", error);
    process.exit(1);
  });
