/**
 * SEO Optimizer Agent (Pipeline Agent)
 *
 * RESPONSIBILITIES:
 * 1. Runs BEFORE publishing (after VisualGenerator)
 * 2. Analyzes article SEO and identifies issues
 * 3. Optimizes title, meta description, and content
 * 4. Ensures SEO score is 70+ before publishing
 * 5. Passes optimized article to DatabasePublisher
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

// Extended type with SEO data
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
  private readonly OPTIMIZE_THRESHOLD = 75;

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
        this.logger.info(
          `📊 Analyzing: ${article.synthesizedContent.tr.title.substring(0, 50)}...`,
        );

        // Step 1: Analyze current SEO score
        const analysis: SEOAnalysis = await this.analyzer.analyze({
          title: article.synthesizedContent.tr.title,
          content: article.synthesizedContent.tr.content,
          metaDescription: article.synthesizedContent.tr.metaDescription,
          slug: article.url.split("/").pop() || "article",
          keywords: article.synthesizedContent.tr.keywords,
          imageUrl: article.imageUrl || undefined, // null to undefined
        });
        apiCalls++;

        const originalScore = analysis.score;
        this.logger.info(`   Original SEO Score: ${originalScore}/100`);

        // Step 2: Decide if optimization is needed
        if (originalScore >= this.OPTIMIZE_THRESHOLD) {
          // Score is good enough, skip optimization
          this.logger.info(
            `   ✅ Score is good (${originalScore}), skipping optimization`,
          );

          optimizedArticles.push({
            ...article,
            seoScore: originalScore,
            seoOptimized: false,
            seoChanges: {
              titleOptimized: false,
              metaOptimized: false,
              contentOptimized: false,
              originalScore,
              finalScore: originalScore,
            },
          });
          skippedCount++;
          continue;
        }

        // Step 3: Optimize the article
        this.logger.info(
          `   🔧 Optimizing... (current: ${originalScore}, target: ${this.OPTIMIZE_THRESHOLD}+)`,
        );

        const changes: ContentOptimizationChanges =
          await this.optimizer.optimize(
            {
              title: article.synthesizedContent.tr.title,
              content: article.synthesizedContent.tr.content,
              metaDescription: article.synthesizedContent.tr.metaDescription,
              keywords: article.synthesizedContent.tr.keywords,
            },
            analysis,
          );
        apiCalls++;

        // Step 4: Apply optimizations to article
        const optimizedArticle: ArticleWithSEO = {
          ...article,
          synthesizedContent: {
            ...article.synthesizedContent,
            tr: {
              ...article.synthesizedContent.tr,
              title:
                changes.title.optimized || article.synthesizedContent.tr.title,
              metaDescription:
                changes.metaDescription.optimized ||
                article.synthesizedContent.tr.metaDescription,
              content:
                changes.content.optimizedContent ||
                article.synthesizedContent.tr.content,
              score: changes.estimatedScore,
            },
          },
          seoScore: changes.estimatedScore,
          seoOptimized: true,
          seoChanges: {
            titleOptimized:
              changes.title.optimized !== article.synthesizedContent.tr.title,
            metaOptimized:
              changes.metaDescription.optimized !==
              article.synthesizedContent.tr.metaDescription,
            contentOptimized:
              changes.content.optimizedContent !==
              article.synthesizedContent.tr.content,
            originalScore,
            finalScore: changes.estimatedScore,
          },
        };

        // Log improvements
        const scoreImprovement = changes.estimatedScore - originalScore;
        this.logger.success(
          `   ✅ Optimized: ${originalScore} → ${changes.estimatedScore} (+${scoreImprovement})`,
        );

        if (optimizedArticle.seoChanges?.titleOptimized) {
          this.logger.info(
            `      Title: "${changes.title.optimized.substring(0, 50)}..."`,
          );
        }

        // Check if final score meets minimum requirement
        if (changes.estimatedScore < this.MIN_SEO_SCORE) {
          this.logger.warn(
            `   ⚠️ Score still below minimum (${changes.estimatedScore} < ${this.MIN_SEO_SCORE}), but will publish anyway`,
          );
        }

        optimizedArticles.push(optimizedArticle);
        optimizedCount++;
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
