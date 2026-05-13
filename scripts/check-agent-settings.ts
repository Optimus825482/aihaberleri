/**
 * Check and update agent settings
 *
 * User requirement: 1 article per run, every 15 minutes
 */

import { db } from "@/lib/db";

async function checkAgentSettings() {
  console.log("🔍 Checking agent settings...\n");

  const settings = await db.setting.findMany({
    where: {
      key: {
        in: [
          "agent.enabled",
          "agent.articlesPerRun",
          "agent.intervalHours",
          "agent.lastRun",
          "agent.nextRun",
        ],
      },
    },
    orderBy: { key: "asc" },
  });

  console.log("📊 Current Settings:");
  console.log("━".repeat(60));

  for (const setting of settings) {
    console.log(`${setting.key.padEnd(25)} = ${setting.value}`);
  }

  console.log("\n📋 Required Settings (User: 1 article per 15 minutes):");
  console.log("━".repeat(60));
  console.log("agent.enabled            = true");
  console.log("agent.articlesPerRun    = 1");
  console.log("agent.intervalHours      = 0.25 (15 minutes)");

  // Check if settings need update
  const enabled = settings.find((s) => s.key === "agent.enabled");
  const articlesPerRun = settings.find((s) => s.key === "agent.articlesPerRun");
  const intervalHours = settings.find((s) => s.key === "agent.intervalHours");

  const needsUpdate =
    enabled?.value !== "true" ||
    articlesPerRun?.value !== "1" ||
    intervalHours?.value !== "0.25";

  if (needsUpdate) {
    console.log("\n⚠️  Settings need update!");
    console.log("\nRun this SQL to fix:");
    console.log("━".repeat(60));
    console.log(
      `INSERT INTO "Setting" (key, value) VALUES ('agent.enabled', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true';`,
    );
    console.log(
      `INSERT INTO "Setting" (key, value) VALUES ('agent.articlesPerRun', '1') ON CONFLICT (key) DO UPDATE SET value = '1';`,
    );
    console.log(
      `INSERT INTO "Setting" (key, value) VALUES ('agent.intervalHours', '0.25') ON CONFLICT (key) DO UPDATE SET value = '0.25';`,
    );
  } else {
    console.log("\n✅ Settings are correct!");
  }

  await db.$disconnect();
}

checkAgentSettings().catch(console.error);
