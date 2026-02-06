/**
 * Test script for Tumblr integration
 *
 * Usage:
 *   npx tsx scripts/test-tumblr.ts
 */

import "dotenv/config";
import {
  postToTumblr,
  isTumblrConfigured,
  getTumblrStatus,
} from "../src/lib/social/tumblr";

async function testTumblr() {
  console.log("📝 Tumblr Integration Test\n");
  console.log("=".repeat(50));

  // Check configuration
  const status = getTumblrStatus();
  console.log("\n📋 Configuration Status:");
  console.log(`   Enabled: ${status.enabled ? "✅ Yes" : "❌ No"}`);
  console.log(`   Configured: ${status.configured ? "✅ Yes" : "❌ No"}`);
  console.log(`   Blog: ${status.blogName || "Not set"}`);

  if (!status.configured) {
    console.log("\n❌ Tumblr is not configured!");
    console.log("\nRequired environment variables:");
    console.log("   TUMBLR_ENABLED=true");
    console.log("   TUMBLR_CONSUMER_KEY=your-consumer-key");
    console.log("   TUMBLR_CONSUMER_SECRET=your-consumer-secret");
    console.log("   TUMBLR_ACCESS_TOKEN=your-access-token");
    console.log("   TUMBLR_ACCESS_TOKEN_SECRET=your-access-token-secret");
    console.log("   TUMBLR_BLOG_NAME=yourblogname");
    process.exit(1);
  }

  if (!status.enabled) {
    console.log("\n⚠️ Tumblr is configured but disabled.");
    console.log("   Set TUMBLR_ENABLED=true to enable posting.");
    process.exit(0);
  }

  // Test post
  console.log("\n🧪 Sending test post...\n");

  const testArticle = {
    title: "🧪 Test: AI Haberleri Tumblr Entegrasyonu Aktif!",
    slug: "test-tumblr-integration",
    excerpt:
      "Bu bir test postudur. AI Haberleri otomatik haber paylaşım sistemi başarıyla Tumblr'a entegre edildi.",
    categoryName: "Yapay Zeka",
    imageUrl: null,
  };

  try {
    const result = await postToTumblr(testArticle);

    if (result) {
      console.log("\n✅ TEST BAŞARILI!");
      console.log(`   Post ID: ${result}`);
      console.log(
        `\n   👉 Tumblr'da kontrol et: https://${status.blogName}.tumblr.com`,
      );
    } else {
      console.log("\n❌ Test başarısız - post gönderilemedi");
    }
  } catch (error) {
    console.error("\n❌ Test hatası:", error);
    process.exit(1);
  }
}

// Run test
testTumblr().catch(console.error);
