/**
 * Fix production agent settings
 *
 * CRITICAL FIX:
 * 1. Agent publishing 3 articles instead of 1
 * 2. Non-AI articles being published
 *
 * This script updates production database settings
 */

import { PrismaClient } from "@prisma/client";

// Production database URL
const PRODUCTION_DB_URL =
  "postgresql://postgres:518518Erkan@77.42.68.4:5435/postgresainewsdb";

const db = new PrismaClient({
  datasources: {
    db: {
      url: PRODUCTION_DB_URL,
    },
  },
});

async function fixProductionSettings() {
  console.log("🔧 Fixing production agent settings...\n");
  console.log("📍 Database: 77.42.68.4:5435/postgresainewsdb\n");

  try {
    // Check current settings
    console.log("🔍 Current settings:");
    console.log("━".repeat(60));

    const currentSettings = await db.setting.findMany({
      where: {
        key: {
          in: [
            "agent.enabled",
            "agent.minArticles",
            "agent.maxArticles",
            "agent.intervalHours",
          ],
        },
      },
    });

    for (const setting of currentSettings) {
      console.log(`${setting.key.padEnd(25)} = ${setting.value}`);
    }

    if (currentSettings.length === 0) {
      console.log("⚠️  No settings found in database!");
    }

    console.log("\n🔧 Updating settings...");
    console.log("━".repeat(60));

    // Upsert settings
    const settings = [
      { key: "agent.enabled", value: "true" },
      { key: "agent.minArticles", value: "1" }, // ✅ FIX: 3 → 1
      { key: "agent.maxArticles", value: "1" }, // ✅ FIX: 5 → 1
      { key: "agent.intervalHours", value: "0.25" }, // ✅ 15 minutes
    ];

    for (const setting of settings) {
      await db.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value },
      });
      console.log(`✅ ${setting.key.padEnd(25)} = ${setting.value}`);
    }

    console.log("\n✅ Production settings updated successfully!");
    console.log("\n📊 Summary:");
    console.log("━".repeat(60));
    console.log("• Agent enabled: YES");
    console.log("• Articles per run: 1 (was: 3-5)");
    console.log("• Interval: 15 minutes (0.25 hours)");
    console.log("\n⚠️  IMPORTANT: Restart worker for changes to take effect!");
    console.log("   Command: docker restart <worker-container>");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

fixProductionSettings().catch(console.error);
