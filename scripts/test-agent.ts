/**
 * Script to test agent execution
 * Run with: npx tsx scripts/test-agent.ts
 */

import { executeNewsAgent } from "../src/services/agent.service";

async function testAgent() {
  console.log("🤖 Testing News Agent...\n");
  console.log("This will execute the full agent workflow:");
  console.log("1. Search for AI news");
  console.log("2. Analyze and select best articles");
  console.log("3. Rewrite content with DeepSeek");
  console.log("4. Fetch images");
  console.log("5. Publish articles\n");

  const startTime = Date.now();

  try {
    const result = await executeNewsAgent();

    const duration = Math.floor((Date.now() - startTime) / 1000);

    console.log("\n" + "=".repeat(60));
    console.log("📊 EXECUTION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Status: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);
    console.log(`Articles Scraped: ${result.articlesScraped}`);
    console.log(`Articles Created: ${result.articlesCreated}`);
    console.log(`Duration: ${duration}s`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors:`);
      result.errors.forEach((error) => console.log(`   - ${error}`));
    }

    if (result.publishedArticles.length > 0) {
      console.log(`\n📝 Published Articles:`);
      result.publishedArticles.forEach((article) => {
        console.log(`   - ${article.slug}`);
        console.log(
          `     URL: ${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/news/${article.slug}`,
        );
      });
    }

    console.log("=".repeat(60) + "\n");

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("\n❌ Agent execution failed:", error);
    process.exit(1);
  }
}

testAgent();
