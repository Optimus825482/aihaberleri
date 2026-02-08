/**
 * RSS Feed Reader
 * Reads and parses RSS feeds from various AI news sources
 * Supports multi-language feeds with translation priority
 */

import axios from "axios";
import { parseStringPromise } from "xml2js";
import {
  type RSSSource,
  type SupportedLanguage,
  ALL_INTERNATIONAL_SOURCES,
  LANGUAGE_CONFIGS,
  getSourcesByLanguage as getConfigSourcesByLanguage,
} from "../config/rss-sources";

export interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  guid?: string;
  // Multi-language fields
  detectedLanguage?: SupportedLanguage;
  sourceLanguage?: SupportedLanguage;
  reliabilityScore?: number;
  translationPriority?: number;
  sourceId?: string;
  tags?: string[];
}

export interface MultiLanguageFeedResult {
  items: RSSItem[];
  stats: {
    totalFetched: number;
    byLanguage: Record<SupportedLanguage, number>;
    successfulSources: number;
    failedSources: number;
    averageReliability: number;
  };
}

/**
 * AI News RSS Feed Sources
 * Total: ~90 feeds (60+ English, 29 Turkish)
 */
export const AI_NEWS_RSS_FEEDS = [
  // ========================================
  // MAJOR GLOBAL NEWS OUTLETS - TECHNOLOGY ONLY
  // ========================================
  // REMOVED: BBC News - World (general news, not AI-specific)
  {
    name: "BBC News - Technology",
    url: "http://feeds.bbci.co.uk/news/technology/rss.xml",
    language: "en",
  },
  // REMOVED: CNN - Top Stories (general news, not AI-specific)
  {
    name: "CNN - Technology",
    url: "http://rss.cnn.com/rss/edition_technology.rss",
    language: "en",
  },
  // REMOVED: Al Jazeera - News (general news, not AI-specific)
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
  // REMOVED: Deutsche Welle - News (general news, not AI-specific)
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
  // AI FOCUSED PUBLICATIONS (39 feeds) - UPDATED 2026-02-02
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
  // NEW AI-FOCUSED FEEDS (10 feeds added 2026-02-02)
  {
    name: "AI Business",
    url: "https://aibusiness.com/rss.xml",
    language: "en",
  },
  {
    name: "THE DECODER - AI News",
    url: "https://the-decoder.com/feed/",
    language: "en",
  },
  // REMOVED: Unite.AI - RSS feed consistently returns malformed XML (Non-whitespace before first tag)
  // REMOVED: Analytics India Magazine - RSS feed has attribute parsing issues
  {
    name: "The Rundown AI",
    url: "https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml",
    language: "en",
  },
  {
    name: "SiliconANGLE - AI",
    url: "https://siliconangle.com/category/ai/feed",
    language: "en",
  },
  {
    name: "AI Trends",
    url: "https://www.aitrends.com/feed/",
    language: "en",
  },
  {
    name: "Synced - AI Review",
    url: "https://syncedreview.com/feed",
    language: "en",
  },
  {
    name: "The Gradient",
    url: "https://thegradient.pub/rss/",
    language: "en",
  },
  {
    name: "The Algorithmic Bridge",
    url: "https://thealgorithmicbridge.substack.com/feed",
    language: "en",
  },
  // ADDITIONAL TESTED & WORKING FEEDS (25 feeds from GitHub test - 2026-02-02)
  {
    name: "404 Media",
    url: "https://www.404media.co/rss",
    language: "en",
  },
  {
    name: "Ahead of AI",
    url: "https://magazine.sebastianraschka.com/feed",
    language: "en",
  },
  {
    name: "AI Accelerator Institute",
    url: "https://aiacceleratorinstitute.com/rss/",
    language: "en",
  },
  {
    name: "AI - AI-TechPark",
    url: "https://ai-techpark.com/category/ai/feed/",
    language: "en",
  },
  {
    name: "AI Archives | KnowTechie",
    url: "https://knowtechie.com/category/ai/feed/",
    language: "en",
  },
  {
    name: "AIModels.fyi",
    url: "https://aimodels.substack.com/feed",
    language: "en",
  },
  {
    name: "AI Now Institute",
    url: "https://ainowinstitute.org/category/news/feed",
    language: "en",
  },
  {
    name: "AI Snake Oil",
    url: "https://aisnakeoil.substack.com/feed",
    language: "en",
  },
  {
    name: "Ars Technica - All Content",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    language: "en",
  },
  {
    name: "Artificial Intelligence – Futurism",
    url: "https://futurism.com/categories/ai-artificial-intelligence/feed",
    language: "en",
  },
  {
    name: "Artificial Intelligence News - ScienceDaily",
    url: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml",
    language: "en",
  },
  {
    name: "Machine Learning Mastery Blog",
    url: "https://machinelearningmastery.com/blog/feed",
    language: "en",
  },
  {
    name: "Chain of Thought",
    url: "https://every.to/chain-of-thought/feed.xml",
    language: "en",
  },
  {
    name: "Chip Huyen",
    url: "https://huyenchip.com/feed",
    language: "en",
  },
  {
    name: "Crunchbase News",
    url: "https://news.crunchbase.com/feed",
    language: "en",
  },
  {
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    language: "en",
  },
  {
    name: "KDnuggets",
    url: "https://www.kdnuggets.com/feed",
    language: "en",
  },
  {
    name: "LangChain Blog",
    url: "https://blog.langchain.dev/rss/",
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
  // DISABLED: Parse error - "Cannot convert object to primitive value" (01.02.2026)
  // {
  //   name: "Microsoft Azure AI Blog",
  //   url: "https://azure.microsoft.com/en-us/blog/topics/artificial-intelligence/feed/",
  //   language: "en",
  // },
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
  // DISABLED: 403 Forbidden hatası (01.02.2026)
  // {
  //   name: "CNBC - Technology",
  //   url: "https://www.cnbc.com/id/19854910/device/rss/rss.html",
  //   language: "en",
  // },
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

  // Only log detailed error info for debugging (not every retry)
  if (lastError) {
    console.error(`❌ RSS feed hatası (${sourceName}): ${lastError.message}`);
    if (process.env.NODE_ENV === "development") {
      console.error(`   Line: ${(lastError as any).line || "N/A"}`);
      console.error(`   Column: ${(lastError as any).column || "N/A"}`);
    }
  }
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
    const seenTitleArray = Array.from(seenTitles);
    for (const seenTitle of seenTitleArray) {
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
  // Multi-language exports
  fetchMultiLanguageFeeds,
  getSourcesByLanguage,
  detectArticleLanguage,
  getSourceReliabilityScore,
  updateSourceReliability,
  getTranslationPriorityQueue,
  getMultiLanguageStatistics,
};

// ============================================
// MULTI-LANGUAGE RSS FUNCTIONS
// ============================================

/**
 * Language detection patterns for article content
 */
const LANGUAGE_PATTERNS: Record<SupportedLanguage, RegExp[]> = {
  en: [
    /\b(the|and|is|are|was|were|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|shall|can|need|dare|ought|used|to|of|in|for|on|with|at|by|from|up|about|into|over|after)\b/gi,
    /\b(artificial intelligence|machine learning|deep learning|neural network|algorithm|data|technology|research|development|innovation)\b/gi,
  ],
  de: [
    /\b(der|die|das|ein|eine|und|ist|sind|war|waren|haben|hat|hatte|werden|wird|wurde|können|kann|müssen|muss|sollen|soll|wollen|will|dürfen|darf|mögen|mag)\b/gi,
    /\b(künstliche intelligenz|maschinelles lernen|technologie|forschung|entwicklung|daten|algorithmus)\b/gi,
    /[äöüß]/gi,
  ],
  fr: [
    /\b(le|la|les|un|une|des|et|est|sont|était|étaient|avoir|a|eu|être|sera|seront|peut|peuvent|doit|doivent|veut|veulent)\b/gi,
    /\b(intelligence artificielle|apprentissage automatique|technologie|recherche|développement|données|algorithme)\b/gi,
    /[àâçéèêëîïôûùüÿœæ]/gi,
  ],
  zh: [
    /[\u4e00-\u9fff]/g, // Chinese characters
    /[\u3400-\u4dbf]/g, // CJK Extension A
  ],
  ja: [
    /[\u3040-\u309f]/g, // Hiragana
    /[\u30a0-\u30ff]/g, // Katakana
    /[\u4e00-\u9fff]/g, // Kanji (shared with Chinese)
  ],
  ko: [
    /[\uac00-\ud7af]/g, // Hangul syllables
    /[\u1100-\u11ff]/g, // Hangul Jamo
  ],
  tr: [
    /\b(ve|veya|ile|için|bir|bu|şu|o|ben|sen|biz|siz|onlar|var|yok|değil|ama|fakat|çünkü|eğer|nasıl|neden|ne|kim|nerede|hangi)\b/gi,
    /[çğıöşüÇĞİÖŞÜ]/g,
  ],
};

/**
 * Detect the language of an article based on content analysis
 */
export function detectArticleLanguage(article: RSSItem): SupportedLanguage {
  const text = `${article.title} ${article.description}`.toLowerCase();
  const scores: Record<SupportedLanguage, number> = {
    en: 0,
    de: 0,
    fr: 0,
    zh: 0,
    ja: 0,
    ko: 0,
    tr: 0,
  };

  // Check for CJK characters first (more distinctive)
  const chineseMatches = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const hiraganaMatches = (text.match(/[\u3040-\u309f]/g) || []).length;
  const katakanaMatches = (text.match(/[\u30a0-\u30ff]/g) || []).length;
  const hangulMatches = (text.match(/[\uac00-\ud7af]/g) || []).length;

  // Japanese has hiragana/katakana mixed with kanji
  if (hiraganaMatches > 5 || katakanaMatches > 5) {
    scores.ja += 100;
  }

  // Korean has hangul
  if (hangulMatches > 10) {
    scores.ko += 100;
  }

  // Chinese has only hanzi (no hiragana/katakana)
  if (
    chineseMatches > 10 &&
    hiraganaMatches === 0 &&
    katakanaMatches === 0 &&
    hangulMatches === 0
  ) {
    scores.zh += 100;
  }

  // Check European languages
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    if (["zh", "ja", "ko"].includes(lang)) continue; // Already handled

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        scores[lang as SupportedLanguage] += matches.length;
      }
    }
  }

  // Find the language with highest score
  let maxScore = 0;
  let detectedLang: SupportedLanguage = "en"; // Default to English

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang as SupportedLanguage;
    }
  }

  return detectedLang;
}

/**
 * Get sources by language (wrapper for config function)
 */
export function getSourcesByLanguage(lang: SupportedLanguage): RSSSource[] {
  return getConfigSourcesByLanguage(lang);
}

/**
 * Get the reliability score for a source URL
 */
export function getSourceReliabilityScore(sourceUrl: string): number {
  const source = ALL_INTERNATIONAL_SOURCES.find((s) => s.url === sourceUrl);
  return source?.reliabilityScore ?? 50; // Default to 50 if not found
}

/**
 * Update source reliability based on fetch success/failure
 * This is a runtime adjustment (doesn't persist)
 * WITH TIMESTAMP FOR AUTO CLEANUP
 */
interface ReliabilityEntry {
  adjustment: number;
  timestamp: number;
}

const sourceReliabilityAdjustments: Map<string, ReliabilityEntry> = new Map();
const RELIABILITY_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour cleanup interval
const RELIABILITY_ENTRY_TTL = 24 * 60 * 60 * 1000; // 24 hours TTL
let reliabilityCleanupIntervalId: NodeJS.Timeout | null = null;

export function updateSourceReliability(
  sourceId: string,
  success: boolean,
): void {
  const entry = sourceReliabilityAdjustments.get(sourceId);
  const current = entry?.adjustment || 0;
  const adjustment = success
    ? Math.min(current + 1, 10)
    : Math.max(current - 5, -30);
  sourceReliabilityAdjustments.set(sourceId, {
    adjustment,
    timestamp: Date.now(),
  });
}

export function getAdjustedReliability(source: RSSSource): number {
  const entry = sourceReliabilityAdjustments.get(source.id);
  const adjustment = entry?.adjustment || 0;
  return Math.max(0, Math.min(100, source.reliabilityScore + adjustment));
}

/**
 * Cleanup expired reliability adjustments
 * Should be called periodically to prevent memory leaks
 */
export function cleanupSourceReliability(): number {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, entry] of sourceReliabilityAdjustments.entries()) {
    if (now - entry.timestamp > RELIABILITY_ENTRY_TTL) {
      sourceReliabilityAdjustments.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned ${cleanedCount} expired reliability entries (remaining: ${sourceReliabilityAdjustments.size})`);
  }

  return cleanedCount;
}

/**
 * Start automatic reliability cleanup interval
 * Call this on application startup
 */
export function startSourceReliabilityCleanup(): void {
  if (reliabilityCleanupIntervalId) {
    return; // Already running
  }

  reliabilityCleanupIntervalId = setInterval(() => {
    cleanupSourceReliability();
  }, RELIABILITY_CLEANUP_INTERVAL);

  console.log(`🧹 Source reliability cleanup started (interval: ${RELIABILITY_CLEANUP_INTERVAL / 60000} min, TTL: ${RELIABILITY_ENTRY_TTL / (60 * 60 * 1000)} hours)`);
}

/**
 * Stop automatic reliability cleanup interval
 * Call this on graceful shutdown
 */
export function stopSourceReliabilityCleanup(): void {
  if (reliabilityCleanupIntervalId) {
    clearInterval(reliabilityCleanupIntervalId);
    reliabilityCleanupIntervalId = null;
    console.log("🧹 Source reliability cleanup stopped");
  }
}

// Auto-start cleanup in non-build environments
if (process.env.NODE_ENV !== "build" && typeof globalThis.setInterval !== "undefined") {
  startSourceReliabilityCleanup();
}

/**
 * Fetch RSS feed from a configured source
 */
async function fetchFromSource(source: RSSSource): Promise<RSSItem[]> {
  try {
    console.log(
      `📡 [${source.language.toUpperCase()}] Fetching: ${source.name}`,
    );

    const response = await axios.get(source.url, {
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/2.0; Multi-Language)",
        Accept:
          "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
        "Accept-Language":
          "en-US,en;q=0.9,de;q=0.8,fr;q=0.7,zh;q=0.6,ja;q=0.5,ko;q=0.4",
      },
      validateStatus: (status) => status === 200,
      responseType: "text",
    });

    const xml = response.data;
    const parsed = await parseStringPromise(xml, {
      trim: true,
      normalize: true,
      explicitArray: false,
    });

    let items: any[] = [];

    if (parsed.rss?.channel?.item) {
      items = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];
    } else if (parsed.feed?.entry) {
      items = Array.isArray(parsed.feed.entry)
        ? parsed.feed.entry
        : [parsed.feed.entry];
    } else if (parsed["rdf:RDF"]?.item) {
      items = Array.isArray(parsed["rdf:RDF"].item)
        ? parsed["rdf:RDF"].item
        : [parsed["rdf:RDF"].item];
    }

    if (items.length === 0) {
      console.warn(`⚠️  Empty feed: ${source.name}`);
      updateSourceReliability(source.id, false);
      return [];
    }

    const rssItems: RSSItem[] = items.slice(0, 15).map((item: any) => {
      const rssItem: RSSItem = {
        title: extractText(item.title),
        description: extractText(
          item.description ||
            item.summary ||
            item.content ||
            item["content:encoded"],
        ),
        link: extractLink(item.link),
        pubDate: extractText(
          item.pubDate || item.published || item.updated || item["dc:date"],
        ),
        source: source.name,
        guid: extractText(item.guid || item.id),
        sourceLanguage: source.language,
        reliabilityScore: getAdjustedReliability(source),
        sourceId: source.id,
        tags: source.tags,
      };

      // Detect actual language of content
      rssItem.detectedLanguage = detectArticleLanguage(rssItem);

      // Calculate translation priority
      rssItem.translationPriority = calculateTranslationPriority(
        rssItem,
        source,
      );

      return rssItem;
    });

    console.log(
      `✅ [${source.language.toUpperCase()}] ${rssItems.length} articles from ${source.name}`,
    );
    updateSourceReliability(source.id, true);
    return rssItems;
  } catch (error: any) {
    console.error(
      `❌ [${source.language.toUpperCase()}] Failed: ${source.name} - ${error.message}`,
    );
    updateSourceReliability(source.id, false);
    return [];
  }
}

/**
 * Calculate translation priority for an article
 * Higher score = translate first
 */
function calculateTranslationPriority(
  item: RSSItem,
  source: RSSSource,
): number {
  let priority = 0;

  // Base priority from source priority (1-5 -> 10-50)
  priority += source.priority * 10;

  // Reliability bonus (0-100 -> 0-20)
  priority += source.reliabilityScore / 5;

  // Recency bonus
  try {
    const pubDate = new Date(item.pubDate);
    const hoursAgo = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 6) priority += 30;
    else if (hoursAgo < 12) priority += 20;
    else if (hoursAgo < 24) priority += 10;
  } catch {
    // Ignore date parsing errors
  }

  // Title length bonus (longer titles often more substantial)
  if (item.title.length > 50) priority += 5;

  // High-value tags bonus
  const highValueTags = [
    "breaking-news",
    "official",
    "research",
    "announcements",
  ];
  if (source.tags.some((tag) => highValueTags.includes(tag))) {
    priority += 15;
  }

  return priority;
}

/**
 * Fetch feeds from multiple languages with concurrency control
 */
export async function fetchMultiLanguageFeeds(
  options: {
    languages?: SupportedLanguage[];
    minPriority?: number;
    minReliability?: number;
    maxConcurrent?: number;
    maxPerSource?: number;
  } = {},
): Promise<MultiLanguageFeedResult> {
  const {
    languages = ["en", "de", "fr", "zh", "ja", "ko"],
    minPriority = 3,
    minReliability = 70,
    maxConcurrent = 8,
    maxPerSource = 15,
  } = options;

  console.log(`\n🌍 Fetching multi-language feeds...`);
  console.log(`   Languages: ${languages.join(", ").toUpperCase()}`);
  console.log(
    `   Min Priority: ${minPriority}, Min Reliability: ${minReliability}`,
  );

  // Filter sources based on criteria
  let sources = ALL_INTERNATIONAL_SOURCES.filter(
    (source) =>
      source.isActive &&
      languages.includes(source.language) &&
      source.priority >= minPriority &&
      source.reliabilityScore >= minReliability,
  );

  // Sort by priority and reliability
  sources = sources.sort((a, b) => {
    const scoreA = a.priority * 20 + a.reliabilityScore;
    const scoreB = b.priority * 20 + b.reliabilityScore;
    return scoreB - scoreA;
  });

  console.log(`   Sources to fetch: ${sources.length}`);

  const allItems: RSSItem[] = [];
  const stats = {
    totalFetched: 0,
    byLanguage: {} as Record<SupportedLanguage, number>,
    successfulSources: 0,
    failedSources: 0,
    averageReliability: 0,
  };

  // Initialize language counts
  for (const lang of languages) {
    stats.byLanguage[lang] = 0;
  }

  // Process in batches
  for (let i = 0; i < sources.length; i += maxConcurrent) {
    const batch = sources.slice(i, i + maxConcurrent);
    const batchPromises = batch.map((source) => fetchFromSource(source));

    const results = await Promise.allSettled(batchPromises);

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const source = batch[j];

      if (result.status === "fulfilled" && result.value.length > 0) {
        const items = result.value.slice(0, maxPerSource);
        allItems.push(...items);
        stats.successfulSources++;
        stats.byLanguage[source.language] =
          (stats.byLanguage[source.language] || 0) + items.length;
      } else {
        stats.failedSources++;
      }
    }

    // Rate limiting between batches
    if (i + maxConcurrent < sources.length) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  // Remove duplicates
  const uniqueItems = removeDuplicatesMultiLang(allItems);

  stats.totalFetched = uniqueItems.length;
  stats.averageReliability = Math.round(
    uniqueItems.reduce((sum, item) => sum + (item.reliabilityScore || 50), 0) /
      (uniqueItems.length || 1),
  );

  console.log(`\n✅ Multi-language fetch complete:`);
  console.log(`   Total articles: ${stats.totalFetched}`);
  console.log(
    `   Successful sources: ${stats.successfulSources}/${sources.length}`,
  );
  console.log(`   By language: ${JSON.stringify(stats.byLanguage)}`);

  return { items: uniqueItems, stats };
}

/**
 * Remove duplicates from multi-language feeds
 */
function removeDuplicatesMultiLang(items: RSSItem[]): RSSItem[] {
  const unique: RSSItem[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  for (const item of items) {
    // Normalize URL
    const normalizedUrl = item.link
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/, "")
      .replace(/\/$/, "")
      .split("?")[0];

    // Normalize title
    const normalizedTitle = item.title
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, "")
      .trim();

    if (seenUrls.has(normalizedUrl)) continue;

    // Check for similar titles
    let isDuplicate = false;
    const seenTitleArray = Array.from(seenTitles);
    for (const seenTitle of seenTitleArray) {
      if (
        normalizedTitle === seenTitle ||
        (normalizedTitle.length > 20 &&
          seenTitle.includes(normalizedTitle.slice(0, 20)))
      ) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(item);
      seenUrls.add(normalizedUrl);
      seenTitles.add(normalizedTitle);
    }
  }

  return unique;
}

/**
 * Get translation priority queue
 * Returns articles sorted by translation priority (highest first)
 */
export function getTranslationPriorityQueue(
  items: RSSItem[],
  targetLanguage: SupportedLanguage = "tr",
  limit: number = 50,
): RSSItem[] {
  // Filter items that need translation
  const needsTranslation = items.filter(
    (item) =>
      item.detectedLanguage !== targetLanguage &&
      item.sourceLanguage !== targetLanguage,
  );

  // Sort by translation priority
  const sorted = needsTranslation.sort((a, b) => {
    const priorityA = a.translationPriority || 0;
    const priorityB = b.translationPriority || 0;
    return priorityB - priorityA;
  });

  return sorted.slice(0, limit);
}

/**
 * Get multi-language statistics
 */
export function getMultiLanguageStatistics() {
  const stats = {
    totalSources: ALL_INTERNATIONAL_SOURCES.length,
    activeSources: ALL_INTERNATIONAL_SOURCES.filter((s) => s.isActive).length,
    byLanguage: {} as Record<
      SupportedLanguage,
      { count: number; avgReliability: number }
    >,
    topSources: [] as { name: string; language: string; reliability: number }[],
    languageConfigs: LANGUAGE_CONFIGS,
  };

  const languages: SupportedLanguage[] = [
    "en",
    "de",
    "fr",
    "zh",
    "ja",
    "ko",
    "tr",
  ];

  for (const lang of languages) {
    const sources = ALL_INTERNATIONAL_SOURCES.filter(
      (s) => s.language === lang && s.isActive,
    );
    stats.byLanguage[lang] = {
      count: sources.length,
      avgReliability:
        sources.length > 0
          ? Math.round(
              sources.reduce((sum, s) => sum + s.reliabilityScore, 0) /
                sources.length,
            )
          : 0,
    };
  }

  // Top 10 sources by reliability
  stats.topSources = ALL_INTERNATIONAL_SOURCES.filter((s) => s.isActive)
    .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
    .slice(0, 10)
    .map((s) => ({
      name: s.name,
      language: s.language,
      reliability: s.reliabilityScore,
    }));

  return stats;
}
