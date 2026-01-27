/**
 * Turkish RSS Feed Tester
 * Tests only Turkish RSS feeds
 */

import axios from "axios";
import { parseStringPromise } from "xml2js";

interface FeedTestResult {
  name: string;
  url: string;
  status: "success" | "failed" | "timeout";
  itemCount?: number;
  error?: string;
  responseTime?: number;
}

const TURKISH_RSS_FEEDS = [
  // --- TURKISH GENERAL NEWS SOURCES ---
  {
    name: "Hürriyet - Anasayfa",
    url: "https://www.hurriyet.com.tr/rss/anasayfa",
  },
  {
    name: "Hürriyet - Teknoloji",
    url: "https://www.hurriyet.com.tr/rss/teknoloji",
  },
  {
    name: "Hürriyet - Gündem",
    url: "https://www.hurriyet.com.tr/rss/gundem",
  },
  {
    name: "Milliyet - Anasayfa",
    url: "https://www.milliyet.com.tr/rss/rssnew/gundemrss.xml",
  },
  {
    name: "Milliyet - Teknoloji",
    url: "https://www.milliyet.com.tr/rss/rssnew/teknolojirss.xml",
  },
  {
    name: "Sabah - Anasayfa",
    url: "https://www.sabah.com.tr/rss/anasayfa.xml",
  },
  {
    name: "Sabah - Teknoloji",
    url: "https://www.sabah.com.tr/rss/teknoloji.xml",
  },
  {
    name: "Habertürk - Anasayfa",
    url: "https://www.haberturk.com/rss",
  },
  {
    name: "Habertürk - Teknoloji",
    url: "https://www.haberturk.com/rss/kategori/teknoloji.xml",
  },
  {
    name: "NTV - Anasayfa",
    url: "https://www.ntv.com.tr/gundem.rss",
  },
  {
    name: "NTV - Teknoloji",
    url: "https://www.ntv.com.tr/teknoloji.rss",
  },
  {
    name: "CNN Türk - Anasayfa",
    url: "https://www.cnnturk.com/feed/rss/all/news",
  },
  {
    name: "CNN Türk - Teknoloji",
    url: "https://www.cnnturk.com/feed/rss/teknoloji/news",
  },
  {
    name: "TRT Haber - Manşet",
    url: "https://www.trthaber.com/manset_articles.rss",
  },
  {
    name: "TRT Haber - Teknoloji",
    url: "https://www.trthaber.com/bilim_teknoloji_articles.rss",
  },
  {
    name: "TRT Haber - Gündem",
    url: "https://www.trthaber.com/gundem_articles.rss",
  },
  {
    name: "Anadolu Ajansı - Gündem",
    url: "https://www.aa.com.tr/tr/rss/default?cat=guncel",
  },
  {
    name: "Anadolu Ajansı - Teknoloji",
    url: "https://www.aa.com.tr/tr/rss/default?cat=bilim-teknoloji",
  },
  {
    name: "Sözcü - Anasayfa",
    url: "https://www.sozcu.com.tr/feed/",
  },
  {
    name: "Sözcü - Teknoloji",
    url: "https://www.sozcu.com.tr/kategori/teknoloji/feed/",
  },
  {
    name: "Cumhuriyet - Anasayfa",
    url: "https://www.cumhuriyet.com.tr/rss/son_dakika.xml",
  },
  {
    name: "Cumhuriyet - Teknoloji",
    url: "https://www.cumhuriyet.com.tr/rss/72.xml",
  },
  {
    name: "T24 - Anasayfa",
    url: "https://t24.com.tr/rss",
  },
  {
    name: "Haber Global - Anasayfa",
    url: "https://haberglobal.com.tr/rss/anasayfa",
  },
  {
    name: "BBC Türkçe",
    url: "https://feeds.bbci.co.uk/turkce/rss.xml",
  },

  // --- TURKISH TECH NEWS SOURCES ---
  {
    name: "Webrazzi - Yapay Zeka",
    url: "https://webrazzi.com/etiket/yapay-zeka/feed",
  },
  {
    name: "Webrazzi - Teknoloji",
    url: "https://webrazzi.com/kategori/teknoloji/feed",
  },
  {
    name: "Webtekno - Anasayfa",
    url: "https://www.webtekno.com/rss",
  },
  {
    name: "ShiftDelete.Net - Anasayfa",
    url: "https://shiftdelete.net/feed",
  },
  {
    name: "Donanım Haber - Anasayfa",
    url: "https://www.donanimhaber.com/rss.xml",
  },
  {
    name: "Chip Online - Teknoloji",
    url: "https://www.chip.com.tr/rss/haberler.xml",
  },
  {
    name: "Log - Teknoloji",
    url: "https://www.log.com.tr/feed/",
  },
  {
    name: "Tamindir - Teknoloji",
    url: "https://www.tamindir.com/rss/",
  },

  // --- TURKISH ECONOMY NEWS ---
  {
    name: "Bloomberg HT - Anasayfa",
    url: "https://www.bloomberght.com/rss",
  },
  {
    name: "Dünya Gazetesi - Ekonomi",
    url: "https://www.dunya.com/rss",
  },
  {
    name: "Para Analiz - Ekonomi",
    url: "https://www.paraanaliz.com/feed/",
  },
  {
    name: "Ekonomim - Ekonomi",
    url: "https://www.ekonomim.com/rss",
  },
];

async function testFeed(feed: {
  name: string;
  url: string;
}): Promise<FeedTestResult> {
  const startTime = Date.now();

  try {
    const response = await axios.get(feed.url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)",
      },
      validateStatus: (status) => status === 200,
    });

    const responseTime = Date.now() - startTime;
    const xml = response.data;
    const parsed = await parseStringPromise(xml);

    let items: any[] = [];

    if (parsed.rss?.channel?.[0]?.item) {
      items = parsed.rss.channel[0].item;
    } else if (parsed.feed?.entry) {
      items = parsed.feed.entry;
    }

    return {
      name: feed.name,
      url: feed.url,
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
        status: "timeout",
        error: "Connection timeout",
        responseTime,
      };
    }

    return {
      name: feed.name,
      url: feed.url,
      status: "failed",
      error: error.message,
      responseTime,
    };
  }
}

async function testAllFeeds() {
  console.log(
    `\n🧪 Testing ${TURKISH_RSS_FEEDS.length} Turkish RSS feeds...\n`,
  );

  const results: FeedTestResult[] = [];

  for (const feed of TURKISH_RSS_FEEDS) {
    console.log(`Testing: ${feed.name}...`);
    const result = await testFeed(feed);
    results.push(result);

    // Status indicator
    if (result.status === "success") {
      console.log(`  ✅ ${result.itemCount} items (${result.responseTime}ms)`);
    } else {
      console.log(`  ❌ ${result.error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Generate report
  console.log("\n" + "=".repeat(80));
  console.log("📊 TURKISH RSS FEED TEST REPORT");
  console.log("=".repeat(80) + "\n");

  const successful = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status === "failed");
  const timeout = results.filter((r) => r.status === "timeout");

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏱️  Timeout: ${timeout.length}`);
  console.log(`📊 Total: ${results.length}\n`);

  if (failed.length > 0 || timeout.length > 0) {
    console.log("❌ PROBLEMATIC FEEDS:");
    console.log("-".repeat(80));
    [...failed, ...timeout].forEach((r) => {
      console.log(`  ✗ ${r.name}`);
      console.log(`    URL: ${r.url}`);
      console.log(`    Error: ${r.error}\n`);
    });
  }

  // Calculate success rate
  const successRate = ((successful.length / results.length) * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);

  // Average response time
  const avgResponseTime =
    successful.reduce((sum, r) => sum + (r.responseTime || 0), 0) /
    successful.length;
  console.log(`⏱️  Average Response Time: ${avgResponseTime.toFixed(0)}ms\n`);
}

testAllFeeds().catch(console.error);
