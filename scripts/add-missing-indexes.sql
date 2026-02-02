-- ============================================================================
-- ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- 1. ARTICLE TABLE - Composite indexes for common queries
-- ============================================================================

-- Homepage query: status + publishedAt + categoryId
CREATE INDEX IF NOT EXISTS "Article_status_publishedAt_categoryId_idx" 
ON "Article"("status", "publishedAt" DESC, "categoryId")
WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL;

-- Topic-based duplicate checks
CREATE INDEX IF NOT EXISTS "Article_topic_publishedAt_status_idx"
ON "Article"("topic", "publishedAt" DESC, "status")
WHERE "topic" IS NOT NULL;

-- Source URL for duplicate detection
CREATE INDEX IF NOT EXISTS "Article_sourceUrl_idx"
ON "Article"("sourceUrl")
WHERE "sourceUrl" IS NOT NULL;

-- Agent log filtering
CREATE INDEX IF NOT EXISTS "Article_agentLogId_publishedAt_idx"
ON "Article"("agentLogId", "publishedAt" DESC)
WHERE "agentLogId" IS NOT NULL;

-- 2. ARTICLE ANALYTICS - Geo-based queries
-- ============================================================================

-- Country-based analytics
CREATE INDEX IF NOT EXISTS "ArticleAnalytics_country_createdAt_idx"
ON "ArticleAnalytics"("country", "createdAt" DESC)
WHERE "country" IS NOT NULL;

-- City-based analytics
CREATE INDEX IF NOT EXISTS "ArticleAnalytics_city_createdAt_idx"
ON "ArticleAnalytics"("city", "createdAt" DESC)
WHERE "city" IS NOT NULL;

-- Article + date range queries
CREATE INDEX IF NOT EXISTS "ArticleAnalytics_articleId_createdAt_idx"
ON "ArticleAnalytics"("articleId", "createdAt" DESC);

-- 3. VISITOR TABLE - Real-time analytics
-- ============================================================================

-- Country + last activity
CREATE INDEX IF NOT EXISTS "Visitor_country_lastActivity_idx"
ON "Visitor"("country", "lastActivity" DESC)
WHERE "country" IS NOT NULL;

-- City + last activity
CREATE INDEX IF NOT EXISTS "Visitor_city_lastActivity_idx"
ON "Visitor"("city", "lastActivity" DESC)
WHERE "city" IS NOT NULL;

-- 4. AGENT LOG - Performance monitoring
-- ============================================================================

-- Status + execution time for dashboard
CREATE INDEX IF NOT EXISTS "AgentLog_status_executionTime_idx"
ON "AgentLog"("status", "executionTime" DESC);

-- 5. ARTICLE TRANSLATION - i18n queries
-- ============================================================================

-- Locale + slug for URL routing
CREATE INDEX IF NOT EXISTS "ArticleTranslation_locale_slug_idx"
ON "ArticleTranslation"("locale", "slug");

-- Article + locale for translation lookup
CREATE INDEX IF NOT EXISTS "ArticleTranslation_articleId_locale_idx"
ON "ArticleTranslation"("articleId", "locale");

-- 6. CATEGORY - Frequently queried
-- ============================================================================

-- Name index for search/filter
CREATE INDEX IF NOT EXISTS "Category_name_idx" 
ON "Category"("name");

-- Order for sorting
CREATE INDEX IF NOT EXISTS "Category_order_idx"
ON "Category"("order");

-- 7. UPDATE STATISTICS
-- ============================================================================
ANALYZE "Article";
ANALYZE "ArticleAnalytics";
ANALYZE "Visitor";
ANALYZE "AgentLog";
ANALYZE "ArticleTranslation";
ANALYZE "Category";

-- ============================================================================
-- DONE
-- ============================================================================
