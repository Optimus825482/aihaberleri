import { prisma } from "@/lib/prisma";
import { notifyGoogle } from "@/lib/seo/google-indexing-api";

/**
 * Google Indexing Batch Worker
 *
 * Bu worker, planlanmış batch işlemlerini kontrol eder ve
 * zamanı gelen batch'leri işler.
 *
 * Kullanım:
 * - Cron job ile her saat çalıştırılmalı
 * - Vercel Cron: /api/cron/google-indexing-batch
 */

export async function processGoogleIndexingBatches() {
  console.log("[Google Indexing Batch Worker] Starting...");

  try {
    // Find pending batches that are due
    const now = new Date();
    const pendingBatches = await prisma.googleIndexingBatch.findMany({
      where: {
        status: "PENDING",
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        items: {
          where: {
            status: "PENDING",
          },
          include: {
            article: {
              select: {
                id: true,
                slug: true,
                language: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledFor: "asc",
      },
    });

    console.log(
      `[Google Indexing Batch Worker] Found ${pendingBatches.length} pending batches`,
    );

    for (const batch of pendingBatches) {
      await processBatch(batch);
    }

    console.log("[Google Indexing Batch Worker] Completed");
    return {
      success: true,
      processedBatches: pendingBatches.length,
    };
  } catch (error) {
    console.error("[Google Indexing Batch Worker] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function processBatch(batch: any) {
  console.log(`[Batch ${batch.id}] Processing ${batch.items.length} items`);

  // Update batch status to PROCESSING
  await prisma.googleIndexingBatch.update({
    where: { id: batch.id },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
    },
  });

  let processedCount = 0;
  let failedCount = 0;

  // Process each item
  for (const item of batch.items) {
    try {
      // Build full URL
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "https://aihaberleri.org";
      const languagePrefix = item.article.language === "en" ? "en/" : "";
      const fullUrl = `${baseUrl}/${languagePrefix}${item.article.slug}`;

      // Notify Google Indexing API
      const result = await notifyGoogle(fullUrl, "URL_UPDATED");

      if (result.success) {
        // Update item status
        await prisma.googleIndexingBatchItem.update({
          where: { id: item.id },
          data: {
            status: "SUCCESS",
            processedAt: new Date(),
          },
        });

        // Update article
        await prisma.article.update({
          where: { id: item.articleId },
          data: {
            googleIndexed: true,
            googleIndexedAt: new Date(),
            googleIndexStatus: "SUBMITTED",
            googleIndexingScheduled: false,
          },
        });

        processedCount++;
        console.log(
          `[Batch ${batch.id}] ✅ Article ${item.article.slug} notified`,
        );
      } else {
        throw new Error(result.error || "Failed to notify Google");
      }
    } catch (error) {
      console.error(
        `[Batch ${batch.id}] ❌ Failed to process item ${item.id}:`,
        error,
      );

      // Update item status
      await prisma.googleIndexingBatchItem.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date(),
        },
      });

      failedCount++;
    }

    // Rate limiting: Wait 1 second between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Update batch status
  await prisma.googleIndexingBatch.update({
    where: { id: batch.id },
    data: {
      status: failedCount === batch.items.length ? "FAILED" : "COMPLETED",
      processedArticles: processedCount,
      failedArticles: failedCount,
      completedAt: new Date(),
    },
  });

  console.log(
    `[Batch ${batch.id}] Completed: ${processedCount} success, ${failedCount} failed`,
  );
}
