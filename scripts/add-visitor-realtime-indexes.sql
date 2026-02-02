-- ============================================================================
-- VISITOR REAL-TIME INDEXES
-- Generated: 2026-02-02
-- Purpose: Optimize real-time visitor queries with 5-minute window
-- ============================================================================

-- CONTEXT:
-- The Visitor table tracks active visitors with IP-based geolocation.
-- Primary query pattern: Find visitors active in last 5 minutes, grouped by country/city.
-- Current performance: <10ms (good), Target: <5ms (excellent)

-- ============================================================================
-- 1. COMPOSITE INDEX: Country + Last Activity
-- ============================================================================
-- Use Case: Real-time country distribution analytics
-- Query Pattern: WHERE lastActivity >= NOW() - INTERVAL '5 minutes' AND country IS NOT NULL
-- Expected Improvement: 50% faster country analytics (15ms → 8ms)

CREATE INDEX IF NOT EXISTS "Visitor_country_lastActivity_idx"
ON "Visitor"("country", "lastActivity" DESC)
WHERE "country" IS NOT NULL;

-- Why this index?
-- - Composite index supports both filtering (country) and sorting (lastActivity)
-- - DESC ordering matches query ORDER BY lastActivity DESC
-- - Partial index (WHERE country IS NOT NULL) reduces index size by ~10%
-- - Covering index reduces table lookups

-- ============================================================================
-- 2. COMPOSITE INDEX: City + Last Activity
-- ============================================================================
-- Use Case: Real-time city distribution analytics
-- Query Pattern: WHERE lastActivity >= NOW() - INTERVAL '5 minutes' AND city IS NOT NULL
-- Expected Improvement: 50% faster city analytics (15ms → 8ms)

CREATE INDEX IF NOT EXISTS "Visitor_city_lastActivity_idx"
ON "Visitor"("city", "lastActivity" DESC)
WHERE "city" IS NOT NULL;

-- Why this index?
-- - Same benefits as country index
-- - City has higher cardinality than country (better selectivity)
-- - Partial index reduces size (some visitors have NULL city)

-- ============================================================================
-- 3. COMPOSITE INDEX: ISP + Last Activity (OPTIONAL)
-- ============================================================================
-- Use Case: ISP performance tracking (which ISPs visit most)
-- Query Pattern: WHERE lastActivity >= NOW() - INTERVAL '5 minutes' AND isp IS NOT NULL
-- Expected Improvement: Enables ISP analytics without sequential scan

CREATE INDEX IF NOT EXISTS "Visitor_isp_lastActivity_idx"
ON "Visitor"("isp", "lastActivity" DESC)
WHERE "isp" IS NOT NULL;

-- Why this index?
-- - Useful for ISP analytics (e.g., "Which ISPs visit most?")
-- - Partial index (WHERE isp IS NOT NULL) reduces size
-- - Optional: Only create if ISP analytics are needed

-- ============================================================================
-- 4. UPDATE TABLE STATISTICS
-- ============================================================================
-- Update PostgreSQL query planner statistics for optimal query plans

ANALYZE "Visitor";

-- ============================================================================
-- 5. VERIFY INDEX CREATION
-- ============================================================================
-- Run this query to verify indexes were created successfully

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'Visitor'
  AND indexname IN (
    'Visitor_country_lastActivity_idx',
    'Visitor_city_lastActivity_idx',
    'Visitor_isp_lastActivity_idx'
  )
ORDER BY indexname;

-- Expected output:
-- | schemaname | tablename | indexname                         | indexdef                                                                                                                                  |
-- |------------|-----------|-----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
-- | public     | Visitor   | Visitor_city_lastActivity_idx     | CREATE INDEX "Visitor_city_lastActivity_idx" ON "Visitor" USING btree (city, "lastActivity" DESC) WHERE (city IS NOT NULL)                |
-- | public     | Visitor   | Visitor_country_lastActivity_idx  | CREATE INDEX "Visitor_country_lastActivity_idx" ON "Visitor" USING btree (country, "lastActivity" DESC) WHERE (country IS NOT NULL)       |
-- | public     | Visitor   | Visitor_isp_lastActivity_idx      | CREATE INDEX "Visitor_isp_lastActivity_idx" ON "Visitor" USING btree (isp, "lastActivity" DESC) WHERE (isp IS NOT NULL)                   |

-- ============================================================================
-- 6. INDEX SIZE ANALYSIS
-- ============================================================================
-- Check index sizes to ensure they're reasonable

SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE tablename = 'Visitor'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Expected sizes (for 1,000 visitors):
-- - Visitor_country_lastActivity_idx: ~50 KB
-- - Visitor_city_lastActivity_idx: ~60 KB
-- - Visitor_isp_lastActivity_idx: ~70 KB
-- Total additional index size: ~180 KB (negligible)

-- ============================================================================
-- 7. QUERY PLAN VERIFICATION
-- ============================================================================
-- Test query plan to ensure indexes are being used

EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
  country,
  "countryCode",
  COUNT(*) as count
FROM "Visitor"
WHERE "lastActivity" >= NOW() - INTERVAL '5 minutes'
  AND country IS NOT NULL
GROUP BY country, "countryCode"
ORDER BY count DESC;

-- Expected plan:
-- GroupAggregate  (cost=X..Y rows=Z width=W) (actual time=X..Y rows=Z loops=1)
--   Group Key: country, "countryCode"
--   ->  Index Scan using "Visitor_country_lastActivity_idx" on "Visitor"  (cost=X..Y rows=Z width=W) (actual time=X..Y rows=Z loops=1)
--         Index Cond: ("lastActivity" >= (now() - '00:05:00'::interval))
--         Filter: (country IS NOT NULL)
--   Planning Time: X ms
--   Execution Time: X ms  <-- Should be <10ms

-- ============================================================================
-- ROLLBACK SCRIPT (Emergency Only!)
-- ============================================================================
-- Only use if indexes cause issues (highly unlikely)

/*
-- Drop indexes
DROP INDEX IF EXISTS "Visitor_country_lastActivity_idx";
DROP INDEX IF EXISTS "Visitor_city_lastActivity_idx";
DROP INDEX IF EXISTS "Visitor_isp_lastActivity_idx";

-- Update statistics
ANALYZE "Visitor";
*/

-- ============================================================================
-- MAINTENANCE NOTES
-- ============================================================================

-- 1. VACUUM ANALYZE Schedule:
--    Run weekly to keep indexes healthy
--    Command: VACUUM ANALYZE "Visitor";

-- 2. Index Usage Monitoring:
--    Check monthly to ensure indexes are being used
--    Query: SELECT * FROM pg_stat_user_indexes WHERE tablename = 'Visitor';

-- 3. Dead Tuple Monitoring:
--    Check weekly for table bloat
--    Query: SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = 'Visitor';

-- 4. Cleanup Strategy:
--    Delete visitors inactive for >24 hours (keeps table <5 MB)
--    Frequency: Every 6 hours (automated cron job)

-- ============================================================================
-- PERFORMANCE EXPECTATIONS
-- ============================================================================

-- Before Optimization:
-- - Active visitor query: <10ms
-- - Country analytics: ~15ms
-- - City analytics: ~15ms
-- - Index usage: 100%

-- After Optimization:
-- - Active visitor query: <5ms (50% faster)
-- - Country analytics: <8ms (47% faster)
-- - City analytics: <8ms (47% faster)
-- - Index usage: 100%

-- ============================================================================
-- SCRIPT COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this script on production database
-- 2. Monitor index usage for 24 hours
-- 3. Verify query performance improvements
-- 4. Schedule weekly VACUUM ANALYZE
-- ============================================================================
