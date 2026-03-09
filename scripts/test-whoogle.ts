/**
 * Whoogle Health Check Script
 *
 * Usage:
 *   npx tsx scripts/test-whoogle.ts
 *   npm run test:whoogle
 */

import axios from "axios";
import { getWhoogleStats, searxngSearch } from "../src/lib/searxng";

const WHOOGLE_BASE_URL =
  process.env.WHOOGLE_BASE_URL ||
  "http://whoogle-e4s8oc4kkc8sokcsco808ccw.77.42.68.4.sslip.io";

const TEST_QUERY =
  process.argv.slice(2).join(" ") || "artificial intelligence news";

interface WhoogleResult {
  title?: string;
  href?: string;
  content?: string;
  text?: string;
}

interface WhoogleResponse {
  results?: WhoogleResult[];
}

async function fetchWhoogleResults(query: string): Promise<WhoogleResult[]> {
  const client = axios.create({
    baseURL: WHOOGLE_BASE_URL,
    timeout: 15000,
    maxRedirects: 5,
    headers: {
      "User-Agent": "AIHaberleri-WhoogleTest/1.0",
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const sessionResponse = await client.get("/");
  const sessionCookies = sessionResponse.headers["set-cookie"];
  const cookieHeader = Array.isArray(sessionCookies)
    ? sessionCookies
        .map((cookie) => cookie.split(";")[0])
        .filter(Boolean)
        .join("; ")
    : "";

  const response = await client.get<WhoogleResponse>("/search", {
    params: {
      q: query,
      format: "json",
    },
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

  return response.data.results || [];
}

async function main() {
  console.log("🩺 Whoogle health check başlatılıyor\n");
  console.log(`🌐 WHOOGLE_BASE_URL: ${WHOOGLE_BASE_URL}`);
  console.log(`🔍 Query: ${TEST_QUERY}\n`);

  let directWhoogleOk = false;

  try {
    const startedAt = Date.now();
    const results = await fetchWhoogleResults(TEST_QUERY);
    const elapsed = Date.now() - startedAt;

    directWhoogleOk = true;
    console.log(`✅ Direct Whoogle OK (${elapsed}ms)`);
    console.log(`📊 Raw result count: ${results.length}`);

    for (const [index, result] of results.slice(0, 3).entries()) {
      console.log(`\n${index + 1}. ${result.title || "(no title)"}`);
      console.log(`   URL: ${result.href || "(no href)"}`);
      console.log(
        `   Snippet: ${(result.content || result.text || "").slice(0, 120)}`,
      );
    }
  } catch (error: any) {
    console.error(`❌ Direct Whoogle failed: ${error.message}`);
  }

  console.log("\n━".repeat(25));
  console.log("🔁 Merkezi searxngSearch smoke test");

  try {
    const startedAt = Date.now();
    const results = await searxngSearch(TEST_QUERY, {
      count: 5,
      language: "en",
      safesearch: 1,
      categories: "general,news",
    });
    const elapsed = Date.now() - startedAt;

    console.log(`✅ searxngSearch OK (${elapsed}ms)`);
    console.log(`📊 Result count: ${results.length}`);
    console.log(
      `🧠 Engines: ${[...new Set(results.map((result) => result.engine))].join(", ") || "none"}`,
    );

    for (const [index, result] of results.slice(0, 3).entries()) {
      console.log(`\n${index + 1}. ${result.title}`);
      console.log(`   Engine: ${result.engine}`);
      console.log(`   URL: ${result.url}`);
    }
  } catch (error: any) {
    console.error(`❌ searxngSearch failed: ${error.message}`);

    if (!directWhoogleOk) {
      process.exit(1);
    }
  }

  const stats = getWhoogleStats();
  console.log("\n📈 Whoogle stability metrics");
  console.log(`   Requests: ${stats.requests}`);
  console.log(`   Successes: ${stats.successes}`);
  console.log(`   Timeouts: ${stats.timeouts}`);
  console.log(`   Fallbacks: ${stats.fallbacks}`);
  console.log(`   Zero results: ${stats.zeroResults}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  console.log(
    `   Avg latency: ${stats.avgLatencyMs === null ? "n/a" : `${stats.avgLatencyMs}ms`}`,
  );

  console.log("\n✅ Whoogle test tamamlandı");
}

main().catch((error) => {
  console.error("❌ Whoogle health check crashed:", error);
  process.exit(1);
});
