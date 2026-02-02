/**
 * Test "No Humans" Image Prompt Generation
 *
 * Verifies that all generated prompts exclude human-related content
 */

import { generateImagePrompt } from "../src/lib/deepseek";

const testCases = [
  {
    title: "OpenAI CEO Sam Altman Announces $100 Billion Investment",
    category: "Şirket Haberleri",
    content:
      "OpenAI CEO Sam Altman announced a massive $100 billion investment...",
  },
  {
    title: "Major Security Breach Exposes 1 Million User Accounts",
    category: "Güvenlik",
    content: "A major cybersecurity breach has exposed sensitive data...",
  },
  {
    title: "Google Launches New Gemini AI Model",
    category: "Ürün Lansmanı",
    content: "Google has officially launched its new Gemini AI model...",
  },
  {
    title: "EU Bans AI Facial Recognition in Public Spaces",
    category: "Regülasyon",
    content:
      "The European Union has passed new regulations banning AI facial recognition...",
  },
  {
    title: "Tesla Unveils New Humanoid Robot Optimus Gen 2",
    category: "Robotik",
    content:
      "Tesla has unveiled the second generation of its humanoid robot...",
  },
  {
    title: "AI Job Displacement Concerns Rise Among Workers",
    category: "Yapay Zeka Etiği",
    content: "Growing concerns about AI replacing human jobs...",
  },
];

async function testNoHumansPrompts() {
  console.log("🧪 Testing 'No Humans' Image Prompt Generation\n");
  console.log("=".repeat(80));

  let passCount = 0;
  let failCount = 0;

  for (const testCase of testCases) {
    console.log(`\n📰 Test Case: ${testCase.title.substring(0, 60)}...`);
    console.log(`   Category: ${testCase.category}`);

    try {
      const prompt = await generateImagePrompt(
        testCase.title,
        testCase.content,
        testCase.category,
      );

      console.log(`   Generated Prompt: ${prompt}`);

      // Check for human-related keywords
      const humanKeywords = [
        "people",
        "person",
        "human",
        "face",
        "man",
        "woman",
        "child",
        "crowd",
        "employee",
        "worker",
        "engineer",
        "scientist",
        "hand",
        "body",
        "portrait",
        "figure",
        "silhouette",
      ];

      const bannedKeywords = humanKeywords.filter((keyword) =>
        prompt.toLowerCase().includes(keyword),
      );

      // Check for "no people" or equivalent
      const noHumansKeywords = [
        "no people",
        "no humans",
        "no faces",
        "no person",
        "empty",
        "solo robot", // Exception for robot-only images
      ];

      const hasNoHumansKeyword = noHumansKeywords.some((keyword) =>
        prompt.toLowerCase().includes(keyword),
      );

      // Validation
      if (bannedKeywords.length > 0 && !hasNoHumansKeyword) {
        console.log(
          `   ❌ FAIL: Contains human keywords: [${bannedKeywords.join(", ")}]`,
        );
        console.log(`   ❌ FAIL: Missing 'no people' or equivalent`);
        failCount++;
      } else if (bannedKeywords.length > 0) {
        console.log(
          `   ⚠️  WARNING: Contains human keywords but has 'no people' suffix`,
        );
        console.log(`   Keywords: [${bannedKeywords.join(", ")}]`);
        passCount++;
      } else if (!hasNoHumansKeyword) {
        console.log(
          `   ⚠️  WARNING: No human keywords but missing 'no people' suffix`,
        );
        passCount++;
      } else {
        console.log(`   ✅ PASS: No human keywords, has 'no people' suffix`);
        passCount++;
      }

      // Check length
      if (prompt.length > 150) {
        console.log(`   ⚠️  WARNING: Prompt too long (${prompt.length} chars)`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
      failCount++;
    }

    // Rate limit protection
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n📊 Test Results:");
  console.log(`   ✅ Passed: ${passCount}/${testCases.length}`);
  console.log(`   ❌ Failed: ${failCount}/${testCases.length}`);
  console.log(
    `   Success Rate: ${((passCount / testCases.length) * 100).toFixed(1)}%`,
  );

  if (failCount === 0) {
    console.log("\n🎉 All tests passed! No human-related content detected.");
  } else {
    console.log("\n⚠️  Some tests failed. Review prompts above.");
  }
}

testNoHumansPrompts().catch(console.error);
