/**
 * Test script for Tavily Credit Monitoring
 *
 * Usage:
 *   tsx src/scripts/test-tavily-monitor.ts
 */

import {
  trackCreditUsage,
  getMonthlyUsage,
  getUsageByDateRange,
  getDailyUsageBreakdown,
  checkBudget,
  getUsageSummary,
  resetMonthlyUsage,
} from "@/lib/tavily-monitor";

async function testTrackUsage() {
  console.log("\n=== Test 1: Track Credit Usage ===\n");

  const usageRecords = [
    { feature: "search" as const, credits: 2, metadata: { query: "AI news" } },
    { feature: "extract" as const, credits: 10, metadata: { urls: 10 } },
    {
      feature: "research" as const,
      credits: 10,
      metadata: { topic: "AI breakthroughs" },
    },
    {
      feature: "search" as const,
      credits: 1,
      metadata: { query: "Tech news" },
    },
    { feature: "extract" as const, credits: 5, metadata: { urls: 5 } },
  ];

  console.log("📊 Tracking usage records...\n");

  for (const record of usageRecords) {
    await trackCreditUsage(record.feature, record.credits, record.metadata);
    console.log(`✅ Tracked: ${record.feature} - ${record.credits} credits`);
  }

  console.log("\n✅ All usage records tracked!");
}

async function testMonthlyUsage() {
  console.log("\n=== Test 2: Get Monthly Usage ===\n");

  const usage = await getMonthlyUsage();

  console.log("📊 Monthly Usage Statistics:\n");
  console.log(`Total Credits: ${usage.totalCredits}`);
  console.log(`Daily Average: ${usage.dailyAverage.toFixed(1)} credits/day`);
  console.log(
    `Projected Monthly: ${Math.round(usage.projectedMonthly)} credits`,
  );
  console.log(`Remaining Budget: ${usage.remainingBudget} credits`);
  console.log(`Percent Used: ${usage.percentUsed.toFixed(1)}%`);

  console.log("\n📊 Usage by Feature:");
  Object.entries(usage.byFeature).forEach(([feature, credits]) => {
    if (credits > 0) {
      const percent = (credits / usage.totalCredits) * 100;
      console.log(`  ${feature}: ${credits} credits (${percent.toFixed(1)}%)`);
    }
  });
}

async function testDailyBreakdown() {
  console.log("\n=== Test 3: Daily Usage Breakdown ===\n");

  const daily = await getDailyUsageBreakdown();

  console.log("📊 Daily Usage:\n");

  daily.forEach((day) => {
    console.log(`\n📅 ${day.date}: ${day.credits} credits`);
    Object.entries(day.byFeature).forEach(([feature, credits]) => {
      if (credits > 0) {
        console.log(`  ${feature}: ${credits} credits`);
      }
    });
  });
}

async function testDateRangeUsage() {
  console.log("\n=== Test 4: Date Range Usage ===\n");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  console.log(
    `📅 Date Range: ${weekAgo.toISOString().split("T")[0]} to ${now.toISOString().split("T")[0]}\n`,
  );

  const usage = await getUsageByDateRange(weekAgo, now);

  console.log("📊 Usage Statistics:\n");
  console.log(`Total Credits: ${usage.totalCredits}`);
  console.log(`Daily Average: ${usage.dailyAverage.toFixed(1)} credits/day`);
  console.log(
    `Projected Monthly: ${Math.round(usage.projectedMonthly)} credits`,
  );

  console.log("\n📊 Usage by Feature:");
  Object.entries(usage.byFeature).forEach(([feature, credits]) => {
    if (credits > 0) {
      console.log(`  ${feature}: ${credits} credits`);
    }
  });
}

async function testBudgetCheck() {
  console.log("\n=== Test 5: Budget Check ===\n");

  const scenarios = [
    { operation: "Small extract (10 URLs)", credits: 10 },
    { operation: "Large extract (50 URLs)", credits: 50 },
    { operation: "Research (mini)", credits: 10 },
    { operation: "Research (pro)", credits: 20 },
    { operation: "Weekly crawl (90 pages)", credits: 90 },
    { operation: "Large crawl (500 pages)", credits: 500 },
  ];

  console.log("💰 Budget Check:\n");

  for (const scenario of scenarios) {
    const withinBudget = await checkBudget(scenario.credits);
    const status = withinBudget ? "✅ OK" : "❌ EXCEEDS BUDGET";
    console.log(
      `${status} - ${scenario.operation} (${scenario.credits} credits)`,
    );
  }
}

async function testUsageSummary() {
  console.log("\n=== Test 6: Usage Summary (Dashboard) ===\n");

  const summary = await getUsageSummary();

  console.log("📊 TAVILY CREDIT USAGE DASHBOARD\n");
  console.log("=".repeat(60));

  console.log("\n📈 Current Month:");
  console.log(`  Total: ${summary.current.totalCredits} / 1000 credits`);
  console.log(`  Used: ${summary.current.percentUsed.toFixed(1)}%`);
  console.log(`  Remaining: ${summary.current.remainingBudget} credits`);
  console.log(
    `  Daily Avg: ${summary.current.dailyAverage.toFixed(1)} credits/day`,
  );
  console.log(
    `  Projected: ${Math.round(summary.current.projectedMonthly)} credits/month`,
  );

  console.log("\n📊 Usage by Feature:");
  Object.entries(summary.current.byFeature).forEach(([feature, credits]) => {
    if (credits > 0) {
      const percent = (credits / summary.current.totalCredits) * 100;
      const bar = "█".repeat(Math.round(percent / 5));
      console.log(
        `  ${feature.padEnd(10)}: ${bar} ${credits} credits (${percent.toFixed(1)}%)`,
      );
    }
  });

  console.log("\n📅 Daily Usage (Last 7 Days):");
  summary.daily.slice(-7).forEach((day) => {
    const bar = "█".repeat(Math.round(day.credits / 5));
    console.log(`  ${day.date}: ${bar} ${day.credits} credits`);
  });

  if (summary.alerts.length > 0) {
    console.log("\n🚨 Alerts:");
    summary.alerts.forEach((alert) => {
      console.log(`  ${alert}`);
    });
  } else {
    console.log("\n✅ No alerts - usage within normal range");
  }

  console.log("\n" + "=".repeat(60));
}

async function testSimulateHighUsage() {
  console.log("\n=== Test 7: Simulate High Usage (Alert Test) ===\n");

  console.log("⚠️ Simulating high usage to trigger alerts...\n");

  // Simulate 850 credits usage (85% of budget)
  await trackCreditUsage("extract", 850, { simulation: true });

  console.log("✅ High usage simulated (850 credits)\n");

  const summary = await getUsageSummary();

  console.log("📊 Usage Status:");
  console.log(`  Total: ${summary.current.totalCredits} / 1000 credits`);
  console.log(`  Percent: ${summary.current.percentUsed.toFixed(1)}%`);

  if (summary.alerts.length > 0) {
    console.log("\n🚨 Alerts Triggered:");
    summary.alerts.forEach((alert) => {
      console.log(`  ${alert}`);
    });
  }
}

async function testResetUsage() {
  console.log("\n=== Test 8: Reset Monthly Usage ===\n");

  console.log(
    "⚠️ WARNING: This will delete all usage records for current month!",
  );
  console.log("Press Ctrl+C to cancel, or wait 3 seconds to continue...\n");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  await resetMonthlyUsage();

  const usage = await getMonthlyUsage();
  console.log(`\n✅ Usage reset. Current total: ${usage.totalCredits} credits`);
}

async function main() {
  console.log("🚀 Tavily Credit Monitoring Test Suite\n");

  // Check database connection
  try {
    await getMonthlyUsage();
    console.log("✅ Database connection OK\n");
  } catch (error: any) {
    console.error("❌ Database connection failed:", error.message);
    console.error("\n💡 Make sure to run: npx prisma migrate dev");
    process.exit(1);
  }

  // Run tests
  await testTrackUsage();
  await testMonthlyUsage();
  await testDailyBreakdown();
  await testDateRangeUsage();
  await testBudgetCheck();
  await testUsageSummary();
  await testSimulateHighUsage();

  // Optional: Reset usage (commented out by default)
  // await testResetUsage();

  console.log("\n✅ All tests completed!\n");
  console.log("💡 Next steps:");
  console.log("  1. Run: npx prisma migrate dev --name add_tavily_usage");
  console.log("  2. Integrate tracking into Tavily API calls");
  console.log("  3. Add dashboard UI for monitoring");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
