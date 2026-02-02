/**
 * Test Early Duplicate Detection
 *
 * Bu script, early duplicate detection'ın entity+keyword matching'i
 * doğru şekilde yakalayıp yakalamadığını test eder.
 */

import { db } from "@/lib/db";
import { filterDuplicatesByTopicAndUrl } from "@/services/topic-extraction.service";

// Test cases from production logs
const testCases = [
  {
    name: "Nvidia + OpenAI Investment Story (Different Angles)",
    articles: [
      {
        title:
          "Nvidia CEO'su OpenAI'dan Memnuniyetsiz Olduğu İddialarını Reddetti",
        description:
          "Nvidia CEO Jensen Huang, OpenAI ile ilgili memnuniyetsizlik iddialarını reddetti",
        url: "https://example.com/nvidia-ceo-denies-unhappy-1",
        topic: "nvidia_ceo_openai_denial",
      },
      {
        title: "Nvidia CEO'su: OpenAI Yatırımı 'Asla Bir Taahhüt Değildi'",
        description:
          "Jensen Huang, OpenAI yatırımının bir taahhüt olmadığını açıkladı",
        url: "https://example.com/nvidia-openai-investment-2",
        topic: "nvidia_openai_investment_pledge",
      },
      {
        title: "Nvidia, OpenAI'ye 'En Büyük Yatırımını' Yapmayı Planlıyor",
        description: "Nvidia, OpenAI'ye büyük bir yatırım yapmayı planlıyor",
        url: "https://example.com/nvidia-openai-biggest-investment-3",
        topic: "nvidia_openai_biggest_investment",
      },
    ],
    expectedDuplicates: 2, // İlk haber unique, diğer 2'si duplicate olmalı
    reason: "Same entities (nvidia, openai) + high keyword overlap",
  },
  {
    name: "Meta AI Spending Story",
    articles: [
      {
        title: "Meta Platforms: Don't Fear AI Spending",
        description: "Meta says investors shouldn't worry about AI spending",
        url: "https://example.com/meta-ai-spending-1",
        topic: "meta_ai_spending_defense",
      },
      {
        title: "Meta Defends Massive AI Investment Plans",
        description: "Meta defends its plans for massive AI investments",
        url: "https://example.com/meta-ai-investment-2",
        topic: "meta_ai_investment_plans",
      },
    ],
    expectedDuplicates: 1, // İlk haber unique, 2. duplicate olmalı
    reason: "Same entity (meta) + similar keywords (ai, spending/investment)",
  },
  {
    name: "Completely Different Stories (Should NOT be duplicates)",
    articles: [
      {
        title: "Google Announces New Gemini 2.0 Features",
        description: "Google unveils new features for Gemini 2.0",
        url: "https://example.com/google-gemini-1",
        topic: "google_gemini_features",
      },
      {
        title: "Tesla Autopilot Safety Concerns Raised",
        description: "New safety concerns about Tesla Autopilot",
        url: "https://example.com/tesla-autopilot-1",
        topic: "tesla_autopilot_safety",
      },
      {
        title: "Microsoft Copilot Gets New Updates",
        description: "Microsoft releases new updates for Copilot",
        url: "https://example.com/microsoft-copilot-1",
        topic: "microsoft_copilot_updates",
      },
    ],
    expectedDuplicates: 0, // Hepsi farklı hikaye, duplicate olmamalı
    reason: "Different entities, different topics",
  },
];

async function runTests() {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 EARLY DUPLICATE DETECTION TEST");
  console.log("=".repeat(80) + "\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testCases) {
    totalTests++;
    console.log(`\n${"─".repeat(80)}`);
    console.log(`📋 Test Case ${totalTests}: ${testCase.name}`);
    console.log(`${"─".repeat(80)}`);
    console.log(`   Input: ${testCase.articles.length} articles`);
    console.log(`   Expected duplicates: ${testCase.expectedDuplicates}`);
    console.log(`   Reason: ${testCase.reason}`);
    console.log();

    // Print articles
    testCase.articles.forEach((article, index) => {
      console.log(`   ${index + 1}. "${article.title}"`);
      console.log(`      Topic: ${article.topic}`);
    });

    try {
      // Run early duplicate detection
      const uniqueArticles = await filterDuplicatesByTopicAndUrl(
        testCase.articles as any,
        2, // 2 days window
      );

      const actualDuplicates = testCase.articles.length - uniqueArticles.length;

      console.log(`\n   📊 Results:`);
      console.log(`      Unique articles: ${uniqueArticles.length}`);
      console.log(`      Duplicates found: ${actualDuplicates}`);
      console.log(`      Expected duplicates: ${testCase.expectedDuplicates}`);

      // Check if test passed
      if (actualDuplicates === testCase.expectedDuplicates) {
        console.log(`\n   ✅ TEST PASSED`);
        passedTests++;
      } else {
        console.log(`\n   ❌ TEST FAILED`);
        console.log(
          `      Expected ${testCase.expectedDuplicates} duplicates, got ${actualDuplicates}`,
        );
        failedTests++;
      }
    } catch (error) {
      console.log(`\n   ❌ TEST ERROR: ${error}`);
      failedTests++;
    }
  }

  // Summary
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${"=".repeat(80)}`);
  console.log(`   Total tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests} ✅`);
  console.log(`   Failed: ${failedTests} ❌`);
  console.log(
    `   Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`,
  );
  console.log(`${"=".repeat(80)}\n`);

  process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error("❌ Test script error:", error);
  process.exit(1);
});
