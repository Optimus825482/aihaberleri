/**
 * RSS Feed Reader
 * Reads and parses RSS feeds from various AI news sources
 */

import axios from "axios";
import { parseStringPromise } from "xml2js";

export interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  guid?: string;
}

/**
 * AI News RSS Feed Sources
 */
export const AI_NEWS_RSS_FEEDS = [
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
    url: "https://www.engadget.com/rss.xml", // Engadget doesn't have a specific AI feed but covers it heavily
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

/**
 * Fetch and parse RSS feed
 */
export async function fetchRSSFeed(
  feedUrl: string,
  sourceName: string,
): Promise<RSSItem[]> {
  try {
    console.log(`📡 RSS feed okunuyor: ${sourceName}`);

    const response = await axios.get(feedUrl, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)",
      },
    });

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

    const rssItems: RSSItem[] = items.slice(0, 10).map((item: any) => ({
      title: extractText(item.title),
      description: extractText(
        item.description || item.summary || item.content,
      ),
      link: extractLink(item.link),
      pubDate: extractText(item.pubDate || item.published || item.updated),
      source: sourceName,
      guid: extractText(item.guid || item.id),
    }));

    console.log(`✅ ${rssItems.length} haber bulundu: ${sourceName}`);
    return rssItems;
  } catch (error) {
    console.error(`❌ RSS feed hatası (${sourceName}):`, error);
    return [];
  }
}

/**
 * Extract text from XML element
 */
function extractText(element: any): string {
  if (!element) return "";
  if (typeof element === "string") return element;
  if (Array.isArray(element)) return extractText(element[0]);
  if (element._) return element._;
  if (element.$?.href) return element.$.href;
  return String(element);
}

/**
 * Extract link from XML element
 */
function extractLink(element: any): string {
  if (!element) return "";
  if (typeof element === "string") return element;
  if (Array.isArray(element)) return extractLink(element[0]);
  if (element.$?.href) return element.$.href;
  if (element._) return element._;
  return String(element);
}

/**
 * Fetch all RSS feeds
 */
export async function fetchAllRSSFeeds(): Promise<RSSItem[]> {
  console.log(`📡 ${AI_NEWS_RSS_FEEDS.length} RSS feed okunuyor...`);

  const feedPromises = AI_NEWS_RSS_FEEDS.map((feed) =>
    fetchRSSFeed(feed.url, feed.name),
  );

  const results = await Promise.allSettled(feedPromises);

  const allItems: RSSItem[] = [];
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  });

  console.log(`✅ Toplam ${allItems.length} haber toplandı`);

  // Remove duplicates based on title similarity
  const uniqueItems = removeDuplicates(allItems);
  console.log(`✅ ${uniqueItems.length} benzersiz haber`);

  return uniqueItems;
}

/**
 * Remove duplicate articles based on title similarity
 */
function removeDuplicates(items: RSSItem[]): RSSItem[] {
  const unique: RSSItem[] = [];
  const seenTitles = new Set<string>();

  for (const item of items) {
    const normalizedTitle = item.title.toLowerCase().trim();

    // Check if similar title exists
    let isDuplicate = false;
    for (const seenTitle of seenTitles) {
      if (
        normalizedTitle === seenTitle ||
        normalizedTitle.includes(seenTitle) ||
        seenTitle.includes(normalizedTitle)
      ) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(item);
      seenTitles.add(normalizedTitle);
    }
  }

  return unique;
}

/**
 * Filter recent articles (last 48 hours)
 */
export function filterRecentArticles(
  items: RSSItem[],
  hoursAgo: number = 48,
): RSSItem[] {
  const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  return items.filter((item) => {
    try {
      const pubDate = new Date(item.pubDate);
      return pubDate >= cutoffDate;
    } catch {
      return true; // Include if date parsing fails
    }
  });
}

export default {
  fetchRSSFeed,
  fetchAllRSSFeeds,
  filterRecentArticles,
  AI_NEWS_RSS_FEEDS,
};
