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
import { recordYouTubeFailure } from "@/lib/youtube-pipeline";
import type { DeduplicatedArticle } from "./duplicate-detector.agent";

/** RelevanceFilter bu alanları ekler; DuplicateDetector çıktısında henüz yok (opsiyonel). */
export interface ScoredArticle extends DeduplicatedArticle {
  relevanceScore?: number;
  reasoning?: string;
  suggestedCategory?: string;
  suggestedTags?: string[];
}

// 🔧 FIX: 35 → 55 — threshold too low was letting low-quality content through
// YouTube articles still handled via bypass mode when DeepSeek unavailable
// Content-collector already has negative keyword filtering for non-AI content
const RELEVANCE_THRESHOLD = 55; // Primary minimum score to pass
const FALLBACK_THRESHOLD_1 = 40; // 1st fallback: if 0 pass at 55, try 40
const FALLBACK_THRESHOLD_2 = 30; // 2nd fallback: if 0 pass at 40, try 30 (last resort)
const FALLBACK_MAX_ARTICLES = 2; // Max articles to publish from fallback (quality cap)
const BATCH_SIZE = 15; // Articles per batch (10 → 15 for faster processing)

// BYPASS MODE: If DeepSeek fails, apply basic AI keyword validation instead of passing everything
const BYPASS_MODE_ENABLED = true;

export class RelevanceFilterAgent extends BaseAgent<
  DeduplicatedArticle[],
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
    job: Job<DeduplicatedArticle[]>,
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

      // Filter by primary threshold
      let relevantArticles = scoredArticles.filter(
        (article) => (article.relevanceScore ?? 0) >= RELEVANCE_THRESHOLD,
      );

      // ⚡ ADAPTIVE FALLBACK: If nothing passes at 55, try lower thresholds
      // This guarantees at least 1 article per run during slow news periods
      if (relevantArticles.length === 0 && scoredArticles.length > 0) {
        // Sort by score descending so we pick the best available
        const sortedByScore = [...scoredArticles].sort(
          (a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0),
        );

        // Try fallback threshold 1: 40
        const fallback1 = sortedByScore.filter(
          (a) => (a.relevanceScore ?? 0) >= FALLBACK_THRESHOLD_1,
        );
        if (fallback1.length > 0) {
          relevantArticles = fallback1.slice(0, FALLBACK_MAX_ARTICLES);
          this.logger.warn(
            `⚡ ADAPTIVE FALLBACK (threshold 40): ${relevantArticles.length} makale alındı — primary threshold ${RELEVANCE_THRESHOLD}'e ulaşan yoktu`,
          );
        } else {
          // Try fallback threshold 2: 30 (last resort)
          const fallback2 = sortedByScore.filter(
            (a) => (a.relevanceScore ?? 0) >= FALLBACK_THRESHOLD_2,
          );
          if (fallback2.length > 0) {
            relevantArticles = fallback2.slice(0, FALLBACK_MAX_ARTICLES);
            this.logger.warn(
              `⚡ ADAPTIVE FALLBACK (threshold 30 — son çare): ${relevantArticles.length} makale alındı`,
            );
          } else {
            this.logger.warn(
              `⚠️ Hiçbir makale threshold ${FALLBACK_THRESHOLD_2}'yi geçemedi — bu run'da yeni içerik yok`,
            );
          }
        }
      }

      // P0-3: Track YouTube relevance failures for blacklisting
      const rejectedYouTube = scoredArticles.filter(
        (a) =>
          !relevantArticles.includes(a) &&
          a.url?.includes("youtube.com/watch"),
      );
      if (rejectedYouTube.length > 0) {
        await Promise.allSettled(
          rejectedYouTube.map((a) => recordYouTubeFailure(a.url)),
        );
        this.logger.info(
          `🚫 ${rejectedYouTube.length} YouTube video relevance failure kaydedildi`,
        );
      }

      const rejectedCount = scoredArticles.length - relevantArticles.length;
      const rejectionRate = (
        (rejectedCount / scoredArticles.length) *
        100
      ).toFixed(1);

      this.logger.success(
        `Filtered: ${relevantArticles.length}/${scoredArticles.length} articles passed (${rejectionRate}% rejected)`,
      );

      // 🔍 Log ALL scored articles for debugging (not just passed ones)
      this.logger.info("All scored articles:");
      scoredArticles
        .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
        .forEach((article, i) => {
          const status =
            (article.relevanceScore ?? 0) >= RELEVANCE_THRESHOLD ? "✅" : "❌";
          this.logger.info(
            `  ${status} [${article.relevanceScore ?? "?"}] ${article.title.substring(0, 60)}`,
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

      // BYPASS MODE: Pass articles with trend-based scores (metrik: bypass_count)
      if (BYPASS_MODE_ENABLED) {
        const bypassResult = this.bypassScoring(
          articles,
          "DeepSeek API error - using bypass",
        );
        const passed = bypassResult.filter(
          (a) => (a.relevanceScore ?? 0) >= RELEVANCE_THRESHOLD,
        ).length;
        this.logger.warn(
          `🔄 BYPASS MODE: bypass_count=${articles.length} passed=${passed} filtered=${articles.length - passed} (DeepSeek unavailable)`,
        );
        return bypassResult;
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
   * Bypass scoring - use trend scores as quality filter
   * 🛡️ FIXED (2026-02-12): Only pass articles with trendScore > 50
   * Previously: ALL articles got threshold+bonus → zero quality control
   * Now: Only trending articles pass, rest are filtered out
   */
  private bypassScoring(
    articles: CollectedArticle[],
    reason: string,
  ): ScoredArticle[] {
    const MIN_TREND_FOR_BYPASS = 20; // Lowered from 30 — adaptive fallback handles quality gate now

    return articles.map((article) => {
      const trendScore = article.trendScore || 0;

      // 🛡️ KEY FIX: If trend score is too low, give score BELOW threshold → filtered out
      if (trendScore < MIN_TREND_FOR_BYPASS) {
        return {
          ...article,
          relevanceScore: Math.round(trendScore / 2), // Will be below 65 threshold
          reasoning: `BYPASS MODE (FILTERED): ${reason}. Trend score ${trendScore} < ${MIN_TREND_FOR_BYPASS} minimum`,
          suggestedTags: [],
        };
      }

      // High trend articles: pass with threshold + bonus
      const bonus = Math.min((trendScore - MIN_TREND_FOR_BYPASS) / 10, 20);
      const relevanceScore = RELEVANCE_THRESHOLD + bonus;

      return {
        ...article,
        relevanceScore: Math.round(Math.min(relevanceScore, 100)),
        reasoning: `BYPASS MODE (PASSED): ${reason}. Trend score: ${trendScore}`,
        suggestedTags: [],
      };
    });
  }
}
