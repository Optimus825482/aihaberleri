/**
 * Slug Recovery Worker
 *
 * BullMQ worker that processes 404 slug recovery jobs in the background.
 * Concurrency: 3 — Exa search + DeepSeek + image generation per job.
 *
 * Job payload: { slug: string; categoryId: string }
 * Returns: { articleId, trSlug, enSlug, trTitle }
 */

import { Worker, Job } from "bullmq";
import { getRedis } from "@/lib/redis";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import {
  researchBySlug,
  generateContentForSlug,
  publishRecoveredArticle,
} from "@/lib/slug-recovery";
import { getCache } from "@/lib/cache";
import { createModuleLogger } from "@/lib/agent-log-stream";

const logger = createModuleLogger("slug-recovery-worker");

export interface SlugRecoveryJobData {
  slug: string;
  categoryId: string;
}

export interface SlugRecoveryJobResult {
  articleId: string;
  trSlug: string;
  enSlug: string;
  trTitle: string;
}

let workerInstance: Worker | null = null;

function buildConnection() {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not available for slug-recovery worker");
  return {
    host: redis.options.host as string,
    port: redis.options.port as number,
    password: redis.options.password as string | undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export function startSlugRecoveryWorker(): Worker {
  if (workerInstance) return workerInstance;

  const connection = buildConnection();

  workerInstance = new Worker<SlugRecoveryJobData, SlugRecoveryJobResult>(
    QUEUE_NAMES.SLUG_RECOVERY,
    async (job: Job<SlugRecoveryJobData, SlugRecoveryJobResult>) => {
      const { slug, categoryId } = job.data;
      logger.info(`[slug-recovery] ▶ ${slug}`);

      await job.updateProgress(5);

      // 1. Araştır
      const research = await researchBySlug(slug);
      if (research.sources.length === 0) {
        throw new Error(`Kaynak bulunamadı: "${research.query}"`);
      }
      await job.updateProgress(30);

      // 2. İçerik üret
      const content = await generateContentForSlug(slug, research);
      await job.updateProgress(65);

      // 3. Yayınla
      const result = await publishRecoveredArticle(slug, content, categoryId);
      await job.updateProgress(95);

      // 4. Cache temizle
      try {
        const cache = getCache();
        await cache.invalidateByTag("articles");
      } catch {
        // Cache hatası yayını engellemesin
      }

      await job.updateProgress(100);
      logger.info(`[slug-recovery] ✅ ${slug} → ${result.trSlug}`);

      return {
        articleId: result.articleId,
        trSlug: result.trSlug,
        enSlug: result.enSlug,
        trTitle: content.tr.title,
      };
    },
    {
      connection,
      concurrency: 3,
      lockDuration: 300000,
    },
  );

  workerInstance.on("completed", (job, ret) => {
    logger.info(`[slug-recovery] ✅ Job ${job.id} completed: ${ret?.trSlug}`);
  });

  workerInstance.on("failed", (job, err) => {
    logger.error(
      `[slug-recovery] ❌ Job ${job?.id} (${job?.data?.slug}) failed: ${err.message}`,
    );
  });

  logger.info("[slug-recovery] Worker started (concurrency: 3)");
  return workerInstance;
}

export async function stopSlugRecoveryWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
    logger.info("[slug-recovery] Worker stopped");
  }
}
