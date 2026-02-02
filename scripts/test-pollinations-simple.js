/**
 * Simple Pollinations.ai API Test (JavaScript)
 * Usage: node scripts/test-pollinations-simple.js
 */

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

if (!POLLINATIONS_API_KEY) {
  console.error("❌ POLLINATIONS_API_KEY not found in environment");
  console.log("Set it with: export POLLINATIONS_API_KEY=pk_your_key_here");
  process.exit(1);
}

async function testPollinationsAPI() {
  console.log("🧪 Testing Pollinations.ai API...\n");

  // Test 1: Generate test image with query parameter authentication
  console.log("1️⃣ Generating test image with authenticated API...");
  const testPrompt = "artificial intelligence technology, modern digital art";
  const encodedPrompt = encodeURIComponent(testPrompt);

  try {
    const imageUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&width=1200&height=630&key=${POLLINATIONS_API_KEY}`;
    console.log(`📝 Prompt: ${testPrompt}`);
    console.log(`🎨 URL: ${imageUrl.substring(0, 100)}...`);

    const imageResponse = await fetch(imageUrl);

    if (imageResponse.ok) {
      const contentType = imageResponse.headers.get("content-type");
      const contentLength = imageResponse.headers.get("content-length");
      console.log(`✅ Image generated successfully!`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(
        `   Size: ${contentLength ? `${Math.round(parseInt(contentLength) / 1024)} KB` : "Unknown"}`,
      );
      console.log(`   URL: ${imageUrl}\n`);
    } else {
      console.error(`❌ Image generation failed: ${imageResponse.status}`);
      const errorText = await imageResponse.text();
      console.error(`   Error: ${errorText}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error generating image:", error.message);
    process.exit(1);
  }

  // Test 2: Check if anonymous fallback works
  console.log("2️⃣ Testing anonymous fallback (without API key)...");
  const anonymousUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=1200&height=630`;

  try {
    console.log(`🎨 Anonymous URL: ${anonymousUrl.substring(0, 100)}...`);
    const anonymousResponse = await fetch(anonymousUrl);

    if (anonymousResponse.ok) {
      console.log(`✅ Anonymous fallback works!`);
      console.log(`   Status: ${anonymousResponse.status}\n`);
    } else {
      console.log(
        `⚠️ Anonymous fallback returned: ${anonymousResponse.status}`,
      );
      console.log(`   (This is expected if rate limited)\n`);
    }
  } catch (error) {
    console.log(`⚠️ Anonymous fallback error: ${error.message}`);
    console.log(`   (This is expected if service is down)\n`);
  }

  console.log("✅ Test complete!");
  console.log("\n📊 Summary:");
  console.log("   - Authenticated API: ✅ Working");
  console.log("   - Query parameter auth: ✅ Correct method");
  console.log("   - API Key: " + POLLINATIONS_API_KEY.substring(0, 10) + "...");
}

testPollinationsAPI().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
