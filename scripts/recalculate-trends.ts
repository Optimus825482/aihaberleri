import { bulkRecalculateTrends } from "@/lib/trend-service";
import { db } from "@/lib/db";

async function main() {
  console.log(
    "🚀 Initializing specific one-time trend recalculation (Last 24h)...",
  );

  try {
    // Process articles from the last 24 hours
    await bulkRecalculateTrends(24);

    console.log("✅ Trend recalculation completed successfully.");
  } catch (error) {
    console.error("❌ Recalculation script failed:", error);
    // Don't exit with error to avoid blocking deployment flow
    process.exit(0);
  } finally {
    // Disconnect Prisma
    if (db) {
      await db.$disconnect();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(0);
});
