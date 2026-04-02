/**
 * Visual Generator Agent
 *
 * RESPONSIBILITIES:
 * 1. Generate image prompts using DeepSeek
 * 2. Fetch images from Pollinations.ai (PARALLEL PROCESSING)
 * 3. Optimize and upload to R2
 * 4. Retry logic (3 attempts, exponential backoff)
 * 5. Timeout protection (30s max per image)
 * 6. Emit articles with visuals to articles-with-visuals queue
 * 7. ⚡ Early DB Check - Skip visual generation for existing articles (09.02.2026)
 *
 * EXTRACTED FROM: src/services/intelligent-news.service.ts - generateAndUploadImageInternal()
 * INTEGRATED WITH: src/lib/pollinations.ts, src/lib/image-optimizer.ts
 */

import { Job } from "bullmq";
import {
  BaseAgent,
  AgentResult,
  retryWithBackoff,
  withTimeout,
} from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import { generateImagePrompt } from "@/lib/deepseek"; // UPDATED: Using DeepSeek for image prompts
import { fetchPollinationsImage } from "@/lib/pollinations";
import { optimizeAndGenerateSizes } from "@/lib/image-optimizer";
import { generateSlug } from "@/lib/utils";
import { db } from "@/lib/db"; // ADDED: For early DB check
import type { EnrichedArticle } from "./pipeline-types";

export interface ArticleWithVisuals extends EnrichedArticle {
  imageUrl: string | null;
  imageUrlMedium: string | null;
  imageUrlSmall: string | null;
  imageUrlThumb: string | null;
  imageGenerationTime?: number;
}

const MAX_RETRIES = 3;
const PARALLEL_CONCURRENCY = 3; // OPTIMIZED: Process 3 images at a time (faster processing)
const RATE_LIMIT_DELAY = 1000; // OPTIMIZED: 1 second between batches (faster but safe)

export class VisualGeneratorAgent extends BaseAgent<
  EnrichedArticle[],
  ArticleWithVisuals[]
> {
  protected config = {
    name: "visual-generator",
    queueName: QUEUE_NAMES.ARTICLES_WITH_VISUALS,
    nextQueueName: QUEUE_NAMES.SEO_OPTIMIZATION, // Pipeline: Visual → SEO Optimizer → Publish
    enableMetrics: true,
  };

  constructor() {
    super("visual-generator");
  }

  protected async process(
    job: Job<EnrichedArticle[]>,
  ): Promise<AgentResult<ArticleWithVisuals[]>> {
    const articles = job.data;
    const startTime = Date.now();
    let apiCalls = 0;
    let tokensUsed = 0;

    this.logger.info(
      `Generating visuals for ${articles.length} articles (parallel: ${PARALLEL_CONCURRENCY})...`,
    );

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
      // Process articles in parallel batches
      const articlesWithVisuals: ArticleWithVisuals[] = [];

      for (let i = 0; i < articles.length; i += PARALLEL_CONCURRENCY) {
        const batch = articles.slice(i, i + PARALLEL_CONCURRENCY);
        this.logger.info(
          `Processing batch ${Math.floor(i / PARALLEL_CONCURRENCY) + 1}/${Math.ceil(articles.length / PARALLEL_CONCURRENCY)} (${batch.length} articles)`,
        );

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map((article) => this.generateVisualForArticle(article)),
        );

        apiCalls += batch.length * 2; // DeepSeek + Pollinations per article
        tokensUsed += batch.length * 500; // Estimate

        articlesWithVisuals.push(...batchResults);

        // Rate limiting between batches (increased to avoid 429 errors)
        if (i + PARALLEL_CONCURRENCY < articles.length) {
          this.logger.info(
            `⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s to avoid rate limit...`,
          );
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      }

      const successCount = articlesWithVisuals.filter(
        (a) => a.imageUrl !== null,
      ).length;
      const visualFailedCount = articlesWithVisuals.length - successCount;

      this.logger.success(
        `Visual generation complete: ${successCount}/${articlesWithVisuals.length} successful (visual_failed=${visualFailedCount})`,
      );

      return {
        success: true,
        data: articlesWithVisuals,
        nextQueue: QUEUE_NAMES.SEO_OPTIMIZATION,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls,
          tokensUsed,
          itemsProcessed: successCount,
          visualFailed: visualFailedCount,
        },
      };
    } catch (error) {
      this.logger.error(
        "Visual generation failed:",
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
   * Generate visual for a single article
   *
   * ⚠️ IMPORTANT: Only generates visuals for articles that WILL be published.
   * Articles that fail enrichment or have low scores are skipped.
   * ⚡ NEW (09.02.2026): Early DB check added to prevent duplicate visual generation
   */
  private async generateVisualForArticle(
    article: EnrichedArticle,
  ): Promise<ArticleWithVisuals> {
    const imageStartTime = Date.now();

    try {
      // ✅ SAFETY CHECK: Skip visual generation for articles that shouldn't be published
      // This prevents wasting API calls on articles that will be rejected later
      if (
        !article.synthesizedContent?.tr?.title ||
        !article.synthesizedContent?.tr?.content
      ) {
        this.logger.warn(
          `⚠️ Skipping visual: Article missing synthesized content`,
        );
        return {
          ...article,
          imageUrl: null,
          imageUrlMedium: null,
          imageUrlSmall: null,
          imageUrlThumb: null,
          imageGenerationTime: 0,
        };
      }

      // ⚡ NEW: Early DB check - Skip visual generation if article already exists
      // This prevents wasting Pollinations API calls on duplicates
      const slug = generateSlug(article.synthesizedContent.tr.title);
      const existingArticle = await db.article.findFirst({
        where: {
          OR: [{ slug }, { sourceUrl: article.url }],
        },
        select: { id: true, slug: true },
      });

      if (existingArticle) {
        this.logger.warn(
          `⚡ Skipping visual: Article already in DB (slug: ${existingArticle.slug}, id: ${existingArticle.id})`,
        );
        return {
          ...article,
          imageUrl: null,
          imageUrlMedium: null,
          imageUrlSmall: null,
          imageUrlThumb: null,
          imageGenerationTime: 0,
          _skippedReason: "Article already exists in database",
        } as ArticleWithVisuals;
      }

      // Check if article has minimum required score (if score exists)
      const articleScore =
        article.synthesizedContent?.tr?.score || article.relevanceScore;
      if (articleScore !== undefined && articleScore < 40) {
        this.logger.warn(
          `⚠️ Skipping visual: Article score ${articleScore} < 40 threshold`,
        );
        return {
          ...article,
          imageUrl: null,
          imageUrlMedium: null,
          imageUrlSmall: null,
          imageUrlThumb: null,
          imageGenerationTime: 0,
        };
      }

      const title = article.synthesizedContent.tr.title;
      const content = article.synthesizedContent.tr.content;
      const category = article.suggestedCategory || "yapay-zeka";
      const articleSlug = generateSlug(title);

      this.logger.info(`Generating visual: ${title.substring(0, 50)}...`);

      // Step 1: Generate image prompt with DeepSeek (content-focused, diverse prompts)
      this.logger.info(
        `🤖 Using LLM for image prompt generation (content-aware)`,
      );
      const imagePrompt: string = await retryWithBackoff(
        async () =>
          await withTimeout(
            generateImagePrompt(title, content, category),
            15000,
            "Image prompt generation timeout",
          ),
        2,
      );

      this.logger.info(`Image prompt: ${imagePrompt.substring(0, 100)}...`);

      // Step 2: Fetch image from Pollinations.ai with retry + 30s timeout per attempt
      const imageUrl = await retryWithBackoff(
        () =>
          withTimeout(
          fetchPollinationsImage(imagePrompt, {
            width: 1200,
            height: 630,
            model: "flux",
            enhance: true,
            safe: true,
          }),
            30_000,
            "Pollinations image fetch timeout",
          ),
        MAX_RETRIES,
      );

      // Step 3: Optimize and generate multiple sizes
      let imageSizes = {
        large: imageUrl,
        medium: imageUrl,
        small: imageUrl,
        thumb: imageUrl,
      };

      try {
        imageSizes = await withTimeout(
          optimizeAndGenerateSizes(imageUrl, articleSlug),
          20000,
          "Image optimization timeout",
        );
        this.logger.success("Image optimized and uploaded");
      } catch (optimizeError) {
        this.logger.warn(
          "Image optimization failed, using original:",
          this.serializeError(optimizeError),
        );
      }

      const imageGenerationTime = Date.now() - imageStartTime;

      this.logger.success(
        `Visual generated in ${imageGenerationTime}ms: ${title.substring(0, 50)}...`,
      );

      return {
        ...article,
        imageUrl: imageSizes.large,
        imageUrlMedium: imageSizes.medium,
        imageUrlSmall: imageSizes.small,
        imageUrlThumb: imageSizes.thumb,
        imageGenerationTime,
      };
    } catch (error) {
      const imageGenerationTime = Date.now() - imageStartTime;

      this.logger.error(
        `Visual generation failed for: ${article.synthesizedContent.tr.title.substring(0, 50)}...`,
        this.serializeError(error),
      );

      // Return article with null images (fallback will be used)
      return {
        ...article,
        imageUrl: null,
        imageUrlMedium: null,
        imageUrlSmall: null,
        imageUrlThumb: null,
        imageGenerationTime,
      };
    }
  }
}
