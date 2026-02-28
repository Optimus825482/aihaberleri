/**
 * SEO Calculator Worker - Bulk SEO Score Calculation
 *
 * Bu worker:
 * 1. Toplu SEO skorları hesaplar (100 makale/batch)
 * 2. Progress tracking (Redis)
 * 3. Error handling ve retry
 * 4. Metrics ve logging
 */

import { Worker, Job } from "bullmq";
import { getRedis } from "@/lib/redis";
import { db } from "@/lib/db";
import { createModuleLogger } from "@/lib/agent-log-stream";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";

const logger = createModuleLogger("seo-calculator");

interface SEOCalculationJob {
  articleIds: string[];
  jobId: string;
  batchSize?: number;
}

interface SEOCalculationResult {
  success: boolean;
  processed: number;
  failed: number;
  duration: number;
  errors: string[];
}

/**
 * Calculate SEO score for a single article
 */
async function calculateArticleSEO(articleId: string): Promise<{
  score: number;
  issues: string[];
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

    let score = 100;
    const issues: string[] = [];

    // Title checks (display title: 30-100 chars)
    if (!article.title || article.title.length < 30) {
      score -= 10;
      issues.push("Title too short (min 30 chars)");
    }
    if (article.title && article.title.length > 100) {
      score -= 5;
      issues.push("Title too long (max 100 chars)");
    }

    // Meta description checks
    if (!article.metaDescription || article.metaDescription.length < 120) {
      score -= 10;
      issues.push("Meta description too short (min 120 chars)");
    }
    if (article.metaDescription && article.metaDescription.length > 160) {
      score -= 5;
      issues.push("Meta description too long (max 160 chars)");
    }

    // Content checks
    if (!article.content || article.content.length < 300) {
      score -= 15;
      issues.push("Content too short (min 300 chars)");
    }

    // Image checks
    if (!article.imageUrl || article.imageUrl === "/logos/og-image.png") {
      score -= 10;
      issues.push("Missing or default image");
    }

    // Keywords check
    if (!article.keywords || article.keywords.length === 0) {
      score -= 10;
      issues.push("No keywords defined");
    }

    // Slug check
    if (!article.slug || article.slug.length < 3) {
      score -= 5;
      issues.push("Invalid slug");
    }

    // Ensure score is between 0-100
    score = Math.max(0, Math.min(100, score));

    return { score, issues };
  } catch (error) {
    logger.error(`Failed to calculate SEO for article ${articleId}:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Process batch of articles
 */
async function processBatch(
  articleIds: string[],
  jobId: string,
): Promise<{ processed: number; failed: number; errors: string[] }> {
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const articleId of articleIds) {
    try {
      const { score, issues } = await calculateArticleSEO(articleId);

      // Update article with SEO score
      await db.article.update({
        where: { id: articleId },
        data: {
          seoScore: score,
        },
      });

      processed++;
      logger.info(
        `✅ SEO calculated for article ${articleId}: ${score}/100 (${issues.length} issues)`,
      );
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${articleId}: ${errorMsg}`);
      logger.error(`❌ Failed to process article ${articleId}:`, {
        error: errorMsg,
      });
    }
  }

  return { processed, failed, errors };
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
      `seo:calculation:${jobId}`,
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
  job: Job<SEOCalculationJob>,
): Promise<SEOCalculationResult> {
  const startTime = Date.now();
  const { articleIds, jobId, batchSize = 100 } = job.data;

  logger.info(`🚀 Starting SEO calculation job ${jobId}`, {
    totalArticles: articleIds.length,
    batchSize,
  });

  await updateProgress(jobId, 0, articleIds.length, "processing");

  let totalProcessed = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  // Process in batches
  for (let i = 0; i < articleIds.length; i += batchSize) {
    const batch = articleIds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(articleIds.length / batchSize);

    logger.info(`📦 Processing batch ${batchNum}/${totalBatches}`, {
      batchSize: batch.length,
    });

    const { processed, failed, errors } = await processBatch(batch, jobId);

    totalProcessed += processed;
    totalFailed += failed;
    allErrors.push(...errors);

    // Update progress
    await updateProgress(
      jobId,
      totalProcessed + totalFailed,
      articleIds.length,
      "processing",
    );

    // Update job progress
    await job.updateProgress(
      Math.round(((totalProcessed + totalFailed) / articleIds.length) * 100),
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

  logger.success(`✅ SEO calculation completed`, {
    processed: totalProcessed,
    failed: totalFailed,
    duration: `${duration}s`,
  });

  return {
    success: totalFailed < articleIds.length,
    processed: totalProcessed,
    failed: totalFailed,
    duration,
    errors: allErrors,
  };
}

/**
 * Initialize and start worker
 */
export function startSEOCalculatorWorker(): Worker | null {
  const redis = getRedis();
  if (!redis) {
    logger.error("Redis not available, cannot start SEO calculator worker");
    return null;
  }

  logger.info("🚀 Starting SEO Calculator Worker...");

  const worker = new Worker<SEOCalculationJob, SEOCalculationResult>(
    QUEUE_NAMES.SEO_CALCULATION,
    processJob,
    {
      connection: redis,
      concurrency: 2, // Process 2 jobs in parallel
      limiter: {
        max: 5,
        duration: 1000, // Max 5 jobs per second
      },
      lockDuration: 600000, // 10 minutes
      maxStalledCount: 2,
      stalledInterval: 60000,
    },
  );

  // Event handlers
  worker.on("ready", () => {
    logger.success("✅ SEO Calculator Worker ready");
  });

  worker.on("active", (job) => {
    logger.info(`🔄 Job ${job.id} active`);
  });

  worker.on("completed", (job, result) => {
    logger.success(`✅ Job ${job.id} completed`, {
      processed: result.processed,
      failed: result.failed,
      duration: `${result.duration}s`,
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
    logger.info("SIGTERM received, closing SEO calculator worker...");
    await worker.close();
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT received, closing SEO calculator worker...");
    await worker.close();
  });

  logger.success("✅ SEO Calculator Worker started");

  return worker;
}

// Auto-start if run directly
if (require.main === module) {
  startSEOCalculatorWorker();

  // Keep process alive
  process.stdin.resume();
}
