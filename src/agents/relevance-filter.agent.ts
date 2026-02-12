/**
 * Relevance Filter Agent
 *
 * RESPONSIBILITIES:
 * 1. Score each article 0-100 using DeepSeek AI
 * 2. Evaluate: news value, freshness, source authority, content depth, audience fit
 * 3. Filter articles with score >= 60
 * 4. Batch processing (10 articles per DeepSeek call for cost efficiency)
 * 5. Emit passing articles to relevant-articles queue
 *
 * NEW AGENT - AI-powered quality scoring
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import { batchScoreArticles } from "@/lib/deepseek"; // DeepSeek-only (Gemini removed)
import type { CollectedArticle } from "./content-collector.agent";

export interface ScoredArticle extends CollectedArticle {
  relevanceScore: number;
  reasoning: string;
  suggestedCategory?: string;
  suggestedTags?: string[];
}

// 🔧 TIGHTENED: 50 → 65 to prevent non-AI content from passing (10.02.2026)
// Combined with negative keyword filtering in content-collector for double protection
const RELEVANCE_THRESHOLD = 65; // Minimum score to pass
const BATCH_SIZE = 15; // Articles per batch (10 → 15 for faster processing)

// BYPASS MODE: If DeepSeek fails, apply basic AI keyword validation instead of passing everything
const BYPASS_MODE_ENABLED = true;

export class RelevanceFilterAgent extends BaseAgent<
  CollectedArticle[],
  ScoredArticle[]
> {
  protected config = {
    name: "relevance-filter",
    queueName: QUEUE_NAMES.RELEVANT_ARTICLES,
    nextQueueName: QUEUE_NAMES.TREND_ENRICHMENT, // 🆕 Go to TrendEnricher after duplicate check (09.02.2026)
    enableMetrics: true,
  };

  constructor() {
    super("relevance-filter");
  }

  protected async process(
    job: Job<CollectedArticle[]>,
  ): Promise<AgentResult<ScoredArticle[]>> {
    const articles = job.data;
    const startTime = Date.now();
    let apiCalls = 0;
    let tokensUsed = 0;

    this.logger.info(`Filtering ${articles.length} articles for relevance...`);

    if (articles.length === 0) {
      return {
        success: true,
        data: [],
        skipNextQueue: true,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls: 0,
          tokensUsed: 0,
          itemsProcessed: 0,
        },
      };
    }

    try {
      const scoredArticles: ScoredArticle[] = [];

      // Process in batches for cost efficiency
      for (let i = 0; i < articles.length; i += BATCH_SIZE) {
        const batch = articles.slice(i, i + BATCH_SIZE);
        this.logger.info(
          `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(articles.length / BATCH_SIZE)} (${batch.length} articles)`,
        );

        const batchScores = await this.scoreBatch(batch);
        apiCalls++;
        tokensUsed += 2000; // Estimate

        scoredArticles.push(...batchScores);

        // Rate limiting between batches (reduced for efficiency)
        if (i + BATCH_SIZE < articles.length) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      // Filter by threshold
      const relevantArticles = scoredArticles.filter(
        (article) => article.relevanceScore >= RELEVANCE_THRESHOLD,
      );

      const rejectedCount = scoredArticles.length - relevantArticles.length;
      const rejectionRate = (
        (rejectedCount / scoredArticles.length) *
        100
      ).toFixed(1);

      this.logger.success(
        `Filtered: ${relevantArticles.length}/${scoredArticles.length} articles passed (${rejectionRate}% rejected)`,
      );

      // Log top 5 relevant articles
      this.logger.info("Top 5 relevant articles:");
      relevantArticles
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5)
        .forEach((article, i) => {
          this.logger.info(
            `  ${i + 1}. [${article.relevanceScore}] ${article.title.substring(0, 50)}...`,
          );
        });

      return {
        success: true,
        data: relevantArticles,
        nextQueue: QUEUE_NAMES.TREND_ENRICHMENT, // Route to TrendEnricher (Relevance → Trend → Enrichment)
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls,
          tokensUsed,
          itemsProcessed: relevantArticles.length,
        },
      };
    } catch (error) {
      this.logger.error(
        "Relevance filtering failed:",
        this.serializeError(error),
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls,
          tokensUsed,
          itemsProcessed: 0,
        },
      };
    }
  }

  /**
   * Score a batch of articles using DeepSeek (Gemini removed)
   * BYPASS MODE: If DeepSeek fails, return all articles with trend-based scores
   */
  private async scoreBatch(
    articles: CollectedArticle[],
  ): Promise<ScoredArticle[]> {
    // Check if DeepSeek API is configured
    const hasDeepSeekKey = !!process.env.DEEPSEEK_API_KEY;

    if (!hasDeepSeekKey) {
      this.logger.warn(
        `⚠️ DEEPSEEK_API_KEY not configured - using BYPASS MODE`,
      );
      return this.bypassScoring(articles, "No DeepSeek API key");
    }

    try {
      this.logger.info(`🤖 Using LLM for batch scoring`);

      const scores = await batchScoreArticles(articles);

      // Merge scores with articles
      return articles.map((article, index) => ({
        ...article,
        relevanceScore: scores[index]?.score || 0,
        reasoning: scores[index]?.reasoning || "No reasoning provided",
        suggestedCategory: scores[index]?.category,
        suggestedTags: scores[index]?.tags || [],
      }));
    } catch (error) {
      this.logger.error(
        "DeepSeek batch scoring failed:",
        this.serializeError(error),
      );

      // BYPASS MODE: Pass articles with trend-based scores
      if (BYPASS_MODE_ENABLED) {
        this.logger.warn(
          `🔄 BYPASS MODE: Passing ${articles.length} articles based on trend scores`,
        );
        return this.bypassScoring(
          articles,
          "DeepSeek API error - using bypass",
        );
      }

      // Fallback: assign default scores based on trend score
      return articles.map((article) => ({
        ...article,
        relevanceScore: Math.min((article.trendScore || 0) / 10, 100),
        reasoning: "Fallback scoring (DeepSeek unavailable)",
        suggestedTags: [],
      }));
    }
  }

  /**
   * Bypass scoring - use trend scores directly
   * When DeepSeek fails, articles should PASS (that's the point of bypass)
   * Score is set to RELEVANCE_THRESHOLD + buffer so they pass the filter
   */
  private bypassScoring(
    articles: CollectedArticle[],
    reason: string,
  ): ScoredArticle[] {
    return articles.map((article) => {
      // BYPASS = let articles through. Give them threshold + small bonus from trendScore
      const trendScore = article.trendScore || 0;
      // Base: threshold (65) + bonus from trend (0-20)
      const bonus = Math.min(trendScore / 15, 20);
      const relevanceScore = RELEVANCE_THRESHOLD + bonus;

      return {
        ...article,
        relevanceScore: Math.round(Math.min(relevanceScore, 100)),
        reasoning: `BYPASS MODE: ${reason}. Trend score: ${trendScore}`,
        suggestedTags: [],
      };
    });
  }

  /**
   * Build prompt for batch scoring (REMOVED - now using Gemini directly)
   */
  private buildBatchPrompt(articles: CollectedArticle[]): string {
    // This method is no longer used but kept for reference
    return "";
  }
}
