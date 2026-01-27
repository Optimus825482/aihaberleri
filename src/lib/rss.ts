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
 * Total: ~90 feeds (60+ English, 29 Turkish)
 */
export const AI_NEWS_RSS_FEEDS = [
  // ========================================
  // MAJOR GLOBAL NEWS OUTLETS (20 feeds)
  // ========================================
  {
    name: "BBC News - World",
    url: "http://feeds.bbci.co.uk/news/world/rss.xml",
    language: "en",
  },
  {
    name: "BBC News - Technology",
    url: "http://feeds.bbci.co.uk/news/technology/rss.xml",
    language: "en",
  },
  {
    name: "CNN - Top Stories",
    url: "http://rss.cnn.com/rss/edition.rss",
    language: "en",
  },
  {
    name: "CNN - Technology",
    url: "http://rss.cnn.com/rss/edition_technology.rss",
    language: "en",
  },
  {
    name: "Al Jazeera - News",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    language: "en",
  },
  {
    name: "Bloomberg - Technology",
    url: "https://feeds.bloomberg.com/technology/news.rss",
    language: "en",
  },
  {
    name: "The Wall Street Journal - Technology",
    url: "https://feeds.a.dj.com/rss/RSSWSJD.xml",
    language: "en",
  },
  {
    name: "Financial Times - Technology",
    url: "https://www.ft.com/technology?format=rss",
    language: "en",
  },
  {
    name: "NBC News - Technology",
    url: "https://feeds.nbcnews.com/nbcnews/public/tech",
    language: "en",
  },
  {
    name: "ABC News - Technology",
    url: "https://abcnews.go.com/abcnews/technologyheadlines",
    language: "en",
  },
  {
    name: "Sky News - Technology",
    url: "https://feeds.skynews.com/feeds/rss/technology.xml",
    language: "en",
  },
  {
    name: "Deutsche Welle - News",
    url: "https://rss.dw.com/xml/rss-en-all",
    language: "en",
  },
  {
    name: "Euronews - Technology",
    url: "https://www.euronews.com/rss?level=theme&name=sci-tech",
    language: "en",
  },

  // ========================================
  // MAJOR TECH NEWS (AI SECTION) (8 feeds)
  // ========================================
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
    name: "Engadget - Technology",
    url: "https://www.engadget.com/rss.xml",
    language: "en",
  },

  // ========================================
  // TECH NEWS & PUBLICATIONS (18 feeds)
  // ========================================
  {
    name: "The Next Web",
    url: "https://thenextweb.com/feed",
    language: "en",
  },
  {
    name: "TechRadar - News",
    url: "https://www.techradar.com/rss",
    language: "en",
  },
  {
    name: "CNET - News",
    url: "https://www.cnet.com/rss/news/",
    language: "en",
  },
  {
    name: "Mashable - Tech",
    url: "https://mashable.com/feeds/rss/tech",
    language: "en",
  },
  {
    name: "Gizmodo",
    url: "https://gizmodo.com/rss",
    language: "en",
  },
  {
    name: "Lifehacker",
    url: "https://lifehacker.com/rss",
    language: "en",
  },
  {
    name: "Digital Trends",
    url: "https://www.digitaltrends.com/feed/",
    language: "en",
  },
  {
    name: "Tom's Hardware",
    url: "https://www.tomshardware.com/feeds/all",
    language: "en",
  },
  {
    name: "9to5Mac",
    url: "https://9to5mac.com/feed/",
    language: "en",
  },
  {
    name: "9to5Google",
    url: "https://9to5google.com/feed/",
    language: "en",
  },
  {
    name: "Android Authority",
    url: "https://www.androidauthority.com/feed/",
    language: "en",
  },
  {
    name: "Android Police",
    url: "https://www.androidpolice.com/feed/",
    language: "en",
  },
  {
    name: "XDA Developers",
    url: "https://www.xda-developers.com/feed/",
    language: "en",
  },
  {
    name: "Hacker News (YCombinator)",
    url: "https://hnrss.org/frontpage",
    language: "en",
  },
  {
    name: "Product Hunt - Tech",
    url: "https://www.producthunt.com/feed",
    language: "en",
  },

  // ========================================
  // AI FOCUSED PUBLICATIONS (4 feeds)
  // ========================================
  {
    name: "AI News",
    url: "https://www.artificialintelligence-news.com/feed/",
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

  // ========================================
  // RESEARCH & ENGINEERING BLOGS (9 feeds)
  // ========================================
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
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    language: "en",
  },
  {
    name: "Berkeley AI Research (BAIR)",
    url: "https://bair.berkeley.edu/blog/feed.xml",
    language: "en",
  },

  // ========================================
  // BUSINESS & FINANCE (12 feeds)
  // ========================================
  {
    name: "Forbes - Innovation",
    url: "https://www.forbes.com/innovation/feed/",
    language: "en",
  },
  {
    name: "CNBC - Technology",
    url: "https://www.cnbc.com/id/19854910/device/rss/rss.html",
    language: "en",
  },
  {
    name: "The Economist - Technology",
    url: "https://www.economist.com/science-and-technology/rss.xml",
    language: "en",
  },
  {
    name: "Fast Company - Technology",
    url: "https://www.fastcompany.com/technology/rss",
    language: "en",
  },
  {
    name: "MIT Sloan Management Review",
    url: "https://sloanreview.mit.edu/feed/",
    language: "en",
  },
  {
    name: "Seeking Alpha - Technology",
    url: "https://seekingalpha.com/feed.xml",
    language: "en",
  },

  // ========================================
  // SCIENCE & TECHNOLOGY (10 feeds)
  // ========================================
  {
    name: "New Scientist - Technology",
    url: "https://www.newscientist.com/subject/technology/feed/",
    language: "en",
  },
  {
    name: "Popular Science",
    url: "https://www.popsci.com/feed/",
    language: "en",
  },
  {
    name: "Popular Mechanics",
    url: "https://www.popularmechanics.com/rss/all.xml/",
    language: "en",
  },
  {
    name: "Space.com",
    url: "https://www.space.com/feeds/all",
    language: "en",
  },
  {
    name: "Phys.org - Technology",
    url: "https://phys.org/rss-feed/technology-news/",
    language: "en",
  },
  {
    name: "ScienceDaily - Technology",
    url: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml",
    language: "en",
  },
  {
    name: "Futurism",
    url: "https://futurism.com/feed",
    language: "en",
  },
  {
    name: "Singularity Hub",
    url: "https://singularityhub.com/feed/",
    language: "en",
  },
  {
    name: "IEEE Spectrum - Technology",
    url: "https://spectrum.ieee.org/feeds/feed.rss",
    language: "en",
  },

  // ========================================
  // AI & MACHINE LEARNING (7 feeds)
  // ========================================
  {
    name: "Towards Data Science",
    url: "https://towardsdatascience.com/feed",
    language: "en",
  },
  {
    name: "Analytics Vidhya",
    url: "https://www.analyticsvidhya.com/feed/",
    language: "en",
  },
  {
    name: "KDnuggets",
    url: "https://www.kdnuggets.com/feed",
    language: "en",
  },
  {
    name: "Machine Learning Reddit",
    url: "https://www.reddit.com/r/MachineLearning/.rss",
    language: "en",
  },
  {
    name: "AI Trends",
    url: "https://www.aitrends.com/feed/",
    language: "en",
  },

  // ========================================
  // TURKISH GENERAL NEWS SOURCES (21 feeds)
  // ========================================
  {
    name: "Hürriyet - Anasayfa",
    url: "https://www.hurriyet.com.tr/rss/anasayfa",
    language: "tr",
  },
  {
    name: "Hürriyet - Teknoloji",
    url: "https://www.hurriyet.com.tr/rss/teknoloji",
    language: "tr",
  },
  {
    name: "Hürriyet - Gündem",
    url: "https://www.hurriyet.com.tr/rss/gundem",
    language: "tr",
  },
  {
    name: "Milliyet - Anasayfa",
    url: "https://www.milliyet.com.tr/rss/rssnew/gundemrss.xml",
    language: "tr",
  },
  {
    name: "Milliyet - Teknoloji",
    url: "https://www.milliyet.com.tr/rss/rssnew/teknolojirss.xml",
    language: "tr",
  },
  {
    name: "Sabah - Anasayfa",
    url: "https://www.sabah.com.tr/rss/anasayfa.xml",
    language: "tr",
  },
  {
    name: "Habertürk - Anasayfa",
    url: "https://www.haberturk.com/rss",
    language: "tr",
  },
  {
    name: "Habertürk - Teknoloji",
    url: "https://www.haberturk.com/rss/kategori/teknoloji.xml",
    language: "tr",
  },
  {
    name: "NTV - Anasayfa",
    url: "https://www.ntv.com.tr/gundem.rss",
    language: "tr",
  },
  {
    name: "NTV - Teknoloji",
    url: "https://www.ntv.com.tr/teknoloji.rss",
    language: "tr",
  },
  {
    name: "CNN Türk - Anasayfa",
    url: "https://www.cnnturk.com/feed/rss/all/news",
    language: "tr",
  },
  {
    name: "CNN Türk - Teknoloji",
    url: "https://www.cnnturk.com/feed/rss/teknoloji/news",
    language: "tr",
  },
  {
    name: "TRT Haber - Manşet",
    url: "https://www.trthaber.com/manset_articles.rss",
    language: "tr",
  },
  {
    name: "TRT Haber - Teknoloji",
    url: "https://www.trthaber.com/bilim_teknoloji_articles.rss",
    language: "tr",
  },
  {
    name: "TRT Haber - Gündem",
    url: "https://www.trthaber.com/gundem_articles.rss",
    language: "tr",
  },
  {
    name: "Anadolu Ajansı - Gündem",
    url: "https://www.aa.com.tr/tr/rss/default?cat=guncel",
    language: "tr",
  },
  {
    name: "Anadolu Ajansı - Teknoloji",
    url: "https://www.aa.com.tr/tr/rss/default?cat=bilim-teknoloji",
    language: "tr",
  },
  {
    name: "Cumhuriyet - Anasayfa",
    url: "https://www.cumhuriyet.com.tr/rss/son_dakika.xml",
    language: "tr",
  },
  {
    name: "Cumhuriyet - Teknoloji",
    url: "https://www.cumhuriyet.com.tr/rss/72.xml",
    language: "tr",
  },
  {
    name: "T24 - Anasayfa",
    url: "https://t24.com.tr/rss",
    language: "tr",
  },
  {
    name: "BBC Türkçe",
    url: "https://feeds.bbci.co.uk/turkce/rss.xml",
    language: "tr",
  },

  // ========================================
  // TURKISH TECH NEWS SOURCES (4 feeds)
  // ========================================
  {
    name: "Webrazzi - Yapay Zeka",
    url: "https://webrazzi.com/etiket/yapay-zeka/feed",
    language: "tr",
  },
  {
    name: "Webrazzi - Teknoloji",
    url: "https://webrazzi.com/kategori/teknoloji/feed",
    language: "tr",
  },
  {
    name: "ShiftDelete.Net - Anasayfa",
    url: "https://shiftdelete.net/feed",
    language: "tr",
  },
  {
    name: "Log - Teknoloji",
    url: "https://www.log.com.tr/feed/",
    language: "tr",
  },

  // ========================================
  // TURKISH ECONOMY NEWS (3 feeds)
  // ========================================
  {
    name: "Dünya Gazetesi - Ekonomi",
    url: "https://www.dunya.com/rss",
    language: "tr",
  },
  {
    name: "Para Analiz - Ekonomi",
    url: "https://www.paraanaliz.com/feed/",
    language: "tr",
  },
  {
    name: "Ekonomim - Ekonomi",
    url: "https://www.ekonomim.com/rss",
    language: "tr",
  },
];

/**
 * Fetch and parse RSS feed with retry mechanism
 */
export async function fetchRSSFeed(
  feedUrl: string,
  sourceName: string,
  retries: number = 2,
): Promise<RSSItem[]> {
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(
        `📡 RSS feed okunuyor: ${sourceName}${attempt > 0 ? ` (deneme ${attempt + 1})` : ""}`,
      );

      const response = await axios.get(feedUrl, {
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
        validateStatus: (status) => status === 200,
      });

      const xml = response.data;
      const parsed = await parseStringPromise(xml, {
        trim: true,
        normalize: true,
        explicitArray: false,
      });

      // Handle different RSS formats
      let items: any[] = [];

      if (parsed.rss?.channel?.item) {
        // RSS 2.0
        items = Array.isArray(parsed.rss.channel.item)
          ? parsed.rss.channel.item
          : [parsed.rss.channel.item];
      } else if (parsed.feed?.entry) {
        // Atom
        items = Array.isArray(parsed.feed.entry)
          ? parsed.feed.entry
          : [parsed.feed.entry];
      }

      if (items.length === 0) {
        console.warn(`⚠️  Feed boş: ${sourceName}`);
        return [];
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
    } catch (error: any) {
      lastError = error;

      if (attempt < retries) {
        console.warn(
          `⚠️  Hata (${sourceName}), tekrar deneniyor... ${error.message}`,
        );
        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt)),
        );
      }
    }
  }

  console.error(`❌ RSS feed hatası (${sourceName}):`, lastError?.message);
  return [];
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
 * Fetch all RSS feeds with concurrency control
 */
export async function fetchAllRSSFeeds(
  maxConcurrent: number = 5,
): Promise<RSSItem[]> {
  console.log(`📡 ${AI_NEWS_RSS_FEEDS.length} RSS feed okunuyor...`);

  const allItems: RSSItem[] = [];
  const feeds = [...AI_NEWS_RSS_FEEDS];

  // Process feeds in batches to avoid overwhelming servers
  for (let i = 0; i < feeds.length; i += maxConcurrent) {
    const batch = feeds.slice(i, i + maxConcurrent);
    const batchPromises = batch.map((feed) =>
      fetchRSSFeed(feed.url, feed.name),
    );

    const results = await Promise.allSettled(batchPromises);

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    });

    // Small delay between batches
    if (i + maxConcurrent < feeds.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

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

/**
 * Get feed statistics
 */
export function getFeedStatistics() {
  const stats = {
    total: AI_NEWS_RSS_FEEDS.length,
    byLanguage: {} as Record<string, number>,
    byCategory: {
      english: AI_NEWS_RSS_FEEDS.filter((f) => f.language === "en").length,
      turkish: AI_NEWS_RSS_FEEDS.filter((f) => f.language === "tr").length,
    },
  };

  AI_NEWS_RSS_FEEDS.forEach((feed) => {
    stats.byLanguage[feed.language] =
      (stats.byLanguage[feed.language] || 0) + 1;
  });

  return stats;
}

export default {
  fetchRSSFeed,
  fetchAllRSSFeeds,
  filterRecentArticles,
  getFeedStatistics,
  AI_NEWS_RSS_FEEDS,
};
