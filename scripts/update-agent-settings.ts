/**
 * Update agent settings to user requirements
 *
 * User requirement: 1 article per run, every 15 minutes
 */

import { db } from "@/lib/db";

async function updateAgentSettings() {
  console.log("🔧 Updating agent settings...\n");

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

  console.log("\n✅ Agent settings updated successfully!");
  console.log("\n📊 Summary:");
  console.log("━".repeat(60));
  console.log("• Agent enabled: YES");
  console.log("• Articles per run: 1");
  console.log("• Interval: 15 minutes (0.25 hours)");
  console.log("• Next run: Will be calculated after first execution");

  await db.$disconnect();
}

updateAgentSettings().catch(console.error);
