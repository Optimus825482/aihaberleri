-- ============================================================================
-- VISITOR INDEX VERIFICATION SCRIPT
-- Generated: 2026-02-02
-- Purpose: Verify visitor indexes are created and being used
-- ============================================================================

-- Run this script 24 hours after applying add-visitor-realtime-indexes.sql
-- to verify indexes are working correctly

-- ============================================================================
-- 1. CHECK INDEX EXISTENCE
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'Visitor'
ORDER BY indexname;

-- Expected indexes:
-- ✅ Visitor_pkey (Primary Key)
-- ✅ Visitor_ipAddress_key (Unique - for upserts)
-- ✅ Visitor_lastActivity_idx (Time-based queries)
-- ✅ Visitor_createdAt_idx (Historical analysis)
-- ✅ Visitor_country_idx (Geographic analytics)
-- ✅ Visitor_city_idx (City analytics)
-- ✅ Visitor_country_lastActivity_idx (NEW - Real-time geo)
-- ✅ Visitor_city_lastActivity_idx (NEW - Real-time city)
-- ✅ Visitor_isp_lastActivity_idx (NEW - ISP analytics)
-- ✅ idx_visitor_country (From migration)
-- ✅ idx_visitor_city (From migration)
-- ✅ idx_visitor_coordinates (From migration)
-- ✅ idx_visitor_provider (From migration)

-- ============================================================================
-- 2. CHECK INDEX USAGE STATISTICS
-- ============================================================================

SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  CASE
    WHEN idx_scan = 0 THEN '🚨 UNUSED'
    WHEN idx_scan < 100 THEN '⚠️ LOW USAGE'
    WHEN idx_scan < 1000 THEN '✅ MODERATE'
    ELSE '✅ HIGH USAGE'
  END as status
FROM pg_stat_user_indexes
WHERE relname = 'Visitor'
ORDER BY idx_scan DESC;

-- Expected results (after 24 hours):
-- | indexname                         | scans  | status       | index_size |
-- |-----------------------------------|--------|--------------|------------|
-- | Visitor_lastActivity_idx          | 10000+ | ✅ HIGH      | ~100 KB    |
-- | Visitor_ipAddress_key             | 5000+  | ✅ HIGH      | ~80 KB     |
-- | Visitor_country_lastActivity_idx  | 1000+  | ✅ MODERATE  | ~50 KB     |
-- | Visitor_city_lastActivity_idx     | 1000+  | ✅ MODERATE  | ~60 KB     |
-- | Visitor_country_idx               | 500+   | ✅ MODERATE  | ~40 KB     |
-- | Visitor_city_idx                  | 500+   | ✅ MODERATE  | ~50 KB     |

-- ============================================================================
-- 3. CHECK FOR UNUSED INDEXES
-- ============================================================================

SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE relname = 'Visitor'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Expected: Empty result (all indexes should be used)
-- If any indexes show 0 scans after 24 hours, consider dropping them

-- ============================================================================
-- 4. QUERY PERFORMANCE TEST: Active Visitors
-- ============================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM "Visitor"
WHERE "lastActivity" >= NOW() - INTERVAL '5 minutes'
ORDER BY "lastActivity" DESC;

-- Expected plan:
-- Index Scan using Visitor_lastActivity_idx on "Visitor"
-- Execution Time: <10ms

-- ============================================================================
-- 5. QUERY PERFORMANCE TEST: Country Analytics
-- ============================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
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
-- GroupAggregate
--   -> Index Scan using Visitor_country_lastActivity_idx on "Visitor"
-- Execution Time: <15ms

-- ============================================================================
-- 6. QUERY PERFORMANCE TEST: City Analytics
-- ============================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
  city,
  country,
  COUNT(*) as count
FROM "Visitor"
WHERE "lastActivity" >= NOW() - INTERVAL '5 minutes'
  AND city IS NOT NULL
GROUP BY city, country
ORDER BY count DESC;

-- Expected plan:
-- GroupAggregate
--   -> Index Scan using Visitor_city_lastActivity_idx on "Visitor"
-- Execution Time: <15ms

-- ============================================================================
-- 7. TABLE STATISTICS
-- ============================================================================

SELECT
  schemaname,
  relname as tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'Visitor';

-- Expected:
-- - live_rows: 100-1000 (depends on traffic)
-- - dead_rows: <50 (should be low with regular cleanup)
-- - dead_ratio: <5% (healthy)
-- - last_autovacuum: Recent (within 24 hours)
-- - last_autoanalyze: Recent (within 24 hours)

-- ============================================================================
-- 8. TABLE AND INDEX SIZES
-- ============================================================================

SELECT
  'Table' as type,
  'Visitor' as name,
  pg_size_pretty(pg_total_relation_size('public."Visitor"')) as total_size,
  pg_size_pretty(pg_relation_size('public."Visitor"')) as table_size,
  pg_size_pretty(pg_total_relation_size('public."Visitor"') - pg_relation_size('public."Visitor"')) as index_size
UNION ALL
SELECT
  'Index' as type,
  indexrelname as name,
  pg_size_pretty(pg_relation_size(indexrelid)) as total_size,
  '-' as table_size,
  '-' as index_size
FROM pg_stat_user_indexes
WHERE relname = 'Visitor'
ORDER BY type, name;

-- Expected (for 1,000 visitors):
-- | type  | name                              | total_size | table_size | index_size |
-- |-------|-----------------------------------|------------|------------|------------|
-- | Table | Visitor                           | ~500 KB    | ~200 KB    | ~300 KB    |
-- | Index | Visitor_city_idx                  | ~50 KB     | -          | -          |
-- | Index | Visitor_city_lastActivity_idx     | ~60 KB     | -          | -          |
-- | Index | Visitor_country_idx               | ~40 KB     | -          | -          |
-- | Index | Visitor_country_lastActivity_idx  | ~50 KB     | -          | -          |
-- | Index | Visitor_ipAddress_key             | ~80 KB     | -          | -          |
-- | Index | Visitor_lastActivity_idx          | ~100 KB    | -          | -          |

-- ============================================================================
-- 9. SEQUENTIAL SCAN CHECK
-- ============================================================================

SELECT
  schemaname,
  relname as tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  CASE
    WHEN idx_scan = 0 THEN '🚨 NO INDEX USAGE'
    WHEN seq_scan > idx_scan THEN '⚠️ MORE SEQ THAN INDEX'
    ELSE '✅ GOOD INDEX USAGE'
  END as status
FROM pg_stat_user_tables
WHERE relname = 'Visitor';

-- Expected:
-- - seq_scan: Low (<100)
-- - idx_scan: High (>1000)
-- - status: ✅ GOOD INDEX USAGE

-- ============================================================================
-- 10. CACHE HIT RATIO
-- ============================================================================

SELECT
  'Visitor Table' as name,
  ROUND(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2) as cache_hit_ratio
FROM pg_statio_user_tables
WHERE relname = 'Visitor'
UNION ALL
SELECT
  indexrelname as name,
  ROUND(100.0 * idx_blks_hit / NULLIF(idx_blks_hit + idx_blks_read, 0), 2) as cache_hit_ratio
FROM pg_statio_user_indexes
WHERE relname = 'Visitor'
ORDER BY name;

-- Expected:
-- - cache_hit_ratio: >95% (excellent)
-- - Lower ratio indicates need for more shared_buffers

-- ============================================================================
-- 11. SLOW QUERY CHECK (requires pg_stat_statements extension)
-- ============================================================================
-- NOTE: This query requires pg_stat_statements extension to be installed.
-- To enable: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- If not installed, skip this section.

-- Uncomment to run (only if pg_stat_statements is installed):
/*
SELECT
  LEFT(query, 100) as query,
  calls,
  ROUND(total_exec_time::numeric, 2) as total_time_ms,
  ROUND(mean_exec_time::numeric, 2) as mean_time_ms,
  ROUND(max_exec_time::numeric, 2) as max_time_ms
FROM pg_stat_statements
WHERE query LIKE '%Visitor%'
  AND query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 10;
*/

-- Expected (if extension is installed):
-- - mean_time_ms: <20ms for all queries
-- - max_time_ms: <100ms for all queries

-- To install pg_stat_statements:
-- 1. Add to postgresql.conf: shared_preload_libraries = 'pg_stat_statements'
-- 2. Restart PostgreSQL
-- 3. Run: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- - max_time_ms: <100ms for all queries

-- ============================================================================
-- 12. VISITOR ACTIVITY METRICS
-- ============================================================================

-- Active visitors (last 5 minutes)
SELECT 
  'Active Visitors (5 min)' as metric,
  COUNT(*) as value
FROM "Visitor"
WHERE "lastActivity" >= NOW() - INTERVAL '5 minutes'

UNION ALL

-- Total visitors (all time)
SELECT 
  'Total Visitors' as metric,
  COUNT(*) as value
FROM "Visitor"

UNION ALL

-- Unique countries (last 5 minutes)
SELECT 
  'Unique Countries (5 min)' as metric,
  COUNT(DISTINCT country) as value
FROM "Visitor"
WHERE "lastActivity" >= NOW() - INTERVAL '5 minutes'
  AND country IS NOT NULL

UNION ALL

-- Unique cities (last 5 minutes)
SELECT 
  'Unique Cities (5 min)' as metric,
  COUNT(DISTINCT city) as value
FROM "Visitor"
WHERE "lastActivity" >= NOW() - INTERVAL '5 minutes'
  AND city IS NOT NULL;

-- ============================================================================
-- 13. TOP COUNTRIES (Last 5 Minutes)
-- ============================================================================

SELECT 
  country,
  "countryCode",
  COUNT(*) as visitor_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "Visitor"
WHERE "lastActivity" >= NOW() - INTERVAL '5 minutes'
  AND country IS NOT NULL
GROUP BY country, "countryCode"
ORDER BY visitor_count DESC
LIMIT 10;

-- ============================================================================
-- 14. TOP CITIES (Last 5 Minutes)
-- ============================================================================

SELECT 
  city,
  country,
  COUNT(*) as visitor_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "Visitor"
WHERE "lastActivity" >= NOW() - INTERVAL '5 minutes'
  AND city IS NOT NULL
GROUP BY city, country
ORDER BY visitor_count DESC
LIMIT 10;

-- ============================================================================
-- 15. VISITOR ACTIVITY TIMELINE (Last Hour)
-- ============================================================================

SELECT
  DATE_TRUNC('minute', "lastActivity") as minute,
  COUNT(*) as visitors
FROM "Visitor"
WHERE "lastActivity" >= NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', "lastActivity")
ORDER BY minute DESC
LIMIT 60;

-- ============================================================================
-- VERIFICATION CHECKLIST
-- ============================================================================

-- ✅ All indexes exist (13 total)
-- ✅ All indexes are being used (idx_scan > 0)
-- ✅ No sequential scans (seq_scan < idx_scan)
-- ✅ Query execution time <20ms
-- ✅ Cache hit ratio >95%
-- ✅ Dead tuple ratio <5%
-- ✅ Table size <5 MB (with cleanup)
-- ✅ Index size reasonable (~300 KB total)

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If indexes are not being used:
-- 1. Run ANALYZE "Visitor"; to update statistics
-- 2. Check query patterns match index columns
-- 3. Verify WHERE clauses match partial index conditions
-- 4. Check if table is too small (PostgreSQL may prefer seq scan for <1000 rows)

-- If queries are slow:
-- 1. Check EXPLAIN ANALYZE output for sequential scans
-- 2. Verify indexes are being used
-- 3. Check cache hit ratio (should be >95%)
-- 4. Run VACUUM ANALYZE to clean up dead tuples

-- If table is bloated:
-- 1. Check dead tuple ratio (should be <5%)
-- 2. Run VACUUM ANALYZE "Visitor";
-- 3. Ensure cleanup cron job is running (delete visitors >24h old)
-- 4. Consider VACUUM FULL if bloat is severe (requires table lock)

-- ============================================================================
-- SCRIPT COMPLETE
-- ============================================================================
