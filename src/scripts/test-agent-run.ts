import { executeNewsAgent } from "../services/agent.service";
import { db } from "../lib/db";

async function main() {
  console.log("🚀 Manually triggering agent for testing...");

  // Update env settings for the running process if needed
  // (Assuming .env is loaded by tsx)

  try {
    const result = await executeNewsAgent();
    console.log("✅ Agent execution result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Agent execution failed:", error);
  } finally {
    await db.$disconnect();
  }
}

main();
