/**
 * Google Indexing API - TypeScript Type Definitions
 *
 * Bu dosya Google Indexing tracking için gerekli tüm type'ları içerir
 */

import { Prisma } from "@prisma/client";

// ============================================================================
// ENUM TYPES
// ============================================================================

export enum BatchType {
  MANUAL = "MANUAL",
  SCHEDULED = "SCHEDULED",
  AUTO_PUBLISH = "AUTO_PUBLISH",
  RETRY = "RETRY",
  BULK_UPDATE = "BULK_UPDATE",
}

export enum BatchStatus {
  PENDING = "PENDING",
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  PAUSED = "PAUSED",
}

export enum IndexType {
  INDEXNOW = "INDEXNOW",
  GOOGLE = "GOOGLE",
}

export enum IndexAction {
  SUBMIT = "SUBMIT",
  UPDATE = "UPDATE",
  REMOVE = "REMOVE",
}

export enum IndexStatus {
  PENDING = "PENDING",
  SUBMITTED = "SUBMITTED",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  SCHEDULED = "SCHEDULED",
  RATE_LIMITED = "RATE_LIMITED",
  SKIPPED = "SKIPPED",
}

// ============================================================================
// BATCH TYPES
// ============================================================================

export interface CreateBatchInput {
  batchType: BatchType;
  language: "tr" | "en" | "both";
  articleIds?: string[];
  filters?: ArticleFilters;
  scheduledAt?: Date;
  createdBy?: string;
  metadata?: Record<string, any>;
}

export interface ArticleFilters {
  status?: string[];
  categoryId?: string;
  publishedAfter?: Date;
  publishedBefore?: Date;
  indexStatus?: IndexStatus[];
  hasEnglishTranslation?: boolean;
}

export interface BatchProgress {
  batchId: string;
  status: BatchStatus;
  totalArticles: number;
  submittedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // seconds
}

export interface BatchResult {
  batchId: string;
  status: BatchStatus;
  totalArticles: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  duration: number; // seconds
  errors?: BatchError[];
}

export interface BatchError {
  articleId: string;
  articleTitle: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
}

// ============================================================================
// INDEXING TYPES
// ============================================================================

export interface IndexingRequest {
  articleId: string;
  indexType: IndexType;
  action: IndexAction;
  url: string;
  batchId?: string;
  metadata?: Record<string, any>;
}

export interface IndexingResponse {
  success: boolean;
  status: IndexStatus;
  responseStatus?: number;
  responseBody?: any;
  errorCode?: string;
  errorMessage?: string;
  duration: number; // milliseconds
}

export interface IndexingHistoryEntry {
  id: string;
  articleId: string;
  articleTitle: string;
  indexType: IndexType;
  action: IndexAction;
  status: IndexStatus;
  submittedAt: Date;
  respondedAt?: Date;
  duration?: number;
  errorMessage?: string;
  retryAttempt: number;
}

// ============================================================================
// RETRY TYPES
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  delays: number[]; // minutes for each retry attempt
  exponentialBackoff: boolean;
}

export interface RetryCandidate {
  articleId: string;
  articleTitle: string;
  indexType: IndexType;
  currentRetryCount: number;
  lastError?: string;
  nextRetryAt?: Date;
}

// ============================================================================
// RATE LIMITING TYPES
// ============================================================================

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  burstLimit?: number;
}

export interface RateLimitStatus {
  remaining: number;
  resetAt: Date;
  isLimited: boolean;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface IndexingStats {
  period: "day" | "week" | "month";
  totalBatches: number;
  totalArticles: number;
  successRate: number; // 0-100
  averageDuration: number; // seconds
  rateLimitHits: number;
  byLanguage: {
    tr: LanguageStats;
    en: LanguageStats;
  };
  byStatus: Record<IndexStatus, number>;
}

export interface LanguageStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  successRate: number;
}

export interface BatchPerformance {
  batchId: string;
  batchType: BatchType;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  articlesPerMinute: number;
  successRate: number;
  rateLimitHit: boolean;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardData {
  overview: {
    totalArticles: number;
    indexedArticles: number;
    pendingArticles: number;
    failedArticles: number;
    indexingRate: number; // percentage
  };
  recentBatches: BatchProgress[];
  recentHistory: IndexingHistoryEntry[];
  stats: IndexingStats;
  alerts: IndexingAlert[];
}

export interface IndexingAlert {
  id: string;
  type: "error" | "warning" | "info";
  message: string;
  articleId?: string;
  batchId?: string;
  createdAt: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface GoogleIndexingApiRequest {
  url: string;
  type: "URL_UPDATED" | "URL_DELETED";
}

export interface GoogleIndexingApiResponse {
  urlNotificationMetadata: {
    url: string;
    latestUpdate: {
      url: string;
      type: string;
      notifyTime: string;
    };
  };
}

export interface IndexNowApiRequest {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

// Note: Using simple interfaces instead of Prisma.GetPayload to avoid schema mismatches
export interface ArticleWithIndexing {
  id: string;
  title: string;
  slug: string;
  googleIndexStatus: IndexStatus | null;
  googleIndexBatchId: string | null;
  googleIndexingBatchItems?: Array<{
    id: string;
    batchId: string;
    status: string;
  }>;
}

export interface BatchWithDetails {
  id: string;
  status: string;
  totalArticles: number;
  processedArticles: number;
  failedArticles: number;
  items: Array<{
    id: string;
    article: {
      id: string;
      title: string;
      slug: string;
      googleIndexStatus: IndexStatus | null;
    };
  }>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  delays: [5, 15, 60], // 5 min, 15 min, 1 hour
  exponentialBackoff: true,
};

export const RATE_LIMITS: Record<IndexType, RateLimitConfig> = {
  [IndexType.INDEXNOW]: {
    requestsPerMinute: 60,
    requestsPerDay: 10000,
  },
  [IndexType.GOOGLE]: {
    requestsPerMinute: 200,
    requestsPerDay: 200,
  },
};

export const BATCH_SIZE_LIMITS = {
  SMALL: 50,
  MEDIUM: 100,
  LARGE: 200,
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================

export enum ErrorCode {
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  INVALID_URL = "INVALID_URL",
  NETWORK_ERROR = "NETWORK_ERROR",
  AUTH_ERROR = "AUTH_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  TIMEOUT = "TIMEOUT",
  UNKNOWN = "UNKNOWN",
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.RATE_LIMIT_EXCEEDED]:
    "Rate limit aşıldı, lütfen daha sonra tekrar deneyin",
  [ErrorCode.INVALID_URL]: "Geçersiz URL formatı",
  [ErrorCode.NETWORK_ERROR]: "Ağ bağlantı hatası",
  [ErrorCode.AUTH_ERROR]: "Kimlik doğrulama hatası",
  [ErrorCode.SERVER_ERROR]: "Sunucu hatası",
  [ErrorCode.TIMEOUT]: "İstek zaman aşımına uğradı",
  [ErrorCode.UNKNOWN]: "Bilinmeyen hata",
};
