/**
 * SEO Worker Type Definitions
 */

// SEO Calculation Job
export interface SEOCalculationJob {
  articleIds: string[];
  jobId: string;
  batchSize?: number;
}

export interface SEOCalculationResult {
  success: boolean;
  processed: number;
  failed: number;
  duration: number;
  errors: string[];
}

// SEO Optimization Job
export interface SEOOptimizationJob {
  articleIds: string[];
  jobId: string;
  batchSize?: number;
}

export interface SEOOptimizationResult {
  success: boolean;
  optimized: number;
  failed: number;
  duration: number;
  errors: string[];
  improvements: SEOImprovement[];
}

export interface SEOImprovement {
  articleId: string;
  before: number;
  after: number;
  changes: string[];
}

// Progress Data
export interface ProgressData {
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  current: number;
  total: number;
  timestamp: string;
}

// API Request/Response Types
export interface BulkCalculateRequest {
  articleIds?: string[];
  all?: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  batchSize?: number;
}

export interface BulkOptimizeRequest {
  articleIds: string[];
  batchSize?: number;
}

export interface BulkJobResponse {
  success: boolean;
  jobId: string;
  bullJobId: string;
  status: string;
  message: string;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
}

export interface ProgressResponse {
  success: boolean;
  jobId: string;
  status: string;
  progress: number;
  current: number;
  total: number;
  timestamp: string;
  message: string;
  details?: {
    state: string;
    attemptsMade: number;
    processedOn: number | null;
    finishedOn: number | null;
    failedReason: string | null;
  };
}

export interface QueueStatsResponse {
  success: boolean;
  queue: {
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    total: number;
  };
}

// Article SEO Data
export interface ArticleSEOData {
  title: string;
  content: string;
  metaDescription: string;
  keywords: string[];
  slug: string;
  imageUrl: string;
}

export interface ArticleSEOScore {
  score: number;
  issues: string[];
}

export interface ArticleSEOOptimization {
  title?: string;
  metaDescription?: string;
  keywords?: string[];
  slug?: string;
}
