/**
 * SEO Optimizer Agent (Pipeline Agent)
 *
 * RESPONSIBILITIES:
 * 1. Runs BEFORE publishing (after VisualGenerator)
 * 2. Analyzes article SEO for BOTH Turkish (TR) and English (EN)
 * 3. Optimizes title, meta description, and content in both languages
 * 4. Ensures SEO score is above threshold before publishing
 * 5. Passes fully optimized bilingual article to DatabasePublisher
 *
 * PIPELINE POSITION:
 * VisualGenerator → SEO Optimizer → DatabasePublisher
 *
 * This agent ensures articles are SEO-optimized BEFORE they are published,
 * not after. This is the correct approach for maximum SEO impact.
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { SEOAnalyzerAgent, SEOAnalysis } from "./seo/analyzer.agent";
import {
  ContentOptimizerAgent,
  ContentOptimizationChanges,
} from "./seo/content-optimizer.agent";
import type { ArticleWithVisuals } from "./visual-generator.agent";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";

// Extended type with SEO data (TR + EN)
export interface ArticleWithSEO extends ArticleWithVisuals {
  seoScore: number;
  seoOptimized: boolean;
  seoChanges?: {
    titleOptimized: boolean;
    metaOptimized: boolean;
    contentOptimized: boolean;
    originalScore: number;
    finalScore: number;
  };
  seoScoreEn?: number;
  seoOptimizedEn?: boolean;
  seoChangesEn?: {
    titleOptimized: boolean;
    metaOptimized: boolean;
    contentOptimized: boolean;
    originalScore: number;
    finalScore: number;
  };
}

export class SEOOptimizerAgent extends BaseAgent<
  ArticleWithVisuals[],
  ArticleWithSEO[]
> {
  protected config = {
    name: "seo-optimizer",
    queueName: QUEUE_NAMES.SEO_OPTIMIZATION,
    enableMetrics: true,
  };

  private analyzer: SEOAnalyzerAgent;
  private optimizer: ContentOptimizerAgent;

  // Minimum SEO score required to publish
  private readonly MIN_SEO_SCORE = 60;
  // Score threshold below which we attempt optimization
  private readonly OPTIMIZE_THRESHOLD = 99;

  constructor() {
    super(QUEUE_NAMES.SEO_OPTIMIZATION);
    this.analyzer = new SEOAnalyzerAgent();
    this.optimizer = new ContentOptimizerAgent();
  }

  protected async process(
    job: Job<ArticleWithVisuals[]>,
  ): Promise<AgentResult<ArticleWithSEO[]>> {
    const articles = job.data;
    const startTime = Date.now();
    let apiCalls = 0;

    this.logger.info(
      `🎯 SEO Optimizer: ${articles.length} makale optimize ediliyor...`,
    );

    if (articles.length === 0) {
      return {
        success: true,
        data: [],
        skipNextQueue: false,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls: 0,
          itemsProcessed: 0,
        },
      };
    }

    const optimizedArticles: ArticleWithSEO[] = [];
    let optimizedCount = 0;
    let skippedCount = 0;

    for (const article of articles) {
      try {
        const trContent = article.synthesizedContent.tr;
        const slug = article.url.split("/").pop() || "article";
        const imageUrl = article.imageUrl || undefined;

        // ═══════════════════════════════════════════════
        // P0-2: TR + EN SEO in PARALLEL (was sequential)
        // ═══════════════════════════════════════════════

        const enContent = article.synthesizedContent?.en;
        const hasEnContent = !!(enContent?.title && enContent?.content);

        // --- TR SEO Task ---
        const trTask = async () => {
          this.logger.info(
            `📊 TR Analyzing: ${trContent.title.substring(0, 50)}...`,
          );

          const trAnalysis: SEOAnalysis = await this.analyzer.analyze(
            {
              title: trContent.title,
              content: trContent.content,
              metaDescription: trContent.metaDescription,
              slug,
              keywords: trContent.keywords,
              imageUrl,
            },
            "tr",
          );

          const trOriginalScore = trAnalysis.score;
          let trFinalScore = trOriginalScore;
          let trOptimizedFlag = false;
          let trSeoChanges: NonNullable<ArticleWithSEO["seoChanges"]> = {
            titleOptimized: false,
            metaOptimized: false,
            contentOptimized: false,
            originalScore: trOriginalScore,
            finalScore: trOriginalScore,
          };
          let calls = 1;

          if (trOriginalScore >= this.OPTIMIZE_THRESHOLD) {
            this.logger.info(
              `   ✅ TR Score good (${trOriginalScore}), skipping TR optimization`,
            );
          } else {
            this.logger.info(
              `   🔧 TR Optimizing... (current: ${trOriginalScore}, target: ${this.OPTIMIZE_THRESHOLD}+)`,
            );

            const trChanges: ContentOptimizationChanges =
              await this.optimizer.optimize(
                {
                  title: trContent.title,
                  content: trContent.content,
                  metaDescription: trContent.metaDescription,
                  keywords: trContent.keywords,
                },
                trAnalysis,
                "tr",
              );
            calls++;

            article.synthesizedContent.tr = {
              ...trContent,
              title: trChanges.title.optimized || trContent.title,
              metaDescription:
                trChanges.metaDescription.optimized ||
                trContent.metaDescription,
              content: trChanges.content.optimizedContent || trContent.content,
              score: trChanges.estimatedScore,
            };

            trFinalScore = trChanges.estimatedScore;
            trOptimizedFlag = true;
            trSeoChanges = {
              titleOptimized: trChanges.title.optimized !== trContent.title,
              metaOptimized:
                trChanges.metaDescription.optimized !==
                trContent.metaDescription,
              contentOptimized:
                trChanges.content.optimizedContent !== trContent.content,
              originalScore: trOriginalScore,
              finalScore: trFinalScore,
            };

            const improvement = trFinalScore - trOriginalScore;
            this.logger.success(
              `   ✅ TR Optimized: ${trOriginalScore} → ${trFinalScore} (+${improvement})`,
            );
          }

          return {
            score: trFinalScore,
            optimized: trOptimizedFlag,
            changes: trSeoChanges,
            calls,
          };
        };

        // --- EN SEO Task ---
        const enTask = async () => {
          if (!hasEnContent) {
            this.logger.info(
              `   ℹ️ No EN content found, skipping EN optimization`,
            );
            return {
              score: undefined,
              optimized: false,
              changes: undefined,
              calls: 0,
            };
          }

          this.logger.info(
            `📊 EN Analyzing: ${enContent!.title.substring(0, 50)}...`,
          );

          const enAnalysis: SEOAnalysis = await this.analyzer.analyze(
            {
              title: enContent!.title,
              content: enContent!.content,
              metaDescription: enContent!.metaDescription || "",
              slug,
              keywords: enContent!.keywords || [],
              imageUrl,
            },
            "en",
          );

          const enOriginalScore = enAnalysis.score;
          let enFinalScore = enOriginalScore;
          let enOptimizedFlag = false;
          let enSeoChanges: ArticleWithSEO["seoChangesEn"] = {
            titleOptimized: false,
            metaOptimized: false,
            contentOptimized: false,
            originalScore: enOriginalScore,
            finalScore: enOriginalScore,
          };
          let calls = 1;

          if (enOriginalScore >= this.OPTIMIZE_THRESHOLD) {
            this.logger.info(
              `   ✅ EN Score good (${enOriginalScore}), skipping EN optimization`,
            );
          } else {
            this.logger.info(
              `   🔧 EN Optimizing... (current: ${enOriginalScore}, target: ${this.OPTIMIZE_THRESHOLD}+)`,
            );

            const enChanges: ContentOptimizationChanges =
              await this.optimizer.optimize(
                {
                  title: enContent!.title,
                  content: enContent!.content,
                  metaDescription: enContent!.metaDescription || "",
                  keywords: enContent!.keywords || [],
                },
                enAnalysis,
                "en",
              );
            calls++;

            article.synthesizedContent.en = {
              ...enContent!,
              title: enChanges.title.optimized || enContent!.title,
              metaDescription:
                enChanges.metaDescription.optimized ||
                enContent!.metaDescription,
              content: enChanges.content.optimizedContent || enContent!.content,
            };

            enFinalScore = enChanges.estimatedScore;
            enOptimizedFlag = true;
            enSeoChanges = {
              titleOptimized: enChanges.title.optimized !== enContent!.title,
              metaOptimized:
                enChanges.metaDescription.optimized !==
                enContent!.metaDescription,
              contentOptimized:
                enChanges.content.optimizedContent !== enContent!.content,
              originalScore: enOriginalScore,
              finalScore: enChanges.estimatedScore,
            };

            const enImprovement = enChanges.estimatedScore - enOriginalScore;
            this.logger.success(
              `   ✅ EN Optimized: ${enOriginalScore} → ${enChanges.estimatedScore} (+${enImprovement})`,
            );
          }

          return {
            score: enFinalScore,
            optimized: enOptimizedFlag,
            changes: enSeoChanges,
            calls,
          };
        };

        // Run TR + EN in parallel
        const [trResult, enResult] = await Promise.all([trTask(), enTask()]);
        apiCalls += trResult.calls + enResult.calls;

        // Check minimum scores
        if (trResult.score < this.MIN_SEO_SCORE) {
          this.logger.warn(
            `   ⚠️ TR score below minimum (${trResult.score} < ${this.MIN_SEO_SCORE}), publishing anyway`,
          );
        }
        if (
          enResult.score !== undefined &&
          enResult.score < this.MIN_SEO_SCORE
        ) {
          this.logger.warn(
            `   ⚠️ EN score below minimum (${enResult.score} < ${this.MIN_SEO_SCORE}), publishing anyway`,
          );
        }

        optimizedArticles.push({
          ...article,
          seoScore: trResult.score,
          seoOptimized: trResult.optimized,
          seoChanges: trResult.changes,
          seoScoreEn: enResult.score,
          seoOptimizedEn: enResult.optimized,
          seoChangesEn: enResult.changes,
        });

        if (trResult.optimized || enResult.optimized) {
          optimizedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to optimize article: ${article.synthesizedContent.tr.title.substring(0, 50)}...`,
          this.serializeError(error),
        );

        // On error, pass article through without optimization
        optimizedArticles.push({
          ...article,
          seoScore: 0,
          seoOptimized: false,
        });
      }
    }

    // Forward to DatabasePublisher queue
    if (optimizedArticles.length > 0) {
      const publisherQueue = getQueue(QUEUE_NAMES.DATABASE_PUBLISHER);
      if (publisherQueue) {
        await publisherQueue.add("publish-articles", optimizedArticles, {
          priority: 1,
          removeOnComplete: true,
        });
        this.logger.info(
          `📤 Forwarded ${optimizedArticles.length} articles to DatabasePublisher`,
        );
      }
    }

    const duration = Date.now() - startTime;
    this.logger.success(
      `🎯 SEO Optimization complete: ${optimizedCount} optimized, ${skippedCount} skipped (${duration}ms)`,
    );

    return {
      success: true,
      data: optimizedArticles,
      skipNextQueue: true, // We manually forwarded to publisher
      metrics: {
        processingTime: duration,
        apiCalls,
        itemsProcessed: optimizedArticles.length,
      },
    };
  }
}

export default SEOOptimizerAgent;
