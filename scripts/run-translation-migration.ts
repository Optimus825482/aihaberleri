import { migrateExistingArticles } from "../src/lib/translation";
import { db } from "../src/lib/db";

async function main() {
  console.log("🚀 Starting translation migration for existing articles...");

  try {
    // Check connection
    const count = await db.article.count();
    console.log(`📊 Connected to database. Total articles: ${count}`);

    // Start migration
    await migrateExistingArticles();

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
