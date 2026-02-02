/**
 * Test Pollinations.ai API with authentication
 * Usage: npx tsx scripts/test-pollinations-api.ts
 */

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

if (!POLLINATIONS_API_KEY) {
  console.error("❌ POLLINATIONS_API_KEY not found in environment");
  console.log("Add to .env:");
  console.log("POLLINATIONS_API_KEY=pk_your_key_here");
  process.exit(1);
}

async function testPollinationsAPI() {
  console.log("🧪 Testing Pollinations.ai API...\n");

  // Test 1: Check API key validity
  console.log("1️⃣ Checking API key validity...");
  try {
    const keyResponse = await fetch("https://gen.pollinations.ai/account/key", {
      headers: {
        Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
      },
    });

    if (keyResponse.ok) {
      const keyData = await keyResponse.json();
      console.log("✅ API Key valid:");
      console.log(`   Type: ${keyData.type}`);
      console.log(`   Name: ${keyData.name || "N/A"}`);
      console.log(`   Permissions: ${JSON.stringify(keyData.permissions)}`);
      console.log(`   Pollen Budget: ${keyData.pollenBudget || "Unlimited"}\n`);
    } else {
      console.error(`❌ API Key invalid: ${keyResponse.status}\n`);
      return;
    }
  } catch (error) {
    console.error("❌ Error checking API key:", error);
    return;
  }

  // Test 2: Check balance
  console.log("2️⃣ Checking pollen balance...");
  try {
    const balanceResponse = await fetch(
      "https://gen.pollinations.ai/account/balance",
      {
        headers: {
          Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
        },
      },
    );

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log(`✅ Pollen Balance: ${balanceData.balance}\n`);
    } else {
      console.error(`❌ Balance check failed: ${balanceResponse.status}\n`);
    }
  } catch (error) {
    console.error("❌ Error checking balance:", error);
  }

  // Test 3: List available image models
  console.log("3️⃣ Listing available image models...");
  try {
    const modelsResponse = await fetch(
      "https://gen.pollinations.ai/image/models",
      {
        headers: {
          Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
        },
      },
    );

    if (modelsResponse.ok) {
      const models = await modelsResponse.json();
      console.log(`✅ Available models (${models.length}):`);
      models.slice(0, 5).forEach((model: any) => {
        console.log(`   - ${model.name}: ${model.description || "N/A"}`);
      });
      console.log(`   ... and ${models.length - 5} more\n`);
    } else {
      console.error(`❌ Models list failed: ${modelsResponse.status}\n`);
    }
  } catch (error) {
    console.error("❌ Error listing models:", error);
  }

  // Test 4: Generate test image
  console.log("4️⃣ Generating test image...");
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
    }
  } catch (error) {
    console.error("❌ Error generating image:", error);
  }

  console.log("✅ Test complete!");
}

testPollinationsAPI().catch(console.error);
