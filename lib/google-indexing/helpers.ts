/**
 * Google Indexing API - Helper Functions
 *
 * Bu dosya Google Indexing tracking için yardımcı fonksiyonları içerir
 */

import { prisma } from "@/lib/prisma";
import {
  IndexStatus,
  IndexType,
  BatchStatus,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  ErrorCode,
  RateLimitConfig,
  RATE_LIMITS,
} from "./types";

// ============================================================================
// RETRY LOGIC HELPERS
// ============================================================================

/**
 * Sonraki retry zamanını hesaplar (exponential backoff)
 */
export function calculateNextRetry(
  retryCount: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Date {
  const delayMinutes =
    config.delays[Math.min(retryCount, config.delays.length - 1)];

  if (config.exponentialBackoff && retryCount > 0) {
    // Exponential backoff: 5, 15, 60 -> 5, 30, 120
    const exponentialDelay = delayMinutes * Math.pow(2, retryCount - 1);
    return new Date(Date.now() + exponentialDelay * 60 * 1000);
  }

  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

/**
 * Retry yapılabilir mi kontrol eder
 */
export function canRetry(
  retryCount: number,
  maxRetries: number = DEFAULT_RETRY_CONFIG.maxRetries,
): boolean {
  return retryCount < maxRetries;
}

/**
 * Retry için uygun makaleleri getirir
 */
export async function getRetryableArticles(
  indexType: IndexType,
  limit: number = 100,
) {
  const statusField =
    indexType === IndexType.GOOGLE ? "googleIndexStatus" : "indexNowStatus";

  const retryCountField =
    indexType === IndexType.GOOGLE
      ? "googleIndexRetryCount"
      : "indexNowRetryCount";

  const nextRetryField =
    indexType === IndexType.GOOGLE
      ? "googleIndexNextRetryAt"
      : "indexNowNextRetryAt";

  return await prisma.article.findMany({
    where: {
      [statusField]: IndexStatus.FAILED,
      [retryCountField]: { lt: DEFAULT_RETRY_CONFIG.maxRetries },
      [nextRetryField]: { lte: new Date() },
    },
    orderBy: { [nextRetryField]: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      [statusField]: true,
      [retryCountField]: true,
      [nextRetryField]: true,
    },
  });
}

// ============================================================================
// BATCH HELPERS
// ============================================================================

/**
 * Batch progress hesaplar
 */
export function calculateBatchProgress(batch: {
  totalArticles: number;
  submittedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
}): number {
  if (batch.totalArticles === 0) return 0;

  const processed = batch.successCount + batch.failedCount + batch.skippedCount;
  return Math.round((processed / batch.totalArticles) * 100);
}

/**
 * Tahmini kalan süreyi hesaplar
 */
export function estimateTimeRemaining(batch: {
  totalArticles: number;
  submittedCount: number;
  startedAt: Date | null;
}): number | null {
  if (!batch.startedAt || batch.submittedCount === 0) return null;

  const elapsedSeconds = (Date.now() - batch.startedAt.getTime()) / 1000;
  const articlesPerSecond = batch.submittedCount / elapsedSeconds;
  const remainingArticles = batch.totalArticles - batch.submittedCount;

  return Math.round(remainingArticles / articlesPerSecond);
}

/**
 * Batch başarı oranını hesaplar
 */
export function calculateSuccessRate(batch: {
  successCount: number;
  failedCount: number;
  skippedCount: number;
}): number {
  const total = batch.successCount + batch.failedCount + batch.skippedCount;
  if (total === 0) return 0;

  return Math.round((batch.successCount / total) * 100);
}

/**
 * Aktif batch'leri getirir
 */
export async function getActiveBatches() {
  return await prisma.googleIndexingBatch.findMany({
    where: {
      status: {
        in: [BatchStatus.PROCESSING, BatchStatus.QUEUED, BatchStatus.PENDING],
      },
    },
    include: {
      _count: {
        select: { articles: true },
      },
    },
    orderBy: { startedAt: "desc" },
  });
}

// ============================================================================
// RATE LIMITING HELPERS
// ============================================================================

/**
 * Rate limit kontrolü yapar
 */
export async function checkRateLimit(
  indexType: IndexType,
  batchId?: string,
): Promise<{ allowed: boolean; resetAt?: Date; remaining?: number }> {
  const config = RATE_LIMITS[indexType];

  // Son 1 dakikadaki request sayısını kontrol et
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const recentRequests = await prisma.indexingHistory.count({
    where: {
      indexType,
      submittedAt: { gte: oneMinuteAgo },
      ...(batchId && { batchId }),
    },
  });

  const allowed = recentRequests < config.requestsPerMinute;
  const remaining = Math.max(0, config.requestsPerMinute - recentRequests);
  const resetAt = new Date(Date.now() + 60 * 1000);

  return { allowed, resetAt, remaining };
}

/**
 * Rate limit hit olduğunda batch'i günceller
 */
export async function handleRateLimitHit(batchId: string, resetAt: Date) {
  return await prisma.googleIndexingBatch.update({
    where: { id: batchId },
    data: {
      rateLimitHit: true,
      rateLimitResetAt: resetAt,
      status: BatchStatus.PAUSED,
    },
  });
}

// ============================================================================
// STATUS UPDATE HELPERS
// ============================================================================

/**
 * Makale indexing status'ünü günceller
 */
export async function updateArticleIndexStatus(
  articleId: string,
  indexType: IndexType,
  status: IndexStatus,
  options?: {
    error?: string;
    incrementRetry?: boolean;
    batchId?: string;
  },
) {
  const statusField =
    indexType === IndexType.GOOGLE ? "googleIndexStatus" : "indexNowStatus";

  const retryCountField =
    indexType === IndexType.GOOGLE
      ? "googleIndexRetryCount"
      : "indexNowRetryCount";

  const nextRetryField =
    indexType === IndexType.GOOGLE
      ? "googleIndexNextRetryAt"
      : "indexNowNextRetryAt";

  const lastErrorField =
    indexType === IndexType.GOOGLE
      ? "googleIndexLastError"
      : "indexNowLastError";

  const submittedAtField =
    indexType === IndexType.GOOGLE ? "googleIndexedAt" : "indexNowSubmittedAt";

  const updateData: any = {
    [statusField]: status,
  };

  if (status === IndexStatus.SUCCESS) {
    updateData[submittedAtField] = new Date();
    updateData[retryCountField] = 0;
    updateData[nextRetryField] = null;
    updateData[lastErrorField] = null;
  }

  if (status === IndexStatus.FAILED && options?.incrementRetry) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { [retryCountField]: true },
    });

    const currentRetryCount = article?.[retryCountField] || 0;
    const newRetryCount = currentRetryCount + 1;

    updateData[retryCountField] = newRetryCount;

    if (canRetry(newRetryCount)) {
      updateData[statusField] = IndexStatus.SCHEDULED;
      updateData[nextRetryField] = calculateNextRetry(newRetryCount);
    }
  }

  if (options?.error) {
    updateData[lastErrorField] = options.error;
  }

  if (options?.batchId && indexType === IndexType.GOOGLE) {
    updateData.googleIndexBatchId = options.batchId;
  }

  return await prisma.article.update({
    where: { id: articleId },
    data: updateData,
  });
}

/**
 * Batch istatistiklerini günceller
 */
export async function updateBatchStats(batchId: string) {
  const batch = await prisma.googleIndexingBatch.findUnique({
    where: { id: batchId },
    include: {
      articles: {
        select: {
          googleIndexStatus: true,
        },
      },
    },
  });

  if (!batch) return null;

  const stats = batch.articles.reduce(
    (acc, article) => {
      switch (article.googleIndexStatus) {
        case IndexStatus.SUCCESS:
          acc.successCount++;
          break;
        case IndexStatus.FAILED:
          acc.failedCount++;
          break;
        case IndexStatus.SKIPPED:
          acc.skippedCount++;
          break;
      }

      if (article.googleIndexStatus !== IndexStatus.PENDING) {
        acc.submittedCount++;
      }

      return acc;
    },
    { submittedCount: 0, successCount: 0, failedCount: 0, skippedCount: 0 },
  );

  return await prisma.googleIndexingBatch.update({
    where: { id: batchId },
    data: stats,
  });
}

// ============================================================================
// HISTORY HELPERS
// ============================================================================

/**
 * Indexing history kaydı oluşturur
 */
export async function createIndexingHistory(data: {
  articleId: string;
  batchId?: string;
  indexType: IndexType;
  action: "SUBMIT" | "UPDATE" | "REMOVE";
  status: IndexStatus;
  requestUrl?: string;
  requestPayload?: any;
  responseStatus?: number;
  responseBody?: any;
  errorCode?: string;
  errorMessage?: string;
  duration?: number;
  retryAttempt?: number;
  isRetry?: boolean;
  originalId?: string;
}) {
  return await prisma.indexingHistory.create({
    data: {
      articleId: data.articleId,
      batchId: data.batchId,
      indexType: data.indexType,
      action: data.action,
      status: data.status,
      requestUrl: data.requestUrl,
      requestPayload: data.requestPayload,
      responseStatus: data.responseStatus,
      responseBody: data.responseBody,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      duration: data.duration,
      retryAttempt: data.retryAttempt || 0,
      isRetry: data.isRetry || false,
      originalId: data.originalId,
      submittedAt: new Date(),
      respondedAt: data.responseStatus ? new Date() : null,
    },
  });
}

/**
 * Makale için son indexing history'yi getirir
 */
export async function getLatestIndexingHistory(
  articleId: string,
  indexType?: IndexType,
) {
  return await prisma.indexingHistory.findFirst({
    where: {
      articleId,
      ...(indexType && { indexType }),
    },
    orderBy: { submittedAt: "desc" },
  });
}

// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

/**
 * Belirli bir dönem için indexing istatistiklerini getirir
 */
export async function getIndexingStats(period: "day" | "week" | "month") {
  const now = new Date();
  const startDate = new Date();

  switch (period) {
    case "day":
      startDate.setDate(now.getDate() - 1);
      break;
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
  }

  const batches = await prisma.googleIndexingBatch.findMany({
    where: {
      createdAt: { gte: startDate },
      status: BatchStatus.COMPLETED,
    },
  });

  const totalBatches = batches.length;
  const totalArticles = batches.reduce((sum, b) => sum + b.totalArticles, 0);
  const totalSuccess = batches.reduce((sum, b) => sum + b.successCount, 0);
  const totalFailed = batches.reduce((sum, b) => sum + b.failedCount, 0);
  const totalDuration = batches.reduce(
    (sum, b) => sum + (b.actualDuration || 0),
    0,
  );
  const rateLimitHits = batches.filter((b) => b.rateLimitHit).length;

  const successRate =
    totalArticles > 0 ? Math.round((totalSuccess / totalArticles) * 100) : 0;

  const averageDuration =
    totalBatches > 0 ? Math.round(totalDuration / totalBatches) : 0;

  return {
    period,
    totalBatches,
    totalArticles,
    successRate,
    averageDuration,
    rateLimitHits,
  };
}

// ============================================================================
// ERROR HANDLING HELPERS
// ============================================================================

/**
 * HTTP status code'dan error code çıkarır
 */
export function getErrorCodeFromStatus(statusCode: number): ErrorCode {
  if (statusCode === 429) return ErrorCode.RATE_LIMIT_EXCEEDED;
  if (statusCode === 401 || statusCode === 403) return ErrorCode.AUTH_ERROR;
  if (statusCode >= 500) return ErrorCode.SERVER_ERROR;
  if (statusCode === 408) return ErrorCode.TIMEOUT;
  if (statusCode >= 400) return ErrorCode.INVALID_URL;
  return ErrorCode.UNKNOWN;
}

/**
 * Error'un retry edilebilir olup olmadığını kontrol eder
 */
export function isRetryableError(errorCode: ErrorCode): boolean {
  const retryableErrors = [
    ErrorCode.RATE_LIMIT_EXCEEDED,
    ErrorCode.NETWORK_ERROR,
    ErrorCode.SERVER_ERROR,
    ErrorCode.TIMEOUT,
  ];

  return retryableErrors.includes(errorCode);
}

// ============================================================================
// URL HELPERS
// ============================================================================

/**
 * Makale için tam URL oluşturur
 */
export function buildArticleUrl(
  slug: string,
  locale: "tr" | "en" = "tr",
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const path = locale === "en" ? `/en/article/${slug}` : `/makale/${slug}`;
  return `${baseUrl}${path}`;
}

/**
 * URL'in geçerli olup olmadığını kontrol eder
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
