/**
 * Search Provider Monitoring Test Script
 *
 * Bu script search provider monitoring sistemini test eder:
 * - API endpoint'leri
 * - Real-time polling
 * - Error handling
 * - Data format validation
 */

import { getProviderStats } from "../src/lib/hybrid-search";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

/**
 * Test 1: Provider Stats API
 */
async function testProviderStatsAPI() {
  const testName = "Provider Stats API";
  const startTime = Date.now();

  try {
    const response = await fetch(
      "http://localhost:3000/api/admin/monitoring/search-providers?range=24h",
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.success) {
      throw new Error("Response success flag is false");
    }

    if (!data.data) {
      throw new Error("Response data is missing");
    }

    if (!data.data.providers) {
      throw new Error("Providers data is missing");
    }

    // Validate provider data
    const providers = ["searxng", "brave", "tavily"];
    for (const provider of providers) {
      if (!data.data.providers[provider]) {
        throw new Error(`Provider ${provider} data is missing`);
      }

      const providerData = data.data.providers[provider];
      const requiredFields = [
        "available",
        "requests",
        "errors",
        "successRate",
        "avgResponseTime",
        "distribution",
      ];

      for (const field of requiredFields) {
        if (providerData[field] === undefined) {
          throw new Error(`Provider ${provider} missing field: ${field}`);
        }
      }
    }

    // Validate totals
    if (!data.data.totals) {
      throw new Error("Totals data is missing");
    }

    // Validate timeline
    if (!Array.isArray(data.data.timeline)) {
      throw new Error("Timeline data is not an array");
    }

    // Validate alerts
    if (!Array.isArray(data.data.alerts)) {
      throw new Error("Alerts data is not an array");
    }

    const duration = Date.now() - startTime;
    results.push({
      name: testName,
      passed: true,
      message: `API response valid (${duration}ms)`,
      duration,
    });
  } catch (error: any) {
    results.push({
      name: testName,
      passed: false,
      message: error.message,
      duration: Date.now() - startTime,
    });
  }
}

/**
 * Test 2: Provider Stats Function
 */
async function testProviderStatsFunction() {
  const testName = "Provider Stats Function";
  const startTime = Date.now();

  try {
    const stats = getProviderStats();

    // Validate structure
    if (!stats.searxng || !stats.brave || !stats.tavily) {
      throw new Error("Missing provider stats");
    }

    // Validate fields
    const providers = ["searxng", "brave", "tavily"];
    for (const provider of providers) {
      const providerStats = stats[provider as keyof typeof stats];

      if (typeof providerStats.available !== "boolean") {
        throw new Error(`${provider}.available is not boolean`);
      }

      if (typeof providerStats.requests !== "number") {
        throw new Error(`${provider}.requests is not number`);
      }

      if (typeof providerStats.errors !== "number") {
        throw new Error(`${provider}.errors is not number`);
      }
    }

    const duration = Date.now() - startTime;
    results.push({
      name: testName,
      passed: true,
      message: `Function returns valid stats (${duration}ms)`,
      duration,
    });
  } catch (error: any) {
    results.push({
      name: testName,
      passed: false,
      message: error.message,
      duration: Date.now() - startTime,
    });
  }
}

/**
 * Test 3: Real-time Polling
 */
async function testRealTimePolling() {
  const testName = "Real-time Polling";
  const startTime = Date.now();

  try {
    const pollCount = 3;
    const pollInterval = 1000; // 1 second

    console.log(
      `\n📊 Polling ${pollCount} times with ${pollInterval}ms interval...`,
    );

    for (let i = 0; i < pollCount; i++) {
      const response = await fetch(
        "http://localhost:3000/api/admin/monitoring/search-providers?range=1h",
      );

      if (!response.ok) {
        throw new Error(`Poll ${i + 1} failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `   Poll ${i + 1}/${pollCount}: ${data.data.totals.requests} total requests`,
      );

      if (i < pollCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    const duration = Date.now() - startTime;
    results.push({
      name: testName,
      passed: true,
      message: `Polling successful (${pollCount} polls in ${duration}ms)`,
      duration,
    });
  } catch (error: any) {
    results.push({
      name: testName,
      passed: false,
      message: error.message,
      duration: Date.now() - startTime,
    });
  }
}

/**
 * Test 4: Error Handling
 */
async function testErrorHandling() {
  const testName = "Error Handling";
  const startTime = Date.now();

  try {
    // Test invalid time range
    const response = await fetch(
      "http://localhost:3000/api/admin/monitoring/search-providers?range=invalid",
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Should still return valid data (fallback to default)
    if (!data.success || !data.data) {
      throw new Error("Invalid range should fallback to default");
    }

    const duration = Date.now() - startTime;
    results.push({
      name: testName,
      passed: true,
      message: `Error handling works (${duration}ms)`,
      duration,
    });
  } catch (error: any) {
    results.push({
      name: testName,
      passed: false,
      message: error.message,
      duration: Date.now() - startTime,
    });
  }
}

/**
 * Test 5: Time Range Variations
 */
async function testTimeRangeVariations() {
  const testName = "Time Range Variations";
  const startTime = Date.now();

  try {
    const ranges = ["1h", "6h", "24h", "7d"];

    for (const range of ranges) {
      const response = await fetch(
        `http://localhost:3000/api/admin/monitoring/search-providers?range=${range}`,
      );

      if (!response.ok) {
        throw new Error(`Range ${range} failed: HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(`Range ${range} returned invalid data`);
      }

      console.log(
        `   Range ${range}: ${data.data.timeline.length} timeline points`,
      );
    }

    const duration = Date.now() - startTime;
    results.push({
      name: testName,
      passed: true,
      message: `All time ranges work (${duration}ms)`,
      duration,
    });
  } catch (error: any) {
    results.push({
      name: testName,
      passed: false,
      message: error.message,
      duration: Date.now() - startTime,
    });
  }
}

/**
 * Print Results
 */
function printResults() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 SEARCH PROVIDER MONITORING TEST RESULTS");
  console.log("=".repeat(60) + "\n");

  let passedCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    const icon = result.passed ? "✅" : "❌";
    const status = result.passed ? "PASSED" : "FAILED";

    console.log(`${icon} Test ${index + 1}: ${result.name}`);
    console.log(`   Status: ${status}`);
    console.log(`   Message: ${result.message}`);
    if (result.duration) {
      console.log(`   Duration: ${result.duration}ms`);
    }
    console.log();

    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  });

  console.log("=".repeat(60));
  console.log(
    `📊 Summary: ${passedCount} passed, ${failedCount} failed (${results.length} total)`,
  );
  console.log("=".repeat(60) + "\n");

  // Exit with error code if any test failed
  if (failedCount > 0) {
    process.exit(1);
  }
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.log("🚀 Starting Search Provider Monitoring Tests...\n");

  // Check if server is running
  try {
    const response = await fetch("http://localhost:3000/api/health");
    if (!response.ok) {
      throw new Error("Server health check failed");
    }
  } catch (error) {
    console.error("❌ Server is not running on http://localhost:3000");
    console.error("   Please start the server with: npm run dev");
    process.exit(1);
  }

  console.log("✅ Server is running\n");

  // Run tests
  await testProviderStatsFunction();
  await testProviderStatsAPI();
  await testRealTimePolling();
  await testErrorHandling();
  await testTimeRangeVariations();

  // Print results
  printResults();
}

// Run tests
runTests().catch((error) => {
  console.error("❌ Test runner error:", error);
  process.exit(1);
});
