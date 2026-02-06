/**
 * Test Facebook EN Page posting
 * Usage: npx ts-node scripts/test-facebook-en.ts
 */

import "dotenv/config";

async function testFacebookEN() {
  console.log("🧪 Testing Facebook EN Page Posting...\n");

  // Check env variables
  const config = {
    FACEBOOK_EN_ENABLED: process.env.FACEBOOK_EN_ENABLED,
    FACEBOOK_EN_PAGE_ID: process.env.FACEBOOK_EN_PAGE_ID,
    FACEBOOK_EN_PAGE_ACCESS_TOKEN: process.env.FACEBOOK_EN_PAGE_ACCESS_TOKEN
      ? `${process.env.FACEBOOK_EN_PAGE_ACCESS_TOKEN.substring(0, 20)}...`
      : undefined,
  };

  console.log("📋 Configuration:");
  console.log(JSON.stringify(config, null, 2));

  if (
    !process.env.FACEBOOK_EN_ENABLED ||
    process.env.FACEBOOK_EN_ENABLED !== "true"
  ) {
    console.log(
      "\n⚠️ FACEBOOK_EN_ENABLED is not set to 'true'. Skipping test.",
    );
    console.log("\nTo enable, add to .env:");
    console.log("FACEBOOK_EN_ENABLED=true");
    return;
  }

  if (
    !process.env.FACEBOOK_EN_PAGE_ID ||
    !process.env.FACEBOOK_EN_PAGE_ACCESS_TOKEN
  ) {
    console.log("\n❌ Missing Facebook EN credentials!");
    console.log("\nRequired environment variables:");
    console.log("FACEBOOK_EN_PAGE_ID=your_page_id");
    console.log("FACEBOOK_EN_PAGE_ACCESS_TOKEN=your_token");
    return;
  }

  // Dynamic import to avoid issues
  const { postToFacebookEN } = await import("../src/lib/social/facebook");

  // Test article
  const testArticle = {
    title: "🤖 Test: AI News Platform Now Supports English Facebook",
    slug: "test-facebook-en-integration",
    excerpt:
      "This is a test post to verify Facebook EN page integration. Our autonomous AI news platform now shares news in English to Facebook.",
    categoryName: "Technology",
    imageUrl: "https://aihaberleri.org/og-image.png",
  };

  console.log("\n📤 Posting test article to Facebook EN...");
  console.log(`   Title: ${testArticle.title}`);
  console.log(`   Slug: ${testArticle.slug}`);

  try {
    const postId = await postToFacebookEN(testArticle);

    if (postId) {
      console.log(`\n✅ Success! Post ID: ${postId}`);
      console.log(`\n🔗 Check your Facebook EN page to see the post.`);
    } else {
      console.log("\n⚠️ Post returned null - check logs above for details.");
    }
  } catch (error: any) {
    console.error("\n❌ Error:", error?.message || error);
  }
}

testFacebookEN();
