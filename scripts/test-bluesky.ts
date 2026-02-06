/**
 * Test script for Bluesky integration
 *
 * Usage:
 *   npx ts-node scripts/test-bluesky.ts
 *
 * Or with tsx:
 *   npx tsx scripts/test-bluesky.ts
 */

import "dotenv/config";
import {
  postToBluesky,
  isBlueskyConfigured,
  getBlueskyStatus,
} from "../src/lib/social/bluesky";

async function testBluesky() {
  console.log("🦋 Bluesky Integration Test\n");
  console.log("=".repeat(50));

  // Check configuration
  const status = getBlueskyStatus();
  console.log("\n📋 Configuration Status:");
  console.log(`   Enabled: ${status.enabled ? "✅ Yes" : "❌ No"}`);
  console.log(`   Configured: ${status.configured ? "✅ Yes" : "❌ No"}`);
  console.log(`   Handle: ${status.handle || "Not set"}`);

  if (!status.configured) {
    console.log("\n❌ Bluesky is not configured!");
    console.log("\nRequired environment variables:");
    console.log("   BLUESKY_ENABLED=true");
    console.log("   BLUESKY_HANDLE=yourhandle.bsky.social");
    console.log("   BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx");
    process.exit(1);
  }

  if (!status.enabled) {
    console.log("\n⚠️ Bluesky is configured but disabled.");
    console.log("   Set BLUESKY_ENABLED=true to enable posting.");
    process.exit(0);
  }

  // Test post
  console.log("\n🧪 Sending test post...\n");

  const testArticle = {
    title: "🧪 Test: AI Haberleri Bluesky Entegrasyonu Aktif!",
    slug: "test-bluesky-integration",
    excerpt:
      "Bu bir test postudur. AI Haberleri otomatik haber paylaşım sistemi başarıyla Bluesky'a entegre edildi.",
    categoryName: "Yapay Zeka",
    imageUrl: null, // Optional: Add a test image URL
  };

  try {
    const result = await postToBluesky(testArticle);

    if (result) {
      console.log("\n✅ TEST BAŞARILI!");
      console.log(`   Post URI: ${result}`);
      console.log(`\n   👉 Bluesky'da kontrol et: https://bsky.app`);
    } else {
      console.log("\n❌ Test başarısız - post gönderilemedi");
    }
  } catch (error) {
    console.error("\n❌ Test hatası:", error);
    process.exit(1);
  }
}

// Run test
testBluesky().catch(console.error);
