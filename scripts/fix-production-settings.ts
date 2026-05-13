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

const productionDbUrl = process.env.DATABASE_URL;

if (!productionDbUrl) {
  throw new Error("DATABASE_URL is required");
}

const db = new PrismaClient({
  datasources: {
    db: {
      url: productionDbUrl,
    },
  },
});

async function fixProductionSettings() {
  console.log("🔧 Fixing production agent settings...\n");
  console.log("📍 Database: DATABASE_URL\n");

  try {
    // Check current settings
    console.log("🔍 Current settings:");
    console.log("━".repeat(60));

    const currentSettings = await db.setting.findMany({
      where: {
        key: {
          in: [
            "agent.enabled",
            "agent.articlesPerRun",
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
      { key: "agent.articlesPerRun", value: "1" },
      { key: "agent.intervalHours", value: "0.25" },
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
    console.log("• Articles per run: 1");
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
