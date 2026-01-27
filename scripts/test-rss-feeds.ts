/**
 * RSS Feed Tester
 * Tests all RSS feeds and reports which ones are working/broken
 */

import axios from "axios";
import { parseStringPromise } from "xml2js";

interface FeedTestResult {
  name: string;
  url: string;
  language: string;
  status: "success" | "failed" | "timeout" | "invalid";
  itemCount?: number;
  error?: string;
  responseTime?: number;
}

const AI_NEWS_RSS_FEEDS = [
  // --- MAJOR TECH NEWS (AI SECTION) ---
  {
    name: "MIT Technology Review - AI",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
    language: "en",
  },
  {
    name: "VentureBeat - AI",
    url: "https://venturebeat.com/category/ai/feed/",
    language: "en",
  },
  {
    name: "The Verge - AI",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    language: "en",
  },
  {
    name: "TechCrunch - AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    language: "en",
  },
  {
    name: "Ars Technica - AI",
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
    language: "en",
  },
  {
    name: "Wired - AI",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
    language: "en",
  },
  {
    name: "ZDNet - Artificial Intelligence",
    url: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml",
    language: "en",
  },
  {
    name: "Engadget - AI",
    url: "https://www.engadget.com/rss.xml",
    language: "en",
  },

  // --- AI FOCUSED PUBLICATIONS ---
  {
    name: "AI News",
    url: "https://www.artificialintelligence-news.com/feed/",
    language: "en",
  },
  {
    name: "Unite.AI",
    url: "https://www.unite.ai/feed/",
    language: "en",
  },
  {
    name: "MarkTechPost",
    url: "https://www.marktechpost.com/feed/",
    language: "en",
  },
  {
    name: "The AI Edge (Substack)",
    url: "https://theaiedge.substack.com/feed",
    language: "en",
  },
  {
    name: "Last Week in AI",
    url: "https://lastweekin.ai/feed",
    language: "en",
  },

  // --- RESEARCH & ENGINEERING BLOGS ---
  {
    name: "Machine Learning Mastery",
    url: "https://machinelearningmastery.com/feed/",
    language: "en",
  },
  {
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
    language: "en",
  },
  {
    name: "Google AI Blog",
    url: "https://blog.research.google/feeds/posts/default",
    language: "en",
  },
  {
    name: "DeepMind Blog",
    url: "https://deepmind.google/blog/rss.xml",
    language: "en",
  },
  {
    name: "NVIDIA Blog - AI",
    url: "https://blogs.nvidia.com/blog/category/deep-learning/feed/",
    language: "en",
  },
  {
    name: "Microsoft Azure AI Blog",
    url: "https://azure.microsoft.com/en-us/blog/topics/artificial-intelligence/feed/",
    language: "en",
  },
  {
    name: "AWS Machine Learning Blog",
    url: "https://aws.amazon.com/blogs/machine-learning/feed/",
    language: "en",
  },
  {
    name: "Meta AI Blog",
    url: "https://ai.meta.com/blog/rss.xml",
    language: "en",
  },
  {
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    language: "en",
  },
  {
    name: "Berkeley AI Research (BAIR)",
    url: "https://bair.berkeley.edu/blog/feed.xml",
    language: "en",
  },

  // --- BUSINESS & STRATEGY ---
  {
    name: "Forbes - AI",
    url: "https://www.forbes.com/innovation/feed/",
    language: "en",
  },
  {
    name: "Business Insider - Enterprise Tech",
    url: "https://feeds.businessinsider.com/custom/107",
    language: "en",
  },
  {
    name: "Harvard Business Review - AI",
    url: "https://hbr.org/feed/topic/artificial-intelligence",
    language: "en",
  },

  // --- TURKISH SOURCES (IF AVAILABLE) ---
  {
    name: "Webrazzi - Yapay Zeka",
    url: "https://webrazzi.com/etiket/yapay-zeka/feed",
    language: "tr",
  },
];

async function testFeed(feed: {
  name: string;
  url: string;
  language: string;
}): Promise<FeedTestResult> {
  const startTime = Date.now();

  try {
    console.log(`Testing: ${feed.name}...`);

    const response = await axios.get(feed.url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)",
      },
      validateStatus: (status) => status < 500, // Accept 4xx as valid response
    });

    const responseTime = Date.now() - startTime;

    if (response.status !== 200) {
      return {
        name: feed.name,
        url: feed.url,
        language: feed.language,
        status: "failed",
        error: `HTTP ${response.status}`,
        responseTime,
      };
    }

    const xml = response.data;
    const parsed = await parseStringPromise(xml);

    // Handle different RSS formats
    let items: any[] = [];

    if (parsed.rss?.channel?.[0]?.item) {
      // RSS 2.0
      items = parsed.rss.channel[0].item;
    } else if (parsed.feed?.entry) {
      // Atom
      items = parsed.feed.entry;
    }

    if (items.length === 0) {
      return {
        name: feed.name,
        url: feed.url,
        language: feed.language,
        status: "invalid",
        error: "No items found in feed",
        responseTime,
      };
    }

    return {
      name: feed.name,
      url: feed.url,
      language: feed.language,
      status: "success",
      itemCount: items.length,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return {
        name: feed.name,
        url: feed.url,
        language: feed.language,
        status: "timeout",
        error: "Connection timeout",
        responseTime,
      };
    }

    return {
      name: feed.name,
      url: feed.url,
      language: feed.language,
      status: "failed",
      error: error.message,
      responseTime,
    };
  }
}

async function testAllFeeds() {
  console.log(`\n🧪 Testing ${AI_NEWS_RSS_FEEDS.length} RSS feeds...\n`);

  const results: FeedTestResult[] = [];

  // Test feeds sequentially to avoid rate limiting
  for (const feed of AI_NEWS_RSS_FEEDS) {
    const result = await testFeed(feed);
    results.push(result);

    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Generate report
  console.log("\n" + "=".repeat(80));
  console.log("📊 RSS FEED TEST REPORT");
  console.log("=".repeat(80) + "\n");

  const successful = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status === "failed");
  const timeout = results.filter((r) => r.status === "timeout");
  const invalid = results.filter((r) => r.status === "invalid");

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏱️  Timeout: ${timeout.length}`);
  console.log(`⚠️  Invalid: ${invalid.length}`);
  console.log(`📊 Total: ${results.length}\n`);

  // Successful feeds
  if (successful.length > 0) {
    console.log("✅ WORKING FEEDS:");
    console.log("-".repeat(80));
    successful.forEach((r) => {
      console.log(`  ✓ ${r.name} (${r.itemCount} items, ${r.responseTime}ms)`);
    });
    console.log();
  }

  // Failed feeds
  if (failed.length > 0) {
    console.log("❌ FAILED FEEDS:");
    console.log("-".repeat(80));
    failed.forEach((r) => {
      console.log(`  ✗ ${r.name}`);
      console.log(`    URL: ${r.url}`);
      console.log(`    Error: ${r.error}\n`);
    });
  }

  // Timeout feeds
  if (timeout.length > 0) {
    console.log("⏱️  TIMEOUT FEEDS:");
    console.log("-".repeat(80));
    timeout.forEach((r) => {
      console.log(`  ⏱  ${r.name}`);
      console.log(`    URL: ${r.url}`);
      console.log(`    Error: ${r.error}\n`);
    });
  }

  // Invalid feeds
  if (invalid.length > 0) {
    console.log("⚠️  INVALID FEEDS:");
    console.log("-".repeat(80));
    invalid.forEach((r) => {
      console.log(`  ⚠  ${r.name}`);
      console.log(`    URL: ${r.url}`);
      console.log(`    Error: ${r.error}\n`);
    });
  }

  // Feeds to remove
  const toRemove = [...failed, ...timeout, ...invalid];
  if (toRemove.length > 0) {
    console.log("🗑️  FEEDS TO REMOVE:");
    console.log("-".repeat(80));
    toRemove.forEach((r) => {
      console.log(`  - ${r.name} (${r.status})`);
    });
    console.log();
  }

  // Save results to JSON
  const fs = require("fs");
  fs.writeFileSync("rss-test-results.json", JSON.stringify(results, null, 2));
  console.log("📄 Results saved to: rss-test-results.json\n");
}

testAllFeeds().catch(console.error);
