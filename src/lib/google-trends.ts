import axios from "axios";
import { XMLParser } from "fast-xml-parser";

export interface TrendItem {
  title: string;
  approxTraffic: string;
  description: string;
  pubDate: string;
  link: string;
}

/**
 * Fetch Google Trends Daily Search Trends (US)
 * This gives us what people are ACTUALLY searching for right now.
 */
export async function fetchGoogleTrends(): Promise<TrendItem[]> {
  try {
    console.log("📈 Google Trends verisi çekiliyor...");

    // Try multiple formats and URLs with browser-like headers
    const sources = [
      {
        url: "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US",
        type: "rss",
      },
      {
        url: "https://trends.google.com/trends/trendingsearches/daily/atom?geo=US",
        type: "atom",
      },
      {
        url: "https://trends.google.com/trends/hottrends/atom/feed?pn=p1",
        type: "atom",
      }, // USA Code p1
    ];

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
    };

    let response;

    for (const source of sources) {
      try {
        console.log(`Trying Google Trends Source: ${source.url}`);
        response = await axios.get(source.url, {
          timeout: 8000,
          headers,
        });

        if (response.status === 200) {
          console.log(`✅ Success with ${source.url}`);
          break;
        }
      } catch (e: any) {
        // Just log short error to keep console clean
        console.warn(`⚠️ Failed ${source.url}: ${e.message}`);
      }
    }

    // SUCCESS PATH: Parse Google Data
    if (response && response.status === 200) {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      });

      const result = parser.parse(response.data);
      // Handle different XML structures (RSS vs Atom)
      let items: any[] = [];

      if (result.rss && result.rss.channel && result.rss.channel.item) {
        items = Array.isArray(result.rss.channel.item)
          ? result.rss.channel.item
          : [result.rss.channel.item];
      } else if (result.feed && result.feed.entry) {
        items = Array.isArray(result.feed.entry)
          ? result.feed.entry
          : [result.feed.entry];
      }

      console.log(`✅ ${items.length} Google Trend başlığı bulundu.`);

      return items.map((item: any) => ({
        title: item.title,
        approxTraffic: item["ht:approx_traffic"] || "N/A",
        description: item.description || item.content || "",
        pubDate: item.pubDate || item.published || new Date().toISOString(),
        link: item.link,
      }));
    }

    // FALLBACK PATH: Google Failed, use Brave Search
    console.log(
      "🔄 Google failed/blocked. Switching to Brave for Trend Discovery...",
    );

    // Import Brave dynamically to avoid circular dependencies if any
    const { braveSearch } = await import("./brave");

    // Run a general "trending AI" search via Brave
    const braveTrends = await braveSearch(
      "what are the top trending artificial intelligence news topics and discussions today? list specific key events.",
      {
        count: 5,
        freshness: "pd", // Past day
      },
    );

    console.log(`✅ Brave recovered ${braveTrends.length} trend signals.`);

    return braveTrends.map((t) => ({
      title: t.title,
      approxTraffic: "High Interest", // Artificial label for Brave items
      description: t.description,
      pubDate: new Date().toISOString(),
      link: t.url,
    }));
  } catch (error) {
    console.error("❌ Google Trends & Brave Fallback error:", error);
    return []; // Fail gracefully
  }
}

/**
 * Check if an RSS article matches any active Google Trend
 * Returns a "Trend Boost" score (0-100)
 */
export function calculateGoogleTrendScore(
  articleTitle: string,
  trends: TrendItem[],
): number {
  let score = 0;
  const lowerTitle = articleTitle.toLowerCase();

  for (const trend of trends) {
    if (!trend.title) continue;
    const trendTitle = trend.title.toLowerCase();

    // Exact match or partial match
    // Brave titles might be long, so we check intersection more loosely
    if (lowerTitle.includes(trendTitle) || trendTitle.includes(lowerTitle)) {
      const trafficStr = trend.approxTraffic || "";

      // Brave items get high default score
      if (trafficStr === "High Interest") {
        score = Math.max(score, 85);
      } else {
        // Legacy Google logic
        const traffic = parseInt(trafficStr.replace(/[^0-9]/g, "")) || 0;
        if (trafficStr.includes("M+")) score = Math.max(score, 100);
        else if (traffic >= 500) score = Math.max(score, 80);
        else if (traffic >= 100) score = Math.max(score, 60);
        else score = Math.max(score, 40);
      }
    }
  }

  return score;
}
