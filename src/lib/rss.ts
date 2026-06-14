/**
 * RSS Feed Reader
 * Reads and parses RSS feeds from various AI news sources
 * Supports multi-language feeds with translation priority
 *
 * UPDATED: 2026-02-09
 * - REMOVED: 35+ non-AI sources (journalism, SEO, general tech, media)
 * - ADDED: 25+ pure AI-focused sources
 * - Focus: AI, Machine Learning, LLM, Generative AI, AI Research
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
import { getRedis } from "./redis";

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
 * Total: ~65 feeds (PURE AI-FOCUSED ONLY)
 *
 * REMOVED (2026-02-09): 35+ non-AI sources
 * - Engadget, Product Hunt (general tech)
 * - Poynter, Nieman Lab, Journalism UK (journalism)
 * - SE Ranking, Semrush, Similarweb (SEO tools)
 * - WAN-IFRA, FIPP, C21Media (media industry)
 * - Google Keyword Blog (general Google news)
 * - Crunchbase (startup funding, not AI-specific)
 * - All journalism/newsroom tools feeds
 */
export const AI_NEWS_RSS_FEEDS = [
  // ========================================
  // TIER 1: MAJOR AI NEWS (Best Quality)
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
    name: "Wired - AI",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
    language: "en",
  },
  // REMOVED: Ars Technica - uses general technology-lab feed, not AI-specific
  // Was causing non-AI tech articles to leak through
  {
    name: "ZDNet - Artificial Intelligence",
    url: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml",
    language: "en",
  },

  // ========================================
  // TIER 2: AI-FOCUSED PUBLICATIONS
  // ========================================
  // ❌ AI News - DISABLED (2026-06-14): HTTP 403 Forbidden consistently
  // {
  //   name: "AI News",
  //   url: "https://www.artificialintelligence-news.com/feed/",
  //   language: "en",
  // },
  // ❌ MarkTechPost - DISABLED (2026-06-14): HTTP 403 Forbidden consistently
  // {
  //   name: "MarkTechPost",
  //   url: "https://www.marktechpost.com/feed/",
  //   language: "en",
  // },
  {
    name: "THE DECODER - AI News",
    url: "https://the-decoder.com/feed/",
    language: "en",
  },
  {
    name: "The Rundown AI",
    url: "https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml",
    language: "en",
  },
  {
    name: "AI Business",
    url: "https://aibusiness.com/rss.xml",
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
  // REMOVED: 404 Media - general tech/privacy news, not AI-focused
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
  // {
  //   name: "AI - AI-TechPark",
  //   url: "https://ai-techpark.com/category/ai/feed/",
  //   language: "en",
  // }, // Disabled: 403 since 2026-02-12
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
    name: "Artificial Intelligence – Futurism",
    url: "https://futurism.com/categories/ai-artificial-intelligence/feed",
    language: "en",
  },
  {
    name: "Artificial Intelligence - ScienceDaily",
    url: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml",
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

  // ========================================
  // TIER 3: AI RESEARCH & COMPANY BLOGS
  // ========================================
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
    name: "AWS Machine Learning Blog",
    url: "https://aws.amazon.com/blogs/machine-learning/feed/",
    language: "en",
  },
  // {
  //   name: "Hugging Face Blog",
  //   url: "https://huggingface.co/blog/feed.xml",
  //   language: "en",
  // }, // Disabled: 403 since 2026-02-12 (also in rss-sources.ts)
  {
    name: "Berkeley AI Research (BAIR)",
    url: "https://bair.berkeley.edu/blog/feed.xml",
    language: "en",
  },
  {
    name: "Google Research",
    url: "https://research.google/blog/rss/",
    language: "en",
  },
  {
    name: "Apple Machine Learning Research",
    url: "https://machinelearning.apple.com/rss.xml",
    language: "en",
  },
  // ❌ Microsoft AI Blog - DISABLED (2026-06-14): HTTP 410 Gone consistently
  // {
  //   name: "Microsoft AI Blog",
  //   url: "https://blogs.microsoft.com/ai/feed/",
  //   language: "en",
  // },
  // DISABLED (12.02.2026): Consistently returns empty RSS feed
  // {
  //   name: "Meta AI Blog",
  //   url: "https://ai.meta.com/blog/rss/",
  //   language: "en",
  // },
  // DISABLED (12.02.2026): HTTP 404 — feed URL no longer exists
  // {
  //   name: "Anthropic Research",
  //   url: "https://www.anthropic.com/research/rss.xml",
  //   language: "en",
  // },

  // ========================================
  // TIER 4: AI/ML LEARNING & COMMUNITY
  // ========================================
  {
    name: "Machine Learning Mastery",
    url: "https://machinelearningmastery.com/feed/",
    language: "en",
  },
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
    name: "r/artificial",
    url: "https://www.reddit.com/r/artificial/.rss",
    language: "en",
  },
  {
    name: "r/ChatGPT",
    url: "https://www.reddit.com/r/ChatGPT/.rss",
    language: "en",
  },
  {
    name: "r/LocalLLaMA",
    url: "https://www.reddit.com/r/LocalLLaMA/.rss",
    language: "en",
  },
  {
    name: "Hacker News (AI filtered - 50+ points)",
    url: "https://hnrss.org/newest?q=AI+OR+GPT+OR+LLM+OR+machine+learning+OR+OpenAI+OR+Anthropic+OR+Claude+OR+Gemini&points=50",
    language: "en",
  },
  {
    name: "LangChain Blog",
    url: "https://blog.langchain.dev/rss/",
    language: "en",
  },

  // ========================================
  // TIER 5: AI NEWSLETTERS & NEW SOURCES
  // ========================================
  {
    name: "Import AI",
    url: "https://importai.substack.com/feed",
    language: "en",
  },
  {
    name: "Prompt Engineering Daily",
    url: "https://promptengineering.substack.com/feed",
    language: "en",
  },
  {
    name: "Last Week in AI",
    url: "https://lastweekin.ai/feed",
    language: "en",
  },
  {
    name: "Gary Marcus",
    url: "https://garymarcus.substack.com/feed",
    language: "en",
  },
  {
    name: "Cognitive Revolution",
    url: "https://cognitiverevolution.substack.com/feed",
    language: "en",
  },
  {
    name: "AI Tidbits",
    url: "https://aitidbits.substack.com/feed",
    language: "en",
  },
  // DISABLED (12.02.2026): HTTP 403 Forbidden
  // {
  //   name: "The Neuron Daily",
  //   url: "https://www.theneurondaily.com/feed",
  //   language: "en",
  // },
  {
    name: "Interconnects",
    url: "https://www.interconnects.ai/feed",
    language: "en",
  },
  {
    name: "Ahead of AI (Sebastian Raschka)",
    url: "https://magazine.sebastianraschka.com/feed",
    language: "en",
  },
  {
    name: "Latent Space",
    url: "https://www.latent.space/feed",
    language: "en",
  },
  {
    name: "The Algorithmic Bridge",
    url: "https://thealgorithmicbridge.substack.com/feed",
    language: "en",
  },

  // ========================================
  // TIER 5.5: HIGH-FREQUENCY AI SOURCES (2026-02-10)
  // Added to guarantee minimum 1 article per 15 minutes
  // Updated 2026-02-11: Removed broken feeds (404/403/parse errors)
  // ========================================
  {
    name: "Ars Technica - AI",
    url: "https://feeds.arstechnica.com/arstechnica/features",
    language: "en",
  },
  {
    name: "The Register - AI",
    url: "https://www.theregister.com/software/ai_ml/headlines.atom",
    language: "en",
  },
  {
    name: "Weights & Biases Blog",
    url: "https://wandb.ai/fully-connected/rss.xml",
    language: "en",
  },
  // ❌ Hacker News - AI duplicate removed (same URL as line 325)
  {
    name: "r/singularity",
    url: "https://www.reddit.com/r/singularity/.rss",
    language: "en",
  },
  {
    name: "r/OpenAI",
    url: "https://www.reddit.com/r/OpenAI/.rss",
    language: "en",
  },
  {
    name: "r/StableDiffusion",
    url: "https://www.reddit.com/r/StableDiffusion/.rss",
    language: "en",
  },
  {
    name: "Simon Willison's Weblog",
    url: "https://simonwillison.net/atom/everything/",
    language: "en",
  },
  {
    name: "Lilian Weng Blog",
    url: "https://lilianweng.github.io/index.xml",
    language: "en",
  },
  {
    name: "Jay Alammar Blog",
    url: "https://jalammar.github.io/feed.xml",
    language: "en",
  },
  // ❌ Cohere Blog - DISABLED: not valid XML/RSS (tested 2026-03-01)
  // { name: "Cohere Blog", url: "https://cohere.com/blog/rss.xml", language: "en" },
  {
    name: "Replicate Blog",
    url: "https://replicate.com/blog/rss",
    language: "en",
  },
  {
    name: "AI Supremacy (Substack)",
    url: "https://aisupremacy.substack.com/feed",
    language: "en",
  },
  {
    name: "One Useful Thing",
    url: "https://www.oneusefulthing.org/feed",
    language: "en",
  },

  // ========================================
  // TIER 7: RESULT.MD INTEGRATION (2026-03)
  // Academic, Corporate, Media, Specialized, Education, Ethics
  // ========================================

  // 🎓 Academic & Research
  {
    name: "MIT News - AI",
    url: "https://news.mit.edu/rss/topic/artificial-intelligence2",
    language: "en",
  },
  // ❌ Stanford HAI - DISABLED: not valid XML/RSS (tested 2026-03-01)
  // { name: "Stanford HAI", url: "https://hai.stanford.edu/news/rss.xml", language: "en" },
  // ❌ AI2 (Allen Institute) - DISABLED: HTTP 404 (tested 2026-03-01)
  // { name: "AI2 (Allen Institute)", url: "https://allenai.org/blog/rss.xml", language: "en" },
  {
    name: "arXiv cs.AI",
    url: "http://export.arxiv.org/rss/cs.AI",
    language: "en",
  },
  // ❌ CMU AI - DISABLED: HTTP 500 (tested 2026-03-01)
  // { name: "CMU AI", url: "https://www.cs.cmu.edu/ai/feed", language: "en" },
  // ❌ NIST AI - DISABLED: HTTP 404 (tested 2026-03-01)
  // { name: "NIST AI", url: "https://www.nist.gov/artificial-intelligence/rss-feed", language: "en" },

  // 🏢 Corporate AI Blogs (new endpoints)
  {
    name: "NVIDIA Developer Blog",
    url: "https://developer.nvidia.com/blog/feed/",
    language: "en",
  },
  {
    name: "AWS AI Blog",
    url: "https://aws.amazon.com/blogs/ai/feed/",
    language: "en",
  },
  // ❌ Meta AI (FB News) - DISABLED: HTTP 404 (tested 2026-03-01)
  // { name: "Meta AI (FB News)", url: "https://about.fb.com/news/category/ai/feed/", language: "en" },
  // ❌ IBM Developer AI - DISABLED: HTTP 404 (tested 2026-03-01)
  // { name: "IBM Developer AI", url: "https://developer.ibm.com/analytics/feed/", language: "en" },
  // ❌ Intel AI Blog - DISABLED: HTTP 404 (tested 2026-03-01)
  // { name: "Intel AI Blog", url: "https://www.intel.com/content/www/us/en/artificial-intelligence/ai-blog/rss.xml", language: "en" },
  {
    name: "DataRobot Blog",
    url: "https://www.datarobot.com/blog/rss/",
    language: "en",
  },

  // 📰 Tech Media (AI sections)
  {
    name: "The Guardian - AI",
    url: "https://www.theguardian.com/technology/artificialintelligenceai/rss",
    language: "en",
  },
  {
    name: "Financial Times - AI",
    url: "https://www.ft.com/artificial-intelligence?format=rss",
    language: "en",
  },
  {
    name: "New York Times - Tech",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
    language: "en",
  },
  // ❌ The Conversation - AI - DISABLED: HTTP 404 (tested 2026-03-01)
  // { name: "The Conversation - AI", url: "https://theconversation.com/us/topics/artificial-intelligence-764/feed", language: "en" },

  // 🤖 Specialized AI Publications
  // ❌ AI Weekly - DISABLED: HTTP 404 (tested 2026-03-01)
  // { name: "AI Weekly", url: "https://aiweekly.co/feed/", language: "en" },
  {
    name: "DailyAI",
    url: "https://dailyai.com/feed/",
    language: "en",
  },
  // ❌ AIwire - DISABLED: not valid XML/RSS (tested 2026-03-01)
  // { name: "AIwire", url: "https://aiwire.org/feed/", language: "en" },
  {
    name: "AI Time Journal",
    url: "https://www.aitimejournal.com/feed/",
    language: "en",
  },
  // ❌ InsideAI - DISABLED: not valid XML/RSS (tested 2026-03-01)
  // { name: "InsideAI", url: "https://inside.com/ai/feed/", language: "en" },

  // 📚 Education & Learning
  // ❌ fast.ai Blog - DISABLED: HTTP 404 (tested 2026-03-01)
  // { name: "fast.ai Blog", url: "https://www.fast.ai/feed.xml", language: "en" },
  // ❌ O'Reilly - DISABLED: not valid XML/RSS (tested 2026-03-01)
  // { name: "O'Reilly", url: "https://www.oreilly.com/feed/", language: "en" },
  // ❌ Coursera Blog - DISABLED: HTTP 404 (tested 2026-03-01)
  // { name: "Coursera Blog", url: "https://www.coursera.org/blog/feed", language: "en" },
  // ❌ Kaggle Blog - DISABLED: HTTP 404 (tested 2026-03-01)
  // { name: "Kaggle Blog", url: "https://www.kaggle.com/blog/feed", language: "en" },

  // 🔧 Open Source & Technical
  {
    name: "OpenCV AI",
    url: "https://opencv.org/feed/",
    language: "en",
  },

  // 🌍 Regional
  {
    name: "Indian Express - AI",
    url: "https://indianexpress.com/section/technology/artificial-intelligence/feed/",
    language: "en",
  },
  // ❌ Mint - AI - DISABLED: HTTP 404 (tested 2026-03-01)
  // { name: "Mint - AI", url: "https://www.livemint.com/rss/technology/artificial-intelligence/feed", language: "en" },
  {
    name: "France 24 - AI",
    url: "https://www.france24.com/en/tag/artificial-intelligence/rss",
    language: "en",
  },

  // ⚖️ AI Ethics & Policy
  {
    name: "Future of Life Institute",
    url: "https://futureoflife.org/feed/",
    language: "en",
  },
  {
    name: "Partnership on AI",
    url: "https://www.partnershiponai.org/feed/",
    language: "en",
  },
  // ❌ AI Ethics - DISABLED: fetch failed / unreachable (tested 2026-03-01)
  // { name: "AI Ethics", url: "https://aiethics.ai/feed/", language: "en" },

  // ========================================
  // TIER 6: MULTI-LANGUAGE AI SOURCES
  // ========================================

  // 🇩🇪 German AI Sources
  {
    name: "THE DECODER (DE)",
    url: "https://the-decoder.de/feed/",
    language: "de",
  },

  // 🇫🇷 French AI Sources
  {
    name: "LeBigData.fr - IA",
    url: "https://www.lebigdata.fr/tag/intelligence-artificielle/feed",
    language: "fr",
  },
  {
    name: "ActuIA",
    url: "https://www.actuia.com/feed/",
    language: "fr",
  },

  // 🇨🇳 Chinese AI Sources
  // ❌ 机器之心 (Synced China) - DISABLED: not valid XML/RSS (tested 2026-03-01)
  // { name: "机器之心 (Synced China)", url: "https://www.jiqizhixin.com/rss", language: "zh" },
  {
    name: "量子位 (QbitAI)",
    url: "https://www.qbitai.com/feed",
    language: "zh",
  },

  // 🇯🇵 Japanese AI Sources
  {
    name: "ITmedia AI+",
    url: "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml",
    language: "ja",
  },

  // 🇰🇷 Korean AI Sources
  {
    name: "AI타임스",
    url: "https://www.aitimes.com/rss/allArticle.xml",
    language: "ko",
  },

  // 🇹🇷 Turkish AI Sources
  // DISABLED (12.02.2026): Consistently returns empty feed
  // {
  //   name: "Yapay Zeka Türkiye",
  //   url: "https://yapayzekaturkiye.com/feed/",
  //   language: "tr",
  // },
];

// ============================================================================
// RSS CURSOR SYSTEM — incremental fetching (sadece yeni haberler)
// ============================================================================

/**
 * Return a stable, short Redis key for a given feed URL.
 * Uses a simple djb2-style hash — no crypto needed.
 */
function rssCursorKey(feedUrl: string): string {
  let hash = 5381;
  for (let i = 0; i < feedUrl.length; i++) {
    hash = ((hash << 5) + hash) ^ feedUrl.charCodeAt(i);
    hash = hash >>> 0; // keep 32-bit unsigned
  }
  return `rss:cursor:${hash.toString(36)}`;
}

/**
 * Fetch and parse RSS feed with retry mechanism + HTTP conditional requests.
 * Known unreliable feeds get reduced retries and shorter timeouts.
 *
 * Returns:
 *  - RSSItem[]  → items fetched
 *  - null       → HTTP 304 Not Modified (feed unchanged at server level)
 */
const UNRELIABLE_FEEDS = new Set([
  "https://www.jiqizhixin.com/rss",
  "https://www.qbitai.com/feed",
  // Reddit feeds — always rate-limited (429), reduce retries
  "https://www.reddit.com/r/MachineLearning/.rss",
  "https://www.reddit.com/r/artificial/.rss",
  "https://www.reddit.com/r/ChatGPT/.rss",
  "https://www.reddit.com/r/LocalLLaMA/.rss",
  "https://www.reddit.com/r/singularity/.rss",
  "https://www.reddit.com/r/OpenAI/.rss",
  "https://www.reddit.com/r/StableDiffusion/.rss",
]);

const HTTP_CACHE_PREFIX = "rss:http:";
const HTTP_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

export async function fetchRSSFeed(
  feedUrl: string,
  sourceName: string,
  retries: number = 2,
): Promise<RSSItem[] | null> {
  let lastError: any;

  // Reduce retries and timeout for known unreliable feeds
  const isUnreliable = UNRELIABLE_FEEDS.has(feedUrl);
  const effectiveRetries = isUnreliable ? 1 : retries;
  const timeout = isUnreliable ? 8000 : 15000;

  // ── Load cached HTTP ETag/Last-Modified from Redis ──
  let cachedETag: string | null = null;
  let cachedLastModified: string | null = null;
  const redis = getRedis();
  const httpCacheKey = `${HTTP_CACHE_PREFIX}${rssCursorKey(feedUrl).replace("rss:cursor:", "")}`;

  try {
    if (redis) {
      const cached = await redis.get(httpCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cachedETag = parsed.etag || null;
        cachedLastModified = parsed.lastModified || null;
      }
    }
  } catch {
    // Non-critical — proceed without conditional headers
  }

  for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
    try {
      // Build conditional headers for HTTP 304 support
      const conditionalHeaders: Record<string, string> = {};
      if (cachedETag) conditionalHeaders["If-None-Match"] = cachedETag;
      if (cachedLastModified)
        conditionalHeaders["If-Modified-Since"] = cachedLastModified;

      const response = await axios.get(feedUrl, {
        timeout,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
          ...conditionalHeaders,
        },
        validateStatus: (status) => status === 200 || status === 304,
      });

      // ── HTTP 304: Feed unchanged at server level → skip entirely ──
      if (response.status === 304) {
        console.log(`⚡ HTTP 304: ${sourceName} (değişmemiş)`);
        return null; // Sentinel: unchanged at HTTP level
      }

      // ── Save new ETag/Last-Modified for next cycle ──
      try {
        if (redis) {
          const newETag = response.headers["etag"] || null;
          const newLastModified = response.headers["last-modified"] || null;
          if (newETag || newLastModified) {
            await redis.set(
              httpCacheKey,
              JSON.stringify({
                etag: newETag,
                lastModified: newLastModified,
              }),
              "EX",
              HTTP_CACHE_TTL,
            );
          }
        }
      } catch {
        // Non-critical
      }

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

      const rssItems: RSSItem[] = items.slice(0, 15).map((item: any) => ({
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

      if (attempt < effectiveRetries) {
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
 * Fetch all RSS feeds with concurrency control + cursor-based incremental fetching.
 *
 * 🔑 CURSOR SYSTEM:
 *   - Her feed için Redis'te `rss:cursor:{hash}` key'i ile son görülen
 *     haberin link'i saklanır (7 gün TTL).
 *   - Sonraki çekişte o link'e kadar olan yeni itemlar alınır.
 *   - Aynı link → feed değişmemiş → sıfır HTTP parse maliyeti yok
 *     (HTTP isteği yine yapılır ama item listesi boş döner).
 *   - Redis yoksa / cold-start → tüm itemlar döner (güvenli fallback).
 *
 * Cross-references ALL_INTERNATIONAL_SOURCES config to skip isActive=false feeds
 */
export async function fetchAllRSSFeeds(
  maxConcurrent: number = 8,
): Promise<RSSItem[]> {
  // Build set of disabled feed URLs from centralized config
  const disabledUrls = new Set(
    ALL_INTERNATIONAL_SOURCES.filter((s) => !s.isActive).map((s) => s.url),
  );

  const feeds = AI_NEWS_RSS_FEEDS.filter((f) => !disabledUrls.has(f.url));
  const skipped = AI_NEWS_RSS_FEEDS.length - feeds.length;

  console.log(
    `📡 ${feeds.length} aktif RSS feed okunuyor (${skipped} devre dışı atlandı)...`,
  );

  // ── Cursor'ları Redis'ten toplu yükle ────────────────────────────────────
  const feedCursors = new Map<string, string | null>();
  let redis: Awaited<ReturnType<typeof getRedis>> | null = null;

  try {
    redis = await getRedis();
    const cursorKeys = feeds.map((f) => rssCursorKey(f.url));
    // ioredis mget: returns (string | null)[]
    const cursorValues = await redis!.mget(...cursorKeys);
    feeds.forEach((f, i) => feedCursors.set(f.url, cursorValues[i] ?? null));
    const knownCount = cursorValues.filter((v) => v !== null).length;
    console.log(
      `📋 Cursor: ${knownCount}/${feeds.length} feed'in son pozisyonu yüklendi`,
    );
  } catch {
    // Redis yoksa cursor'sız devam — tüm haberler döner (güvenli fallback)
    console.warn("⚠️  Redis cursor yüklenemedi — tam fetch yapılıyor");
  }

  // ── Fetch + cursor filtresi ───────────────────────────────────────────────
  const allItems: RSSItem[] = [];
  const cursorUpdates: Array<{ key: string; value: string }> = [];
  let completed = 0;
  let totalSkipped = 0;
  let feedsUnchanged = 0;
  let http304Count = 0;
  const startTime = Date.now();

  for (let i = 0; i < feeds.length; i += maxConcurrent) {
    const batch = feeds.slice(i, i + maxConcurrent);
    const results = await Promise.allSettled(
      batch.map((feed) => fetchRSSFeed(feed.url, feed.name)),
    );

    for (let j = 0; j < batch.length; j++) {
      completed++;
      const feed = batch[j];
      const result = results[j];

      if (result.status !== "fulfilled") continue;

      // null = HTTP 304 (feed unchanged at server level)
      if (result.value === null) {
        feedsUnchanged++;
        http304Count++;
        continue;
      }

      if (result.value.length === 0) continue;

      const items = result.value; // newest-first (slice(0,15) from fetchRSSFeed)
      const lastSeenLink = feedCursors.get(feed.url) ?? null;

      // ── Cursor filtresi ────────────────────────────────────────────────
      let newItems = items;
      if (lastSeenLink) {
        const cutoffIdx = items.findIndex(
          (item) => item.link === lastSeenLink || item.guid === lastSeenLink,
        );

        if (cutoffIdx === 0) {
          // İlk item aynı → hiçbir şey yeni
          feedsUnchanged++;
          newItems = [];
        } else if (cutoffIdx > 0) {
          // Bazı yeni haberler var
          const skippedCount = items.length - cutoffIdx;
          totalSkipped += skippedCount;
          newItems = items.slice(0, cutoffIdx);
        }
        // cutoffIdx === -1: cursor sayfa dışında → tümü yeni (olası)
      }

      if (newItems.length > 0) {
        allItems.push(...newItems);
      }

      // ── Cursor güncelle (her başarılı fetch'te en yeni link'i kaydet) ──
      const newestLink = items[0].link || items[0].guid || null;
      if (newestLink && newestLink !== lastSeenLink) {
        cursorUpdates.push({ key: rssCursorKey(feed.url), value: newestLink });
      }
    }

    console.log(`   İlerleme: ${completed}/${feeds.length} feed işlendi`);
  }

  // ── Cursor'ları Redis'e toplu yaz (pipeline) ─────────────────────────────
  if (redis && cursorUpdates.length > 0) {
    try {
      const CURSOR_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 gün
      const pipeline = redis.pipeline();
      for (const { key, value } of cursorUpdates) {
        pipeline.set(key, value, "EX", CURSOR_TTL_SECONDS);
      }
      await pipeline.exec();
      console.log(`💾 ${cursorUpdates.length} feed cursoru Redis'e kaydedildi`);
    } catch {
      // cursor yazılamazsa sadece bu sefer tam fetch yapılmış olur — sorun değil
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n📊 RSS Özeti:`);
  console.log(`   Toplam feed: ${feeds.length}`);
  console.log(
    `   Değişmemiş (atlandı): ${feedsUnchanged}${http304Count > 0 ? ` (${http304Count} HTTP 304)` : ""}`,
  );
  console.log(`   Zaten görülmüş item: ${totalSkipped}`);
  console.log(`   Yeni haber: ${allItems.length}`);
  console.log(`   Süre: ${duration}s`);

  // ── Set "all feeds unchanged" flag for YouTube skip optimization ──
  if (redis) {
    try {
      if (feedsUnchanged >= feeds.length && allItems.length === 0) {
        await redis.set("rss:all_feeds_unchanged", "1", "EX", 600); // 10min TTL
        console.log(
          `📋 rss:all_feeds_unchanged = 1 (tüm feed'ler değişmemiş)`,
        );
      } else {
        await redis.del("rss:all_feeds_unchanged");
      }
    } catch {
      // Non-critical
    }
  }

  return allItems;
}

/**
 * Filter and sort articles by relevance to AI
 * This adds an extra layer of AI-relevance filtering
 */
export function filterAIRelevantArticles(articles: RSSItem[]): RSSItem[] {
  const AI_KEYWORDS = [
    // Core AI terms
    "artificial intelligence",
    "ai",
    "machine learning",
    "ml",
    "deep learning",
    "neural network",
    "nlp",
    "natural language",

    // LLM & Generative AI
    "llm",
    "large language model",
    "gpt",
    "chatgpt",
    "claude",
    "gemini",
    "copilot",
    "generative ai",
    "genai",
    "transformer",
    "language model",
    "foundation model",
    "multimodal",

    // Companies & Products
    "openai",
    "anthropic",
    "google ai",
    "deepmind",
    "nvidia ai",
    "microsoft ai",
    "meta ai",
    "hugging face",
    "stability ai",
    "midjourney",
    "dall-e",
    "stable diffusion",
    "sora",
    "mistral",
    "cohere",
    "perplexity",
    "runway",

    // Technical terms
    "training data",
    "fine-tuning",
    "prompt engineering",
    "rag",
    "retrieval augmented",
    "vector database",
    "embedding",
    "inference",
    "compute",
    "gpu cluster",
    "model weights",
    "parameters",
    "tokens",
    "context window",
    "benchmark",

    // AI Applications
    "ai agent",
    "autonomous agent",
    "ai assistant",
    "chatbot",
    "ai coding",
    "code generation",
    "image generation",
    "text-to-image",
    "text-to-video",
    "voice ai",
    "speech ai",
    "ai search",
    "ai writing",
    "ai art",

    // AI Impact
    "ai safety",
    "ai alignment",
    "ai ethics",
    "ai regulation",
    "ai policy",
    "ai governance",
    "ai risk",
    "ai bias",
    "agi",
    "artificial general intelligence",
    "superintelligence",
  ];

  return articles.filter((article) => {
    const text = `${article.title} ${article.description}`.toLowerCase();
    return AI_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
  });
}

/**
 * Check if content is AI-related (for article validation)
 */
export function isAIRelatedContent(title: string, content: string): boolean {
  const text = `${title} ${content}`.toLowerCase();

  // Primary AI indicators (must have at least one)
  const primaryKeywords = [
    "artificial intelligence",
    "ai",
    "machine learning",
    "deep learning",
    "neural network",
    "llm",
    "gpt",
    "chatgpt",
    "claude",
    "gemini",
    "openai",
    "anthropic",
    "generative ai",
    "language model",
  ];

  const hasPrimaryKeyword = primaryKeywords.some((kw) => text.includes(kw));

  if (!hasPrimaryKeyword) {
    return false;
  }

  // Negative indicators (not AI news even with keywords)
  const negativePatterns = [
    /\btv\s+(deal|sale|price|inch|review)/i,
    /\bheadphone(s)?\s+(deal|sale|review)/i,
    /\bspeaker\s+(deal|sale|review)/i,
    /presidents?\s*day\s*(deal|sale)/i,
    /black\s*friday/i,
    /cyber\s*monday/i,
    /\$\d+\s*off/i,
    /\d+%\s*off/i,
    /limited\s*time\s*(offer|deal)/i,
  ];

  const hasNegativePattern = negativePatterns.some((pattern) =>
    pattern.test(text),
  );

  return !hasNegativePattern;
}

/**
 * Advanced AI relevance scoring
 * Returns a score 0-100 based on how AI-related the content is
 */
export function calculateAIRelevanceScore(
  title: string,
  content: string,
): number {
  const text = `${title} ${content}`.toLowerCase();
  let score = 0;

  // Primary AI keywords (high weight)
  const primaryKeywords = [
    { keyword: "artificial intelligence", weight: 15 },
    { keyword: "machine learning", weight: 15 },
    { keyword: "deep learning", weight: 15 },
    { keyword: "neural network", weight: 12 },
    { keyword: "large language model", weight: 15 },
    { keyword: "llm", weight: 12 },
    { keyword: "generative ai", weight: 15 },
  ];

  // Company/Product names (medium weight)
  const companyKeywords = [
    { keyword: "openai", weight: 10 },
    { keyword: "anthropic", weight: 10 },
    { keyword: "chatgpt", weight: 10 },
    { keyword: "gpt-4", weight: 10 },
    { keyword: "gpt-5", weight: 10 },
    { keyword: "claude", weight: 10 },
    { keyword: "gemini", weight: 8 },
    { keyword: "deepmind", weight: 10 },
    { keyword: "hugging face", weight: 8 },
    { keyword: "midjourney", weight: 8 },
    { keyword: "stable diffusion", weight: 8 },
    { keyword: "dall-e", weight: 8 },
    { keyword: "mistral", weight: 8 },
    { keyword: "cohere", weight: 6 },
    { keyword: "perplexity", weight: 6 },
  ];

  // Technical terms (low weight)
  const technicalKeywords = [
    { keyword: "transformer", weight: 5 },
    { keyword: "fine-tuning", weight: 5 },
    { keyword: "prompt engineering", weight: 5 },
    { keyword: "tokens", weight: 3 },
    { keyword: "parameters", weight: 3 },
    { keyword: "inference", weight: 4 },
    { keyword: "embedding", weight: 4 },
    { keyword: "vector database", weight: 5 },
    { keyword: "rag", weight: 5 },
    { keyword: "ai agent", weight: 8 },
    { keyword: "chatbot", weight: 4 },
  ];

  // Calculate score
  const allKeywords = [
    ...primaryKeywords,
    ...companyKeywords,
    ...technicalKeywords,
  ];
  const matchedKeywords = new Set<string>();

  for (const { keyword, weight } of allKeywords) {
    if (text.includes(keyword) && !matchedKeywords.has(keyword)) {
      score += weight;
      matchedKeywords.add(keyword);
    }
  }

  // Bonus for title containing AI keywords
  const titleLower = title.toLowerCase();
  if (primaryKeywords.some((k) => titleLower.includes(k.keyword))) {
    score += 10;
  }

  // Penalty for non-AI content indicators
  const penalties = [
    { pattern: /\b(tv|television)\s+(deal|sale|price)/i, penalty: 30 },
    { pattern: /presidents?\s*day/i, penalty: 25 },
    { pattern: /black\s*friday/i, penalty: 25 },
    { pattern: /\$\d+\s*(off|discount)/i, penalty: 20 },
    { pattern: /\bspeaker\b.*\breview\b/i, penalty: 20 },
    { pattern: /\bheadphone/i, penalty: 15 },
    { pattern: /\bceo\s+(resign|leave|step)/i, penalty: 10 },
  ];

  for (const { pattern, penalty } of penalties) {
    if (pattern.test(text)) {
      score -= penalty;
    }
  }

  // Normalize to 0-100
  return Math.min(100, Math.max(0, score));
}

// Export stats helper
export function getRSSFeedStats() {
  return {
    total: AI_NEWS_RSS_FEEDS.length,
    byLanguage: {
      english: AI_NEWS_RSS_FEEDS.filter((f) => f.language === "en").length,
    },
    categories: {
      majorNews: 7,
      aiFocused: 23,
      research: 12,
      learning: 10,
      newsletters: 6,
      highFrequency: 19, // New high-frequency sources added 2026-02-10
    },
  };
}

/**
 * Filter articles published within the last X hours
 */
export function filterRecentArticles(
  articles: RSSItem[],
  hoursAgo: number = 48,
): RSSItem[] {
  const cutoffTime = Date.now() - hoursAgo * 60 * 60 * 1000;

  return articles.filter((article) => {
    if (!article.pubDate) return false;
    const articleTime = new Date(article.pubDate).getTime();
    return articleTime >= cutoffTime;
  });
}

/**
 * Stub function for backward compatibility
 * Source reliability cleanup is no longer needed with curated AI-only feeds
 */
export function stopSourceReliabilityCleanup(): void {
  // No-op - functionality removed in favor of curated AI-only feeds
}
