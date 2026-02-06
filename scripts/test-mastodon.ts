/**
 * Test script for Mastodon integration
 *
 * Usage:
 *   npx tsx scripts/test-mastodon.ts
 */

import "dotenv/config";
import {
  postToMastodon,
  isMastodonConfigured,
  getMastodonStatus,
} from "../src/lib/social/mastodon";

async function testMastodon() {
  console.log("🐘 Mastodon Integration Test\n");
  console.log("=".repeat(50));

  // Check configuration
  const status = getMastodonStatus();
  console.log("\n📋 Configuration Status:");
  console.log(`   Enabled: ${status.enabled ? "✅ Yes" : "❌ No"}`);
  console.log(`   Configured: ${status.configured ? "✅ Yes" : "❌ No"}`);
  console.log(`   Instance: ${status.instanceUrl || "Not set"}`);

  if (!status.configured) {
    console.log("\n❌ Mastodon is not configured!");
    console.log("\nRequired environment variables:");
    console.log("   MASTODON_ENABLED=true");
    console.log("   MASTODON_INSTANCE_URL=https://mastodon.social");
    console.log("   MASTODON_ACCESS_TOKEN=your-access-token");
    process.exit(1);
  }

  if (!status.enabled) {
    console.log("\n⚠️ Mastodon is configured but disabled.");
    console.log("   Set MASTODON_ENABLED=true to enable posting.");
    process.exit(0);
  }

  // Test post
  console.log("\n🧪 Sending test toot...\n");

  const testArticle = {
    title: "🧪 Test: AI Haberleri Mastodon Entegrasyonu Aktif!",
    slug: "test-mastodon-integration",
    excerpt:
      "Bu bir test postudur. AI Haberleri otomatik haber paylaşım sistemi başarıyla Mastodon'a entegre edildi.",
    categoryName: "Yapay Zeka",
    imageUrl: null,
  };

  try {
    const result = await postToMastodon(testArticle);

    if (result) {
      console.log("\n✅ TEST BAŞARILI!");
      console.log(`   Toot ID: ${result}`);
      console.log(`\n   👉 Mastodon'da kontrol et: ${status.instanceUrl}`);
    } else {
      console.log("\n❌ Test başarısız - toot gönderilemedi");
    }
  } catch (error) {
    console.error("\n❌ Test hatası:", error);
    process.exit(1);
  }
}

// Run test
testMastodon().catch(console.error);
