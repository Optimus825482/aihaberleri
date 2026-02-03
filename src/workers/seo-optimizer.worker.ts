/**
 * SEO Optimizer Worker - Bulk SEO Optimization with Multi-Agent
 *
 * Bu worker:
 * 1. Toplu SEO optimizasyonu yapar
 * 2. SEO Orchestrator Service kullanır (multi-agent pipeline)
 * 3. Progress tracking (Redis)
 * 4. Error handling ve retry
 * 5. Metrics ve logging
 */

import { Worker, Job } from "bullmq";
import { getRedis } from "@/lib/redis";
import { db } from "@/lib/db";
import { createModuleLogger } from "@/lib/agent-log-stream";
import { QUEUE_NAMES } from "@/lib/queue-manager";

const logger = createModuleLogger("seo-optimizer");

interface SEOOptimizationJob {
  articleIds: string[];
  jobId: string;
  batchSize?: number;
}

interface SEOOptimizationResult {
  success: boolean;
  optimized: number;
  failed: number;
  duration: number;
  errors: string[];
  improvements: Array<{
    articleId: string;
    before: number;
    after: number;
    changes: string[];
  }>;
}

/**
 * Optimize single article using SEO Orchestrator
 */
async function optimizeArticleSEO(articleId: string): Promise<{
  success: boolean;
  before: number;
  after: number;
  changes: string[];
}> {
  try {
    const article = await db.article.findUnique({
      where: { id: articleId },
      include: {
        category: true,
      },
    });

    if (!article) {
      throw new Error(`Article not found: ${articleId}`);
    }

    const beforeScore = article.seoScore || 0;
    logger.info(
      `🔍 Optimizing article ${articleId}: "${article.title.substring(0, 50)}..."`,
    );
    logger.info(`   Current SEO Score: ${beforeScore}/100`);

    // Import SEO Orchestrator
    const { SEOOrchestratorService } =
      await import("@/services/seo-orchestrator.service");

    // Run optimization in AUTO mode
    const orchestrator = new SEOOrchestratorService();
    const result = await orchestrator.optimizeArticle(articleId, {
      mode: "auto", // Otomatik uygula
      agents: ["all"], // Tüm agent'ları kullan
      includeRelatedArticles: true, // Internal linking için
    });

    if (!result.success) {
      throw new Error(result.error || "Optimization failed");
    }

    // Get updated article
    const updatedArticle = await db.article.findUnique({
      where: { id: articleId },
      select: { seoScore: true },
    });

    const afterScore = updatedArticle?.seoScore || beforeScore;
    const improvement = afterScore - beforeScore;

    logger.success(
      `✅ Article ${articleId} optimized: ${beforeScore} → ${afterScore} (+${improvement})`,
    );

    // Extract changes from result
    const changes: string[] = [];
    if (result.changes) {
      if (result.changes.title !== article.title) {
        changes.push(
          `Title updated: "${article.title}" → "${result.changes.title}"`,
        );
      }
      if (result.changes.metaDescription !== article.metaDescription) {
        changes.push("Meta description optimized");
      }
      if (result.changes.slug !== article.slug) {
        changes.push(
          `Slug updated: "${article.slug}" → "${result.changes.slug}"`,
        );
      }
      if (result.changes.improvements.length > 0) {
        changes.push(...result.changes.improvements);
      }
    }

    return {
      success: true,
      before: beforeScore,
      after: afterScore,
      changes,
    };
  } catch (error) {
    logger.error(`Failed to optimize article ${articleId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return partial success if article exists
    const article = await db.article.findUnique({
      where: { id: articleId },
      select: { seoScore: true },
    });

    return {
      success: false,
      before: article?.seoScore || 0,
      after: article?.seoScore || 0,
      changes: [
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}

/**
 * Process batch of articles with better error handling
 */
async function processBatch(
  articleIds: string[],
  jobId: string,
): Promise<{
  optimized: number;
  failed: number;
  errors: string[];
  improvements: Array<{
    articleId: string;
    before: number;
    after: number;
    changes: string[];
  }>;
}> {
  let optimized = 0;
  let failed = 0;
  const errors: string[] = [];
  const improvements: Array<{
    articleId: string;
    before: number;
    after: number;
    changes: string[];
  }> = [];

  logger.info(
    `📦 Processing batch of ${articleIds.length} articles for job ${jobId}`,
  );

  for (const articleId of articleIds) {
    try {
      logger.info(`🔄 Processing article ${articleId}...`);

      const result = await optimizeArticleSEO(articleId);

      if (result.success) {
        optimized++;
        improvements.push({
          articleId,
          before: result.before,
          after: result.after,
          changes: result.changes,
        });

        logger.success(`✅ Article ${articleId} optimized successfully`);
      } else {
        failed++;
        const errorMsg = result.changes[0] || "Unknown error";
        errors.push(`${articleId}: ${errorMsg}`);
        logger.error(
          `❌ Article ${articleId} optimization failed: ${errorMsg}`,
        );
      }

      // Rate limiting between articles (2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${articleId}: ${errorMsg}`);
      logger.error(`❌ Failed to optimize article ${articleId}:`, {
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Continue with next article even if this one fails
      continue;
    }
  }

  logger.info(`📊 Batch complete: ${optimized} optimized, ${failed} failed`);

  return { optimized, failed, errors, improvements };
}

/**
 * Update job progress in Redis
 */
async function updateProgress(
  jobId: string,
  current: number,
  total: number,
  status: string,
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;

    const progress = Math.round((current / total) * 100);

    await redis.set(
      `seo:optimization:${jobId}`,
      JSON.stringify({
        status,
        progress,
        current,
        total,
        timestamp: new Date().toISOString(),
      }),
      "EX",
      3600, // Expire after 1 hour
    );
  } catch (error) {
    logger.error("Failed to update progress:", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Main worker processor
 */
async function processJob(
  job: Job<SEOOptimizationJob>,
): Promise<SEOOptimizationResult> {
  const startTime = Date.now();
  const { articleIds, jobId, batchSize = 10 } = job.data; // Smaller batch for optimization

  logger.info(`🚀 Starting SEO optimization job ${jobId}`, {
    totalArticles: articleIds.length,
    batchSize,
  });

  await updateProgress(jobId, 0, articleIds.length, "processing");

  let totalOptimized = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];
  const allImprovements: Array<{
    articleId: string;
    before: number;
    after: number;
    changes: string[];
  }> = [];

  // Process in batches
  for (let i = 0; i < articleIds.length; i += batchSize) {
    const batch = articleIds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(articleIds.length / batchSize);

    logger.info(`📦 Processing batch ${batchNum}/${totalBatches}`, {
      batchSize: batch.length,
    });

    const { optimized, failed, errors, improvements } = await processBatch(
      batch,
      jobId,
    );

    totalOptimized += optimized;
    totalFailed += failed;
    allErrors.push(...errors);
    allImprovements.push(...improvements);

    // Update progress
    await updateProgress(
      jobId,
      totalOptimized + totalFailed,
      articleIds.length,
      "processing",
    );

    // Update job progress
    await job.updateProgress(
      Math.round(((totalOptimized + totalFailed) / articleIds.length) * 100),
    );
  }

  const duration = Math.floor((Date.now() - startTime) / 1000);

  // Mark as completed
  await updateProgress(
    jobId,
    articleIds.length,
    articleIds.length,
    "completed",
  );

  logger.success(`✅ SEO optimization completed`, {
    optimized: totalOptimized,
    failed: totalFailed,
    duration: `${duration}s`,
  });

  return {
    success: totalFailed < articleIds.length,
    optimized: totalOptimized,
    failed: totalFailed,
    duration,
    errors: allErrors,
    improvements: allImprovements,
  };
}

/**
 * Initialize and start worker
 */
export function startSEOOptimizerWorker(): Worker | null {
  const redis = getRedis();
  if (!redis) {
    logger.error("Redis not available, cannot start SEO optimizer worker");
    return null;
  }

  logger.info("🚀 Starting SEO Optimizer Worker...");

  const worker = new Worker<SEOOptimizationJob, SEOOptimizationResult>(
    QUEUE_NAMES.SEO_OPTIMIZATION,
    processJob,
    {
      connection: redis,
      concurrency: 1, // Process 1 job at a time (AI-heavy)
      limiter: {
        max: 2,
        duration: 1000, // Max 2 jobs per second
      },
      lockDuration: 1200000, // 20 minutes (AI calls can be slow)
      maxStalledCount: 2,
      stalledInterval: 60000,
    },
  );

  // Event handlers
  worker.on("ready", () => {
    logger.success("✅ SEO Optimizer Worker ready");
  });

  worker.on("active", (job) => {
    logger.info(`🔄 Job ${job.id} active`);
  });

  worker.on("completed", (job, result) => {
    logger.success(`✅ Job ${job.id} completed`, {
      optimized: result.optimized,
      failed: result.failed,
      duration: `${result.duration}s`,
      avgImprovement:
        result.improvements.length > 0
          ? Math.round(
              result.improvements.reduce(
                (sum, imp) => sum + (imp.after - imp.before),
                0,
              ) / result.improvements.length,
            )
          : 0,
    });
  });

  worker.on("failed", (job, error) => {
    logger.error(`❌ Job ${job?.id} failed:`, {
      error: error.message,
    });
  });

  worker.on("error", (error) => {
    // Suppress NOAUTH errors
    if (error.message && error.message.includes("NOAUTH")) {
      return;
    }
    logger.error("❌ Worker error:", { error: error.message });
  });

  worker.on("stalled", (jobId) => {
    logger.warn(`⚠️ Job ${jobId} stalled`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, closing SEO optimizer worker...");
    await worker.close();
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT received, closing SEO optimizer worker...");
    await worker.close();
  });

  logger.success("✅ SEO Optimizer Worker started");

  return worker;
}

// Auto-start if run directly
if (require.main === module) {
  startSEOOptimizerWorker();

  // Keep process alive
  process.stdin.resume();
}
