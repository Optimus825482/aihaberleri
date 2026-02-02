-- ============================================================================
-- DATABASE PERFORMANCE OPTIMIZATION SCRIPT
-- Generated: 2026-02-02
-- Based on performance analysis results
-- ============================================================================

-- 1. ENABLE pg_stat_statements EXTENSION (for query monitoring)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 2. VACUUM ANALYZE (Clean up dead tuples and update statistics)
-- ============================================================================
-- Setting table has 46 dead tuples (⚠️ VACUUM NEEDED!)
VACUUM ANALYZE "Setting";

-- AgentLog table has 77 dead tuples (⚠️ VACUUM NEEDED!)
VACUUM ANALYZE "AgentLog";

-- PushSubscription table has 5 dead tuples (⚠️ VACUUM NEEDED!)
VACUUM ANALYZE "PushSubscription";

-- Run on all tables for good measure
VACUUM ANALYZE;

-- 3. ADD MISSING INDEXES (High sequential scan ratios)
-- ============================================================================

-- Category table: 119,801 sequential scans vs 0 index scans (⚠️ CRITICAL!)
-- Most queries likely filter by slug or name
CREATE INDEX IF NOT EXISTS "Category_name_idx" ON "Category"("name");
-- Note: Category_slug_key already exists but not being used (check queries)

-- Setting table: 77,766 sequential scans vs 0 index scans (⚠️ CRITICAL!)
-- Most queries use findUnique({ where: { key: "..." } })
-- Note: Setting_key_idx already exists but not being used
-- This suggests Prisma might not be using the index properly
-- Let's create a more specific index
DROP INDEX IF EXISTS "Setting_key_idx";
CREATE UNIQUE INDEX "Setting_key_idx" ON "Setting"("key");

-- SocialMedia table: 18,628 sequential scans vs 0 index scans (⚠️ HIGH!)
-- Most queries likely filter by platform
-- Note: SocialMedia_platform_idx already exists but not being used
DROP INDEX IF EXISTS "SocialMedia_platform_idx";
CREATE UNIQUE INDEX "SocialMedia_platform_idx" ON "Social Media"("platform");

-- 4. OPTIMIZE ARTICLE TABLE INDEXES
-- ============================================================================
-- Article table has good index usage but can be improved

-- Add composite index for common query pattern: status + publishedAt + categoryId
CREATE INDEX IF NOT EXISTS "Article_status_publishedAt_categoryId_idx" 
ON "Article"("status", "publishedAt" DESC, "categoryId")
WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL;

-- Add composite index for topic-based duplicate checks
CREATE INDEX IF NOT EXISTS "Article_topic_publishedAt_status_idx"
ON "Article"("topic", "publishedAt" DESC, "status")
WHERE "topic" IS NOT NULL;

-- Add index for sourceUrl (used in duplicate detection)
CREATE INDEX IF NOT EXISTS "Article_sourceUrl_idx"
ON "Article"("sourceUrl")
WHERE "sourceUrl" IS NOT NULL;

-- 5. OPTIMIZE ARTICLE ANALYTICS
-- ============================================================================
-- Add composite index for analytics queries (country + createdAt)
CREATE INDEX IF NOT EXISTS "ArticleAnalytics_country_createdAt_idx"
ON "ArticleAnalytics"("country", "createdAt" DESC)
WHERE "country" IS NOT NULL;

-- Add composite index for city-based analytics
CREATE INDEX IF NOT EXISTS "ArticleAnalytics_city_createdAt_idx"
ON "ArticleAnalytics"("city", "createdAt" DESC)
WHERE "city" IS NOT NULL;

-- 6. OPTIMIZE VISITOR TABLE
-- ============================================================================
-- Add composite index for visitor analytics
CREATE INDEX IF NOT EXISTS "Visitor_country_lastActivity_idx"
ON "Visitor"("country", "lastActivity" DESC)
WHERE "country" IS NOT NULL;

-- 7. DROP UNUSED INDEXES (Never used - idx_scan = 0)
-- ============================================================================
-- ⚠️ CAUTION: Only drop if you're SURE these are not needed
-- Newsletter indexes (table is empty, so 0 scans is expected)
-- DO NOT DROP - these are needed when newsletter feature is used

-- 8. UPDATE TABLE STATISTICS
-- ============================================================================
ANALYZE "Category";
ANALYZE "Setting";
ANALYZE "SocialMedia";
ANALYZE "Article";
ANALYZE "ArticleAnalytics";
ANALYZE "Visitor";
ANALYZE "AgentLog";

-- 9. REINDEX (Rebuild indexes for better performance)
-- ============================================================================
REINDEX TABLE "Category";
REINDEX TABLE "Setting";
REINDEX TABLE "SocialMedia";
REINDEX TABLE "Article";

-- 10. VERIFY IMPROVEMENTS
-- ============================================================================
-- Run this query to check index usage after optimization:
-- SELECT 
--   schemaname,
--   relname as tablename,
--   indexrelname as indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ============================================================================
-- OPTIMIZATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Monitor query performance with pg_stat_statements
-- 2. Run VACUUM ANALYZE weekly
-- 3. Check index usage monthly
-- 4. Archive old ArticleAnalytics data (> 6 months)
-- ============================================================================
