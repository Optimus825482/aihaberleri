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
import { batchScoreArticles } from "@/lib/gemini"; // HYBRID: Using Gemini for cost efficiency
import type { CollectedArticle } from "./content-collector.agent";

export interface ScoredArticle extends CollectedArticle {
  relevanceScore: number;
  reasoning: string;
  suggestedCategory?: string;
  suggestedTags?: string[];
}

const RELEVANCE_THRESHOLD = 60; // Minimum score to pass
const BATCH_SIZE = 10; // Articles per batch

// BYPASS MODE: If Gemini fails, pass all articles with high scores (based on trend)
const BYPASS_MODE_ENABLED = true;

export class RelevanceFilterAgent extends BaseAgent<
  CollectedArticle[],
  ScoredArticle[]
> {
  protected config = {
    name: "relevance-filter",
    queueName: QUEUE_NAMES.RELEVANT_ARTICLES,
    nextQueueName: QUEUE_NAMES.UNIQUE_ARTICLES,
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

        // Rate limiting between batches
        if (i + BATCH_SIZE < articles.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
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
        nextQueue: QUEUE_NAMES.UNIQUE_ARTICLES,
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
   * Score a batch of articles using Gemini (HYBRID: Cost-efficient)
   * BYPASS MODE: If Gemini fails, return all articles with trend-based scores
   */
  private async scoreBatch(
    articles: CollectedArticle[],
  ): Promise<ScoredArticle[]> {
    // Check if Gemini API is configured
    const hasGeminiKey = !!process.env.GOOGLE_API_KEY;

    if (!hasGeminiKey) {
      this.logger.warn(`⚠️ GOOGLE_API_KEY not configured - using BYPASS MODE`);
      return this.bypassScoring(articles, "No Gemini API key");
    }

    try {
      this.logger.info(`🤖 HYBRID: Using Gemini 2.0 Flash for batch scoring`);

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
        "Gemini batch scoring failed:",
        this.serializeError(error),
      );

      // BYPASS MODE: Pass articles with trend-based scores
      if (BYPASS_MODE_ENABLED) {
        this.logger.warn(
          `🔄 BYPASS MODE: Passing ${articles.length} articles based on trend scores`,
        );
        return this.bypassScoring(articles, "Gemini API error - using bypass");
      }

      // Fallback: assign default scores based on trend score
      return articles.map((article) => ({
        ...article,
        relevanceScore: Math.min((article.trendScore || 0) / 10, 100),
        reasoning: "Fallback scoring (Gemini unavailable)",
        suggestedTags: [],
      }));
    }
  }

  /**
   * Bypass scoring - use trend scores directly
   * All articles with trendScore >= 200 get high relevance scores
   */
  private bypassScoring(
    articles: CollectedArticle[],
    reason: string,
  ): ScoredArticle[] {
    return articles.map((article) => {
      // Convert trend score (0-300) to relevance score (0-100)
      // trendScore 200+ = relevanceScore 70+
      const trendScore = article.trendScore || 100;
      const relevanceScore = Math.min(Math.max(trendScore / 3, 50), 100);

      return {
        ...article,
        relevanceScore: Math.round(relevanceScore),
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
