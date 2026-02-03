/**
 * Monitoring Endpoints Test Script
 * Tests all 5 monitoring API endpoints
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface TestResult {
  endpoint: string;
  status: "success" | "error";
  statusCode?: number;
  responseTime?: number;
  error?: string;
  data?: any;
}

async function testEndpoint(
  name: string,
  path: string,
  expectedStatus: number = 200,
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}${path}`);
    const responseTime = Date.now() - startTime;
    const data = await response.json();

    return {
      endpoint: name,
      status: response.status === expectedStatus ? "success" : "error",
      statusCode: response.status,
      responseTime,
      data,
    };
  } catch (error) {
    return {
      endpoint: name,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      responseTime: Date.now() - startTime,
    };
  }
}

async function runTests() {
  console.log("🧪 Testing Monitoring API Endpoints\n");
  console.log("=".repeat(60));

  const tests: Array<[string, string]> = [
    ["Health Check", "/api/admin/monitoring/health"],
    ["Error Logs", "/api/admin/monitoring/errors?limit=10"],
    ["Performance Metrics", "/api/admin/monitoring/performance?timeRange=24h"],
    ["Cache Statistics", "/api/admin/monitoring/cache?limit=50"],
    ["Worker Status", "/api/admin/monitoring/workers"],
  ];

  const results: TestResult[] = [];

  for (const [name, path] of tests) {
    console.log(`\n📍 Testing: ${name}`);
    console.log(`   URL: ${BASE_URL}${path}`);

    const result = await testEndpoint(name, path);
    results.push(result);

    if (result.status === "success") {
      console.log(
        `   ✅ Success (${result.statusCode}) - ${result.responseTime}ms`,
      );
      console.log(
        `   📊 Data keys: ${Object.keys(result.data || {}).join(", ")}`,
      );
    } else {
      console.log(`   ❌ Failed (${result.statusCode || "N/A"})`);
      console.log(`   Error: ${result.error || "Unknown"}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n📊 Test Summary\n");

  const successful = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;
  const avgResponseTime =
    results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚡ Avg Response Time: ${Math.round(avgResponseTime)}ms`);

  if (failed === 0) {
    console.log("\n🎉 All tests passed!");
  } else {
    console.log("\n⚠️  Some tests failed. Check the output above.");
  }

  console.log("\n" + "=".repeat(60));
}

runTests().catch(console.error);
