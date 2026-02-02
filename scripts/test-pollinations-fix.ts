/**
 * Quick test for Pollinations.ai fix
 * Tests both authenticated and anonymous endpoints with flux model
 */

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

async function testFix() {
  console.log("🧪 Testing Pollinations.ai Fix\n");

  const testPrompt = "artificial intelligence technology, modern digital art";
  const encodedPrompt = encodeURIComponent(testPrompt);

  // Test 1: Authenticated endpoint with flux model
  if (POLLINATIONS_API_KEY) {
    console.log("1️⃣ Testing authenticated endpoint (flux model)...");
    try {
      const authUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&width=1200&height=630&key=${POLLINATIONS_API_KEY}`;
      console.log(`📝 URL: ${authUrl.substring(0, 120)}...`);

      const response = await fetch(authUrl);
      console.log(`📊 Status: ${response.status}`);

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        const contentLength = response.headers.get("content-length");
        console.log(`✅ Authenticated endpoint works!`);
        console.log(`   Content-Type: ${contentType}`);
        console.log(
          `   Size: ${contentLength ? `${Math.round(parseInt(contentLength) / 1024)} KB` : "Unknown"}`,
        );
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed: ${response.status}`);
        console.error(`   Error: ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.error("❌ Error:", error);
    }
    console.log();
  } else {
    console.log("⚠️ No API key found, skipping authenticated test\n");
  }

  // Test 2: Anonymous endpoint with flux model
  console.log("2️⃣ Testing anonymous endpoint (flux model)...");
  try {
    const anonUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=1200&height=630`;
    console.log(`📝 URL: ${anonUrl.substring(0, 120)}...`);

    const response = await fetch(anonUrl);
    console.log(`📊 Status: ${response.status}`);

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      const contentLength = response.headers.get("content-length");
      console.log(`✅ Anonymous endpoint works!`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(
        `   Size: ${contentLength ? `${Math.round(parseInt(contentLength) / 1024)} KB` : "Unknown"}`,
      );
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed: ${response.status}`);
      console.error(`   Error: ${errorText.substring(0, 200)}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  console.log("\n✅ Test complete!");
}

testFix().catch(console.error);
