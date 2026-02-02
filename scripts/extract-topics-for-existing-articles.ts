/**
 * Background Job: Extract topics for existing articles
 *
 * Usage:
 *   npx tsx scripts/extract-topics-for-existing-articles.ts
 *   npx tsx scripts/extract-topics-for-existing-articles.ts --limit 500
 *   npx tsx scripts/extract-topics-for-existing-articles.ts --all
 */

import { extractTopicsForExistingArticles } from "@/services/topic-extraction.service";
import { db } from "@/lib/db";

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const allFlag = args.includes("--all");

  let limit = 100; // Default

  if (allFlag) {
    // Get total count
    const total = await db.article.count({
      where: {
        topic: null,
        status: "PUBLISHED",
      },
    });
    limit = total;
    console.log(`🔄 ALL mode: Processing all ${total} articles`);
  } else if (limitArg) {
    limit = parseInt(limitArg.split("=")[1]);
    console.log(`🔄 Processing ${limit} articles`);
  } else {
    console.log(`🔄 Processing ${limit} articles (default)`);
    console.log(`   Use --limit=N to process N articles`);
    console.log(`   Use --all to process all articles`);
  }

  const startTime = Date.now();

  const result = await extractTopicsForExistingArticles(limit);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ TOPIC EXTRACTION COMPLETED`);
  console.log(`${"=".repeat(60)}`);
  console.log(`   Processed: ${result.processed}`);
  console.log(`   Failed: ${result.failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(
    `   Rate: ${(result.processed / parseFloat(duration)).toFixed(1)} articles/sec`,
  );
  console.log(`${"=".repeat(60)}\n`);

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
