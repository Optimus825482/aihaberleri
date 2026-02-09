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
  {
    name: "Ars Technica - AI",
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
    language: "en",
  },
  {
    name: "ZDNet - Artificial Intelligence",
    url: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml",
    language: "en",
  },
  
  // ========================================
  // TIER 2: AI-FOCUSED PUBLICATIONS
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
  {
    name: "Microsoft AI Blog",
    url: "https://blogs.microsoft.com/ai/feed/",
    language: "en",
  },
  {
    name: "Meta AI Blog",
    url: "https://ai.meta.com/blog/rss/",
    language: "en",
  },
  {
    name: "Anthropic Research",
    url: "https://www.anthropic.com/research/rss.xml",
    language: "en",
  },

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
    name: "Hacker News (AI filtered)",
    url: "https://hnrss.org/frontpage?q=AI+OR+GPT+OR+LLM+OR+machine+learning",
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
    name: "Ben's Bites",
    url: "https://bensbites.beehiiv.com/feed",
    language: "en",
  },
  {
    name: "Import AI",
    url: "https://importai.substack.com/feed",
    language: "en",
  },
  {
    name: "The Batch (deeplearning.ai)",
    url: "https://www.deeplearning.ai/the-batch/feed/",
    language: "en",
  },
  {
    name: "TLDR AI",
    url: "https://tldr.tech/ai/rss",
    language: "en",
  },
  {
    name: "AI Tool Report",
    url: "https://aitoolreport.beehiiv.com/feed",
    language: "en",
  },
  {
    name: "Prompt Engineering Daily",
    url: "https://promptengineering.substack.com/feed",
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
  console.log(
    `📡 ${AI_NEWS_RSS_FEEDS.length} RSS feed okunuyor (AI-FOCUSED ONLY)...`,
  );

  const allItems: RSSItem[] = [];
  const feeds = [...AI_NEWS_RSS_FEEDS];
  let completed = 0;
  const startTime = Date.now();

  // Process feeds in batches
  for (let i = 0; i < feeds.length; i += maxConcurrent) {
    const batch = feeds.slice(i, i + maxConcurrent);
    const results = await Promise.allSettled(
      batch.map((feed) => fetchRSSFeed(feed.url, feed.name)),
    );

    for (const result of results) {
      completed++;
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }

    // Progress log
    console.log(`   İlerleme: ${completed}/${feeds.length} feed işlendi`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n📊 RSS Özeti:`);
  console.log(`   Toplam feed: ${feeds.length}`);
  console.log(`   Toplam haber: ${allItems.length}`);
  console.log(`   Süre: ${duration}s`);

  return allItems;
}

/**
 * Filter and sort articles by relevance to AI
 * This adds an extra layer of AI-relevance filtering
 */
export function filterAIRelevantArticles(articles: RSSItem[]): RSSItem[] {
  const AI_KEYWORDS = [
    // Core AI terms
    "artificial intelligence", "ai", "machine learning", "ml",
    "deep learning", "neural network", "nlp", "natural language",
    
    // LLM & Generative AI
    "llm", "large language model", "gpt", "chatgpt", "claude",
    "gemini", "copilot", "generative ai", "genai", "transformer",
    "language model", "foundation model", "multimodal",
    
    // Companies & Products
    "openai", "anthropic", "google ai", "deepmind", "nvidia ai",
    "microsoft ai", "meta ai", "hugging face", "stability ai",
    "midjourney", "dall-e", "stable diffusion", "sora",
    "mistral", "cohere", "perplexity", "runway",
    
    // Technical terms
    "training data", "fine-tuning", "prompt engineering",
    "rag", "retrieval augmented", "vector database", "embedding",
    "inference", "compute", "gpu cluster", "model weights",
    "parameters", "tokens", "context window", "benchmark",
    
    // AI Applications
    "ai agent", "autonomous agent", "ai assistant", "chatbot",
    "ai coding", "code generation", "image generation",
    "text-to-image", "text-to-video", "voice ai", "speech ai",
    "ai search", "ai writing", "ai art",
    
    // AI Impact
    "ai safety", "ai alignment", "ai ethics", "ai regulation",
    "ai policy", "ai governance", "ai risk", "ai bias",
    "agi", "artificial general intelligence", "superintelligence",
  ];

  return articles.filter(article => {
    const text = `${article.title} ${article.description}`.toLowerCase();
    return AI_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
  });
}

/**
 * Check if content is AI-related (for article validation)
 */
export function isAIRelatedContent(title: string, content: string): boolean {
  const text = `${title} ${content}`.toLowerCase();
  
  // Primary AI indicators (must have at least one)
  const primaryKeywords = [
    "artificial intelligence", "ai", "machine learning",
    "deep learning", "neural network", "llm", "gpt",
    "chatgpt", "claude", "gemini", "openai", "anthropic",
    "generative ai", "language model"
  ];
  
  const hasPrimaryKeyword = primaryKeywords.some(kw => text.includes(kw));
  
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
  
  const hasNegativePattern = negativePatterns.some(pattern => pattern.test(text));
  
  return !hasNegativePattern;
}

/**
 * Advanced AI relevance scoring
 * Returns a score 0-100 based on how AI-related the content is
 */
export function calculateAIRelevanceScore(title: string, content: string): number {
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
  const allKeywords = [...primaryKeywords, ...companyKeywords, ...technicalKeywords];
  const matchedKeywords = new Set<string>();
  
  for (const { keyword, weight } of allKeywords) {
    if (text.includes(keyword) && !matchedKeywords.has(keyword)) {
      score += weight;
      matchedKeywords.add(keyword);
    }
  }
  
  // Bonus for title containing AI keywords
  const titleLower = title.toLowerCase();
  if (primaryKeywords.some(k => titleLower.includes(k.keyword))) {
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
    },
  };
}

/**
 * Filter articles published within the last X hours
 */
export function filterRecentArticles(
  articles: RSSItem[],
  hoursAgo: number = 48
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
