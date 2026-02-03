/**
 * SEO API Type Definitions
 * Backend API endpoint'leri için TypeScript tipleri
 */

// ============================================
// SEO Dashboard Types
// ============================================

export interface SEODashboardStats {
  overview: {
    totalArticles: number;
    averageScore: number;
    articlesWithIssues: number;
    criticalIssues: number;
  };
  scoreDistribution: {
    excellent: number; // 90-100
    good: number; // 70-89
    fair: number; // 50-69
    poor: number; // 0-49
  };
  topIssues: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
  recentTrend: Array<{
    date: string;
    averageScore: number;
    articlesAnalyzed: number;
  }>;
}

export type ScoreCategory = "excellent" | "good" | "fair" | "poor";

// ============================================
// SEO Recommendations Types
// ============================================

export type SEOSeverity = "critical" | "high" | "medium" | "low";

export type SEORecommendationType =
  | "title"
  | "description"
  | "content"
  | "keywords"
  | "images"
  | "slug"
  | "readability";

export interface SEORecommendation {
  id: string;
  articleId: string;
  type: SEORecommendationType;
  severity: SEOSeverity;
  message: string;
  suggestion: string | null;
  isResolved: boolean;
  createdAt: string;
}

export interface SEORecommendationsResponse {
  article: {
    id: string;
    title: string;
    seoScore: number;
  };
  recommendations: SEORecommendation[];
  grouped: {
    critical: SEORecommendation[];
    high: SEORecommendation[];
    medium: SEORecommendation[];
    low: SEORecommendation[];
  };
  stats: {
    total: number;
    unresolved: number;
    resolved: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

export interface ResolveRecommendationRequest {
  id: string;
  resolved: boolean;
}

export interface ResolveRecommendationResponse {
  success: boolean;
  message: string;
  recommendation: SEORecommendation;
  article: {
    id: string;
    title: string;
  };
}

export interface DeleteRecommendationRequest {
  id: string;
}

export interface DeleteRecommendationResponse {
  success: boolean;
  message: string;
  article: {
    id: string;
    title: string;
  };
}

// ============================================
// SEO Recalculation Types
// ============================================

export type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface RecalculateByIdsRequest {
  articleIds: string[];
}

export interface RecalculateAllRequest {
  all: true;
  status?: ArticleStatus;
}

export type RecalculateRequest =
  | RecalculateByIdsRequest
  | RecalculateAllRequest;

export interface RecalculationError {
  articleId: string;
  error: string;
}

export interface RecalculationStats {
  averageScoreBefore: number;
  averageScoreAfter: number;
  improvement: number;
}

export interface RecalculationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: RecalculationError[];
  duration: number;
  stats: RecalculationStats;
}

export interface RecalculateResponse {
  success: boolean;
  message: string;
  results: RecalculationResult;
}

export interface RecalculationStatusResponse {
  totalArticles: number;
  articlesWithRecommendations: number;
  byStatus: Array<{
    status: string;
    count: number;
    averageScore: number;
  }>;
}

// ============================================
// API Error Types
// ============================================

export interface APIError {
  error: string;
  details?: string | any;
  duration?: number;
}

// ============================================
// Materialized View Types
// ============================================

export interface ArticleSEOSummary {
  id: string;
  title: string;
  slug: string;
  seoScore: number;
  publishedAt: Date | null;
  status: ArticleStatus;
  categoryId: string;
  categoryName: string | null;
  unresolvedRecommendations: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  scoreCategory: ScoreCategory;
}

// ============================================
// Helper Types
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sortBy?: "seoScore" | "publishedAt" | "title" | "unresolvedRecommendations";
  sortOrder?: "asc" | "desc";
}

export interface FilterParams {
  status?: ArticleStatus;
  categoryId?: string;
  scoreCategory?: ScoreCategory;
  hasIssues?: boolean;
  minScore?: number;
  maxScore?: number;
}

// ============================================
// API Client Types
// ============================================

export interface SEOAPIClient {
  // Dashboard
  getDashboard(): Promise<SEODashboardStats>;

  // Recommendations
  getRecommendations(articleId: string): Promise<SEORecommendationsResponse>;
  resolveRecommendation(
    request: ResolveRecommendationRequest,
  ): Promise<ResolveRecommendationResponse>;
  deleteRecommendation(
    request: DeleteRecommendationRequest,
  ): Promise<DeleteRecommendationResponse>;

  // Recalculation
  recalculate(request: RecalculateRequest): Promise<RecalculateResponse>;
  getRecalculationStatus(): Promise<RecalculationStatusResponse>;
}

// ============================================
// Utility Types
// ============================================

export type APIResponse<T> = Promise<T | APIError>;

export function isAPIError(response: any): response is APIError {
  return response && typeof response.error === "string";
}

// ============================================
// Constants
// ============================================

export const SEO_SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
  POOR: 0,
} as const;

export const SEVERITY_ORDER: SEOSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
];

export const SEVERITY_COLORS = {
  critical: "#DC2626", // red-600
  high: "#EA580C", // orange-600
  medium: "#D97706", // amber-600
  low: "#65A30D", // lime-600
} as const;

export const SCORE_CATEGORY_COLORS = {
  excellent: "#16A34A", // green-600
  good: "#65A30D", // lime-600
  fair: "#D97706", // amber-600
  poor: "#DC2626", // red-600
} as const;

// ============================================
// Type Guards
// ============================================

export function isRecalculateByIdsRequest(
  request: RecalculateRequest,
): request is RecalculateByIdsRequest {
  return "articleIds" in request && Array.isArray(request.articleIds);
}

export function isRecalculateAllRequest(
  request: RecalculateRequest,
): request is RecalculateAllRequest {
  return "all" in request && request.all === true;
}

export function getScoreCategory(score: number): ScoreCategory {
  if (score >= SEO_SCORE_THRESHOLDS.EXCELLENT) return "excellent";
  if (score >= SEO_SCORE_THRESHOLDS.GOOD) return "good";
  if (score >= SEO_SCORE_THRESHOLDS.FAIR) return "fair";
  return "poor";
}

export function getSeverityColor(severity: SEOSeverity): string {
  return SEVERITY_COLORS[severity];
}

export function getScoreCategoryColor(category: ScoreCategory): string {
  return SCORE_CATEGORY_COLORS[category];
}
