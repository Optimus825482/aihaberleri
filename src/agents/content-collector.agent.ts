/**
 * Content Collector Agent
 *
 * RESPONSIBILITIES:
 * 1. Fetch RSS feeds from all sources
 * 2. Filter by AI keywords
 * 3. Apply category filters if specified
 * 4. Rank by trend analysis (Brave API)
 * 5. Emit top 50 articles to collected-articles queue
 *
 * EXTRACTED FROM: src/services/news.service.ts - fetchAINews()
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import {
  fetchAllRSSFeeds,
  filterRecentArticles,
  type RSSItem,
} from "@/lib/rss";
import { rankArticlesByTrendHybrid } from "@/lib/hybrid-search";

export interface CollectorInput {
  categoryFilter?: string;
  maxArticles?: number;
}

export interface CollectedArticle {
  title: string;
  description: string;
  url: string;
  publishedDate?: string;
  source?: string;
  trendScore?: number;
  category?: string;
}

/**
 * AI Keywords for filtering news articles
 */
const AI_KEYWORDS = [
  // Core AI Terms
  "artificial intelligence",
  "yapay zeka",
  " ai ", // Space on both sides to avoid "campaign", "detail"
  "a.i.",
  "machine learning",
  "makine öğrenmesi",
  "makine ogrenmesi",
  "deep learning",
  "derin öğrenme",
  "derin ogrenme",
  "neural network",
  "sinir ağı",
  "sinir agi",

  // AI Models & Products
  "gpt",
  "chatgpt",
  "openai",
  "gemini",
  "claude",
  "anthropic",
  "llama",
  "mistral",
  "deepseek",
  "copilot",
  "bard",
  "palm",
  "dall-e",
  "midjourney",
  "stable diffusion",
  "sora",

  // AI Techniques
  "nlp",
  "natural language",
  "doğal dil",
  "dogal dil",
  "computer vision",
  "bilgisayarlı görü",
  "bilgisayarli goru",
  "transformer",
  "language model",
  "dil modeli",
  "generative ai",
  "üretken yapay zeka",
  "uretken yapay zeka",
  "large language model",
  "llm",
  "büyük dil modeli",

  // AI Companies
  "nvidia",
  "tesla autopilot",
  "otonom sürüş",
  "otonom surus",
  "hugging face",
  "cohere",
  "stability ai",
  "runway",
  "google ai",
  "microsoft ai",
  "meta ai",
  "amazon ai",

  // AI Applications
  "chatbot",
  "sohbet botu",
  "robot",
  "robotik",
  "robotic",
  "autonomous",
  "otonom",
  "automation",
  "otomasyon",
  "ai assistant",
  "ai asistan",
  "yapay zeka asistan",
  "ai tool",
  "ai araç",
  "ai arac",

  // AI Ethics & Regulation
  "ai ethics",
  "ai etik",
  "yapay zeka etiği",
  "yapay zeka etigi",
  "ai regulation",
  "ai düzenleme",
  "ai duzenleme",
  "ai safety",
  "ai güvenlik",
  "ai guvenlik",
  "ai bias",
  "ai önyargı",
  "ai onyargi",
];

/**
 * Category-specific keywords
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "makine-ogrenmesi": [
    "machine learning",
    "ml",
    "deep learning",
    "neural network",
    "training",
    "model",
    "dataset",
    "supervised",
    "unsupervised",
    "reinforcement",
    "tensorflow",
    "pytorch",
    "scikit",
  ],
  "dogal-dil-isleme": [
    "nlp",
    "natural language",
    "language model",
    "llm",
    "gpt",
    "bert",
    "transformer",
    "chatbot",
    "text",
    "translation",
    "sentiment",
  ],
  "bilgisayarli-goru": [
    "computer vision",
    "image",
    "video",
    "object detection",
    "face recognition",
    "segmentation",
    "opencv",
    "yolo",
    "cnn",
    "visual",
  ],
  robotik: [
    "robot",
    "robotics",
    "autonomous",
    "drone",
    "automation",
    "sensor",
    "actuator",
    "ros",
    "manipulation",
  ],
  "yapay-zeka-etigi": [
    "ethics",
    "bias",
    "fairness",
    "privacy",
    "regulation",
    "responsible ai",
    "explainable",
    "transparency",
    "safety",
  ],
  "yapay-zeka-araclari": [
    "tool",
    "framework",
    "library",
    "api",
    "platform",
    "sdk",
    "service",
    "cloud",
    "openai",
    "anthropic",
    "google ai",
  ],
  "sektor-haberleri": [
    "company",
    "startup",
    "funding",
    "acquisition",
    "partnership",
    "market",
    "industry",
    "business",
    "investment",
  ],
  arastirma: [
    "research",
    "paper",
    "study",
    "arxiv",
    "conference",
    "breakthrough",
    "discovery",
    "experiment",
    "academic",
  ],
};

export class ContentCollectorAgent extends BaseAgent<
  CollectorInput,
  CollectedArticle[]
> {
  protected config = {
    name: "content-collector",
    queueName: QUEUE_NAMES.COLLECTED_ARTICLES,
    nextQueueName: QUEUE_NAMES.RELEVANT_ARTICLES,
    enableMetrics: true,
  };

  constructor() {
    super("content-collector");
  }

  protected async process(
    job: Job<CollectorInput>,
  ): Promise<AgentResult<CollectedArticle[]>> {
    const { categoryFilter, maxArticles = 50 } = job.data;
    const startTime = Date.now();
    let apiCalls = 0;

    this.logger.info("Starting content collection...");
    if (categoryFilter) {
      this.logger.info(`Category filter: ${categoryFilter}`);
    }

    try {
      // Step 1: Fetch all RSS feeds
      this.logger.info("Fetching RSS feeds...");
      const rssItems = await fetchAllRSSFeeds();

      if (rssItems.length === 0) {
        this.logger.warn("No RSS items fetched");
        return {
          success: true,
          data: [],
          skipNextQueue: true,
          metrics: {
            processingTime: Date.now() - startTime,
            apiCalls: 0,
            itemsProcessed: 0,
          },
        };
      }

      this.logger.info(`Fetched ${rssItems.length} RSS items`);

      // Step 2: Filter by category if specified
      let filteredItems = rssItems;
      if (categoryFilter && CATEGORY_KEYWORDS[categoryFilter]) {
        const keywords = CATEGORY_KEYWORDS[categoryFilter];
        this.logger.info(
          `Filtering by category: ${categoryFilter} (${keywords.length} keywords)`,
        );

        filteredItems = rssItems.filter((item) => {
          const text = `${item.title} ${item.description}`.toLowerCase();
          return keywords.some((keyword) => text.includes(keyword));
        });

        this.logger.info(
          `Category filter: ${filteredItems.length}/${rssItems.length} articles match`,
        );

        if (filteredItems.length === 0) {
          this.logger.warn("No articles match category, using all");
          filteredItems = rssItems;
        }
      }

      // Step 3: Filter recent articles (last 48 hours)
      const recentItems = filterRecentArticles(filteredItems, 48);
      this.logger.info(`Recent filter: ${recentItems.length} articles`);

      // Step 4: Filter by AI keywords
      const aiFilteredItems = this.filterByAIKeywords(
        recentItems.length > 0 ? recentItems : filteredItems,
      );
      this.logger.info(
        `AI filter: ${aiFilteredItems.length}/${recentItems.length || filteredItems.length} articles`,
      );

      if (aiFilteredItems.length === 0) {
        this.logger.warn("No AI-related articles found");
        return {
          success: true,
          data: [],
          skipNextQueue: true,
          metrics: {
            processingTime: Date.now() - startTime,
            apiCalls: 0,
            itemsProcessed: 0,
          },
        };
      }

      // Step 5: Smart sampling if too many articles
      let itemsToAnalyze = aiFilteredItems;
      const MAX_ARTICLES_TO_ANALYZE = 100;

      if (itemsToAnalyze.length > MAX_ARTICLES_TO_ANALYZE) {
        this.logger.info(
          `Smart sampling: ${itemsToAnalyze.length} → ${MAX_ARTICLES_TO_ANALYZE}`,
        );

        itemsToAnalyze = itemsToAnalyze
          .sort(
            (a, b) =>
              new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
          )
          .slice(0, MAX_ARTICLES_TO_ANALYZE);
      }

      // Step 6: Rank by trend analysis (Brave API)
      this.logger.info(
        `Ranking ${itemsToAnalyze.length} articles by trend (Brave API)...`,
      );

      const trendRankings = await rankArticlesByTrendHybrid(
        itemsToAnalyze.map((item) => ({
          title: item.title,
          description: item.description,
        })),
      );

      apiCalls++; // Brave API call

      // Step 7: Sort by trend score and take top articles
      const topArticles = trendRankings
        .slice(0, maxArticles)
        .map((ranking) => {
          const item = itemsToAnalyze[ranking.index];
          return {
            ...item,
            trendScore: ranking.score,
          };
        })
        .sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0));

      this.logger.success(`Collected ${topArticles.length} trending articles`);

      // Log top 5
      this.logger.info("Top 5 articles:");
      topArticles.slice(0, 5).forEach((article, i) => {
        this.logger.info(
          `  ${i + 1}. ${article.title.substring(0, 60)}... (score: ${Math.round(article.trendScore || 0)})`,
        );
      });

      // Convert to CollectedArticle format
      const collectedArticles: CollectedArticle[] = topArticles.map((item) => ({
        title: item.title,
        description: item.description,
        url: item.link,
        publishedDate: item.pubDate,
        source: item.source,
        trendScore: item.trendScore,
        category: categoryFilter,
      }));

      return {
        success: true,
        data: collectedArticles,
        nextQueue: QUEUE_NAMES.RELEVANT_ARTICLES,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls,
          itemsProcessed: collectedArticles.length,
        },
      };
    } catch (error) {
      this.logger.error(
        "Content collection failed:",
        this.serializeError(error),
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls,
          itemsProcessed: 0,
        },
      };
    }
  }

  /**
   * Filter articles by AI keywords
   */
  private filterByAIKeywords(items: RSSItem[]): RSSItem[] {
    return items.filter((item) => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      return AI_KEYWORDS.some((keyword) =>
        text.includes(keyword.toLowerCase()),
      );
    });
  }
}
