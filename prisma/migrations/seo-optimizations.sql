-- SEO Optimizations Migration
-- Performance improvements for SEO dashboard and analytics

-- ============================================
-- 1. INDEXES FOR SEO QUERIES
-- ============================================

-- Index for SEO score filtering and sorting
CREATE INDEX IF NOT EXISTS "Article_seoScore_status_idx" 
ON "Article" ("seoScore" DESC, "status") 
WHERE "status" = 'PUBLISHED';

-- Index for SEO recommendations queries
CREATE INDEX IF NOT EXISTS "SEORecommendation_articleId_isResolved_severity_idx" 
ON "SEORecommendation" ("articleId", "isResolved", "severity");

-- Index for date-based SEO trend analysis
CREATE INDEX IF NOT EXISTS "Article_publishedAt_seoScore_idx" 
ON "Article" ("publishedAt" DESC, "seoScore") 
WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL;

-- Composite index for recommendation grouping
CREATE INDEX IF NOT EXISTS "SEORecommendation_type_severity_isResolved_idx" 
ON "SEORecommendation" ("type", "severity", "isResolved");

-- ============================================
-- 2. MATERIALIZED VIEW FOR SEO DASHBOARD
-- ============================================

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS article_seo_summary;

-- Create materialized view for fast dashboard queries
CREATE MATERIALIZED VIEW article_seo_summary AS
SELECT 
    a.id,
    a.title,
    a.slug,
    a."seoScore",
    a."publishedAt",
    a.status,
    a."categoryId",
    c.name as "categoryName",
    -- Recommendation counts
    COUNT(DISTINCT sr.id) FILTER (WHERE sr."isResolved" = false) as "unresolvedRecommendations",
    COUNT(DISTINCT sr.id) FILTER (WHERE sr.severity = 'critical' AND sr."isResolved" = false) as "criticalIssues",
    COUNT(DISTINCT sr.id) FILTER (WHERE sr.severity = 'high' AND sr."isResolved" = false) as "highIssues",
    COUNT(DISTINCT sr.id) FILTER (WHERE sr.severity = 'medium' AND sr."isResolved" = false) as "mediumIssues",
    COUNT(DISTINCT sr.id) FILTER (WHERE sr.severity = 'low' AND sr."isResolved" = false) as "lowIssues",
    -- Score category
    CASE 
        WHEN a."seoScore" >= 90 THEN 'excellent'
        WHEN a."seoScore" >= 70 THEN 'good'
        WHEN a."seoScore" >= 50 THEN 'fair'
        ELSE 'poor'
    END as "scoreCategory"
FROM "Article" a
LEFT JOIN "Category" c ON a."categoryId" = c.id
LEFT JOIN "SEORecommendation" sr ON a.id = sr."articleId"
WHERE a.status = 'PUBLISHED'
GROUP BY a.id, a.title, a.slug, a."seoScore", a."publishedAt", a.status, a."categoryId", c.name;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS article_seo_summary_seoScore_idx 
ON article_seo_summary ("seoScore" DESC);

CREATE INDEX IF NOT EXISTS article_seo_summary_scoreCategory_idx 
ON article_seo_summary ("scoreCategory");

CREATE INDEX IF NOT EXISTS article_seo_summary_publishedAt_idx 
ON article_seo_summary ("publishedAt" DESC);

CREATE INDEX IF NOT EXISTS article_seo_summary_unresolvedRecommendations_idx 
ON article_seo_summary ("unresolvedRecommendations" DESC) 
WHERE "unresolvedRecommendations" > 0;

-- ============================================
-- 3. FUNCTION TO REFRESH MATERIALIZED VIEW
-- ============================================

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_article_seo_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY article_seo_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. STATISTICS FOR QUERY PLANNER
-- ============================================

-- Update statistics for better query planning
ANALYZE "Article";
ANALYZE "SEORecommendation";
ANALYZE "Category";

-- ============================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON INDEX "Article_seoScore_status_idx" IS 
'Optimizes SEO score filtering and sorting for published articles';

COMMENT ON INDEX "SEORecommendation_articleId_isResolved_severity_idx" IS 
'Optimizes recommendation queries by article, resolution status, and severity';

COMMENT ON INDEX "Article_publishedAt_seoScore_idx" IS 
'Optimizes date-based SEO trend analysis queries';

COMMENT ON MATERIALIZED VIEW article_seo_summary IS 
'Pre-aggregated SEO statistics for fast dashboard queries. Refresh periodically using refresh_article_seo_summary()';

-- ============================================
-- 6. USAGE NOTES
-- ============================================

-- To refresh the materialized view manually:
-- SELECT refresh_article_seo_summary();

-- To set up automatic refresh (run as superuser):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('refresh-seo-summary', '*/5 * * * *', 'SELECT refresh_article_seo_summary()');

-- To check view freshness:
-- SELECT schemaname, matviewname, last_refresh 
-- FROM pg_matviews 
-- WHERE matviewname = 'article_seo_summary';
