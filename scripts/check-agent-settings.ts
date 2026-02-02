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
          "agent.minArticles",
          "agent.maxArticles",
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
  console.log("agent.minArticles        = 1");
  console.log("agent.maxArticles        = 1");
  console.log("agent.intervalHours      = 0.25 (15 minutes)");

  // Check if settings need update
  const minArticles = settings.find((s) => s.key === "agent.minArticles");
  const maxArticles = settings.find((s) => s.key === "agent.maxArticles");
  const intervalHours = settings.find((s) => s.key === "agent.intervalHours");

  const needsUpdate =
    minArticles?.value !== "1" ||
    maxArticles?.value !== "1" ||
    intervalHours?.value !== "0.25";

  if (needsUpdate) {
    console.log("\n⚠️  Settings need update!");
    console.log("\nRun this SQL to fix:");
    console.log("━".repeat(60));
    console.log(
      `UPDATE "Setting" SET value = '1' WHERE key = 'agent.minArticles';`,
    );
    console.log(
      `UPDATE "Setting" SET value = '1' WHERE key = 'agent.maxArticles';`,
    );
    console.log(
      `UPDATE "Setting" SET value = '0.25' WHERE key = 'agent.intervalHours';`,
    );
  } else {
    console.log("\n✅ Settings are correct!");
  }

  await db.$disconnect();
}

checkAgentSettings().catch(console.error);
