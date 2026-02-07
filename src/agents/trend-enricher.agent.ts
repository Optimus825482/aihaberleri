/**
 * Trend Enricher Agent
 *
 * Pipeline'da DuplicateFilter'dan SONRA, ContentEnricher'dan ÖNCE çalışır.
 * NON-BLOCKING: Trend verisi yoksa veya hata olursa normal devam eder.
 *
 * RESPONSIBILITIES:
 * 1. Aktif trendleri DB'den okur
 * 2. Her makaleyi trendlerle eşleştirir (soft matching)
 * 3. Trend skoru ve badge ekler
 * 4. Sosyal paylaşım için hashtag'ler oluşturur
 *
 * PIPELINE POSITION:
 * RelevanceFilter → DuplicateFilter → [TrendEnricher] → ContentEnricher → ...
 */

import { Job } from "bullmq";
import { BaseAgent, type AgentResult } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import { createModuleLogger } from "@/lib/agent-log-stream";
import {
  enrichArticleWithTrends,
  saveTrendMatches,
  type ArticleForMatching,
  type TrendEnrichmentResult,
} from "@/services/trend-matcher.service";
import { getActiveTrends } from "@/services/trend-fetcher.service";

const logger = createModuleLogger("TrendEnricher");

// ============================================================================
// TYPES
// ============================================================================

export interface ArticleWithTrend {
  id?: string;
  title: string;
  content: string;
  keywords?: string[];
  language?: string;
  trendScore?: number;
  isTrending?: boolean;
  trendBadgeTr?: string | null;
  trendBadgeEn?: string | null;
  trendHashtags?: string[];
  // Pass-through other fields
  [key: string]: unknown;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Minimum trend score to log as "trending"
  logThreshold: 30,

  // Skip enrichment if no trends available
  gracefulDegradation: true,

  // Timeout for trend matching (ms)
  timeout: 5000,

  // Maximum articles to process per batch
  batchSize: 50,
};

// ============================================================================
// AGENT IMPLEMENTATION
// ============================================================================

export class TrendEnricherAgent extends BaseAgent<
  ArticleWithTrend[],
  ArticleWithTrend[]
> {
  protected config = {
    name: "trend-enricher",
    queueName: QUEUE_NAMES.TREND_ENRICHMENT,
    nextQueueName: QUEUE_NAMES.ENRICHED_ARTICLES,
    enableMetrics: true,
  };

  private trendsAvailable: boolean = false;
  private lastTrendCheck: Date | null = null;

  constructor() {
    super("TrendEnricher");
  }

  /**
   * Check if trends are available in database
   */
  private async checkTrendsAvailable(): Promise<boolean> {
    // Cache check for 1 minute
    if (
      this.lastTrendCheck &&
      Date.now() - this.lastTrendCheck.getTime() < 60000
    ) {
      return this.trendsAvailable;
    }

    try {
      const trends = await getActiveTrends({ limit: 1 });
      this.trendsAvailable = trends.length > 0;
      this.lastTrendCheck = new Date();
      return this.trendsAvailable;
    } catch (error) {
      logger.warn("Failed to check trends availability");
      this.trendsAvailable = false;
      this.lastTrendCheck = new Date();
      return false;
    }
  }

  /**
   * Enrich a single article with trend data
   */
  private async enrichSingleArticle(
    article: ArticleWithTrend,
  ): Promise<ArticleWithTrend> {
    const articleForMatching: ArticleForMatching = {
      id: article.id || "",
      title: article.title,
      content: article.content,
      keywords: article.keywords || [],
      language: article.language || "tr",
    };

    try {
      // Set timeout for enrichment
      const enrichmentPromise = enrichArticleWithTrends(articleForMatching);
      const timeoutPromise = new Promise<TrendEnrichmentResult>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), CONFIG.timeout),
      );

      const enrichment = await Promise.race([
        enrichmentPromise,
        timeoutPromise,
      ]);

      // Save matches to database if article has ID
      if (article.id && enrichment.matches.length > 0) {
        await saveTrendMatches(article.id, enrichment.matches);
      }

      // Log trending articles
      if (enrichment.trendScore >= CONFIG.logThreshold) {
        const badge =
          article.language === "en"
            ? enrichment.trendBadgeEn
            : enrichment.trendBadgeTr;
        logger.info(
          `   ${badge} "${article.title.substring(0, 50)}..." (Score: ${enrichment.trendScore})`,
        );
      }

      return {
        ...article,
        trendScore: enrichment.trendScore,
        isTrending: enrichment.isTrending,
        trendBadgeTr: enrichment.trendBadgeTr,
        trendBadgeEn: enrichment.trendBadgeEn,
        trendHashtags: enrichment.trendHashtags,
      };
    } catch (error) {
      // Graceful degradation: return article without trend data
      logger.warn(
        `Trend enrichment failed for "${article.title.substring(0, 30)}..."`,
      );
      return {
        ...article,
        trendScore: 0,
        isTrending: false,
        trendBadgeTr: null,
        trendBadgeEn: null,
        trendHashtags: [],
      };
    }
  }

  /**
   * Main processing function
   */
  protected async process(
    job: Job<ArticleWithTrend[]>,
  ): Promise<AgentResult<ArticleWithTrend[]>> {
    const articles = job.data;

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      logger.warn("No articles to process");
      return {
        success: true,
        data: [],
        nextQueue: this.config.nextQueueName,
      };
    }

    logger.info(
      `🔥 Processing ${articles.length} articles for trend enrichment...`,
    );
    const startTime = Date.now();

    // Check if trends are available
    const trendsAvailable = await this.checkTrendsAvailable();

    if (!trendsAvailable) {
      if (CONFIG.gracefulDegradation) {
        logger.warn(
          "⚠️ No active trends available. Passing articles through without enrichment.",
        );
        const passedArticles = articles.map((article) => ({
          ...article,
          trendScore: 0,
          isTrending: false,
          trendBadgeTr: null,
          trendBadgeEn: null,
          trendHashtags: [],
        }));

        return {
          success: true,
          data: passedArticles,
          nextQueue: this.config.nextQueueName,
          metrics: {
            processingTime: Date.now() - startTime,
            apiCalls: 0,
            itemsProcessed: articles.length,
          },
        };
      } else {
        return {
          success: false,
          error: "No active trends available",
          nextQueue: this.config.nextQueueName,
        };
      }
    }

    // Process articles in batches
    const enrichedArticles: ArticleWithTrend[] = [];
    let trendingCount = 0;

    for (let i = 0; i < articles.length; i += CONFIG.batchSize) {
      const batch = articles.slice(i, i + CONFIG.batchSize);
      const enrichedBatch = await Promise.all(
        batch.map((article) => this.enrichSingleArticle(article)),
      );

      for (const article of enrichedBatch) {
        enrichedArticles.push(article);
        if (article.isTrending) trendingCount++;
      }
    }

    const duration = Date.now() - startTime;
    logger.success(
      `✅ Trend enrichment complete: ${trendingCount}/${articles.length} trending (${duration}ms)`,
    );

    return {
      success: true,
      data: enrichedArticles,
      nextQueue: this.config.nextQueueName,
      metrics: {
        processingTime: duration,
        apiCalls: 0, // All from DB
        itemsProcessed: articles.length,
      },
    };
  }
}

export default TrendEnricherAgent;
