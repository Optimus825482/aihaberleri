/**
 * SEO Calculator Agent
 *
 * RESPONSIBILITIES:
 * 1. Calculate SEO scores for newly published articles
 * 2. Run immediately after DatabasePublisher completes
 * 3. Analyze title, meta, content, keywords, images
 * 4. Store scores in database for filtering low SEO articles
 *
 * This is an OPTIONAL step after publishing.
 * It runs in the background and doesn't block the main pipeline.
 */

import { Job, Worker } from "bullmq";
import { getRedis } from "@/lib/redis";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";
import { createModuleLogger } from "@/lib/agent-log-stream";
import { db } from "@/lib/db";
import { SEOAnalyzerAgent, SEOAnalysis } from "./seo/analyzer.agent";

const logger = createModuleLogger("seo-calculator");

export interface SEOCalculationJob {
  articleId: string;
  slug: string;
  title: string;
  priority?: "high" | "normal" | "low";
}

export interface SEOCalculationResult {
  articleId: string;
  score: number;
  issues: number;
  success: boolean;
  error?: string;
}

/**
 * Add article to SEO calculation queue
 */
export async function queueSEOCalculation(
  article: SEOCalculationJob,
): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.SEO_CALCULATION);
  if (!queue) {
    logger.warn("SEO calculation queue not available");
    return;
  }

  const priority =
    article.priority === "high" ? 1 : article.priority === "low" ? 10 : 5;

  await queue.add("calculate-seo", article, {
    jobId: `seo-calc-${article.articleId}`,
    priority,
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2, // SEO is optional, don't retry too many times
    backoff: {
      type: "exponential",
      delay: 10000, // 10 seconds
    },
  });

  logger.info(`Queued SEO calculation: ${article.title.substring(0, 50)}...`);
}

/**
 * Process SEO calculation jobs
 */
async function processSEOJob(
  job: Job<SEOCalculationJob>,
): Promise<SEOCalculationResult> {
  const { articleId, slug, title } = job.data;
  const startTime = Date.now();

  logger.info(`Calculating SEO for: ${title.substring(0, 50)}...`);

  try {
    // Fetch full article from database
    const article = await db.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        content: true,
        metaDescription: true,
        slug: true,
        keywords: true,
        imageUrl: true,
        seoScore: true,
      },
    });

    if (!article) {
      return {
        articleId,
        score: 0,
        issues: 0,
        success: false,
        error: "Article not found",
      };
    }

    // Already has valid SEO score? Skip recalculation
    if (article.seoScore !== null && article.seoScore > 0) {
      logger.info(
        `SEO score already calculated (${article.seoScore}), skipping`,
      );
      return {
        articleId,
        score: article.seoScore,
        issues: 0,
        success: true,
      };
    }

    // Initialize SEO Analyzer
    const analyzer = new SEOAnalyzerAgent();

    // Analyze article
    const analysis: SEOAnalysis = await analyzer.analyze({
      title: article.title,
      content: article.content,
      metaDescription: article.metaDescription || undefined,
      slug: article.slug,
      keywords: article.keywords,
      imageUrl: article.imageUrl || undefined,
    });

    // Update article with SEO score
    await db.article.update({
      where: { id: articleId },
      data: {
        seoScore: analysis.score,
        // Note: seoAnalyzedAt will be set if field exists in schema
      },
    });

    const duration = Date.now() - startTime;
    logger.success(
      `SEO calculated: ${title.substring(0, 30)}... → Score: ${analysis.score} (${duration}ms)`,
    );

    return {
      articleId,
      score: analysis.score,
      issues: analysis.issues.length,
      success: true,
    };
  } catch (error) {
    logger.error(`SEO calculation failed: ${(error as Error).message}`);
    return {
      articleId,
      score: 0,
      issues: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * SEO Calculator Worker
 * Call this to start the worker
 */
export async function startSEOCalculatorWorker(): Promise<Worker | null> {
  const redis = getRedis();
  if (!redis) {
    logger.error("Redis not available for SEO calculator");
    return null;
  }

  const worker = new Worker(QUEUE_NAMES.SEO_CALCULATION, processSEOJob, {
    connection: {
      host: redis.options.host,
      port: redis.options.port,
      password: redis.options.password,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
    concurrency: 2, // Process 2 SEO calculations in parallel
    limiter: {
      max: 5,
      duration: 1000,
    },
    lockDuration: 600000, // 10 minutes
  });

  worker.on("completed", (job, result) => {
    if (result.success) {
      logger.success(`SEO job ${job.id} completed: score=${result.score}`);
    }
  });

  worker.on("failed", (job, error) => {
    logger.error(`SEO job ${job?.id} failed: ${error.message}`);
  });

  worker.on("ready", () => {
    logger.success("SEO Calculator Worker is ready");
  });

  logger.info("SEO Calculator Worker started");
  return worker;
}

/**
 * Queue batch SEO calculation for recently published articles
 */
export async function queuePendingSEOCalculations(
  limit: number = 50,
): Promise<number> {
  const articles = await db.article.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ seoScore: null }, { seoScore: 0 }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: limit,
  });

  for (const article of articles) {
    await queueSEOCalculation({
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      priority: "normal",
    });
  }

  logger.info(`Queued ${articles.length} articles for SEO calculation`);
  return articles.length;
}

export default {
  queueSEOCalculation,
  startSEOCalculatorWorker,
  queuePendingSEOCalculations,
};
