/**
 * Database Performance Analysis Script
 * Analyzes database performance and provides optimization recommendations
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:518518Erkan@77.42.68.4:5435/postgresainewsdb",
    },
  },
});

interface QueryStats {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  max_time: number;
}

interface IndexStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  idx_scan: number;
  idx_tup_read: number;
  idx_tup_fetch: number;
}

interface TableStats {
  schemaname: string;
  tablename: string;
  seq_scan: number;
  seq_tup_read: number;
  idx_scan: number;
  idx_tup_fetch: number;
  n_tup_ins: number;
  n_tup_upd: number;
  n_tup_del: number;
  n_live_tup: number;
  n_dead_tup: number;
}

async function analyzePerformance() {
  console.log("🔍 DATABASE PERFORMANCE ANALYSIS\n");
  console.log("=".repeat(80));

  try {
    // 1. Check if pg_stat_statements extension is enabled
    console.log("\n📊 1. CHECKING EXTENSIONS...\n");
    const extensions = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'pg_stat_statements';
    `;

    if (extensions.length === 0) {
      console.log("⚠️  pg_stat_statements extension NOT enabled");
      console.log("   Run: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;");
    } else {
      console.log("✅ pg_stat_statements extension enabled");

      // Get top slow queries
      console.log("\n📊 2. TOP 10 SLOWEST QUERIES...\n");
      const slowQueries = await prisma.$queryRaw<QueryStats[]>`
        SELECT 
          LEFT(query, 100) as query,
          calls,
          ROUND(total_exec_time::numeric, 2) as total_time,
          ROUND(mean_exec_time::numeric, 2) as mean_time,
          ROUND(max_exec_time::numeric, 2) as max_time
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY total_exec_time DESC
        LIMIT 10;
      `;

      slowQueries.forEach((q, i) => {
        console.log(`${i + 1}. Query: ${q.query}...`);
        console.log(
          `   Calls: ${q.calls}, Total: ${q.total_time}ms, Mean: ${q.mean_time}ms, Max: ${q.max_time}ms\n`,
        );
      });
    }

    // 2. Table statistics
    console.log("\n📊 3. TABLE STATISTICS...\n");
    const tableStats = await prisma.$queryRaw<TableStats[]>`
      SELECT 
        schemaname,
        relname as tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        n_live_tup,
        n_dead_tup
      FROM pg_stat_user_tables
      ORDER BY seq_scan DESC
      LIMIT 10;
    `;

    console.log(
      "Top 10 tables by sequential scans (potential missing indexes):\n",
    );
    tableStats.forEach((t, i) => {
      const seqScan = Number(t.seq_scan);
      const idxScan = Number(t.idx_scan) || 1;
      const seqScanRatio = seqScan / idxScan;
      const liveTup = Number(t.n_live_tup);
      const deadTup = Number(t.n_dead_tup);

      console.log(`${i + 1}. ${t.tablename}`);
      console.log(
        `   Sequential scans: ${seqScan} (${Number(t.seq_tup_read)} rows)`,
      );
      console.log(
        `   Index scans: ${idxScan} (${Number(t.idx_tup_fetch) || 0} rows)`,
      );
      console.log(
        `   Seq/Idx ratio: ${seqScanRatio.toFixed(2)}x ${seqScanRatio > 10 ? "⚠️  HIGH!" : ""}`,
      );
      console.log(
        `   Live tuples: ${liveTup}, Dead tuples: ${deadTup} ${deadTup > liveTup * 0.2 ? "⚠️  VACUUM NEEDED!" : ""}\n`,
      );
    });

    // 3. Index usage statistics
    console.log("\n📊 4. INDEX USAGE STATISTICS...\n");
    const indexStats = await prisma.$queryRaw<IndexStats[]>`
      SELECT 
        schemaname,
        relname as tablename,
        indexrelname as indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      ORDER BY idx_scan ASC
      LIMIT 10;
    `;

    console.log("Top 10 LEAST used indexes (candidates for removal):\n");
    indexStats.forEach((idx, i) => {
      console.log(`${i + 1}. ${idx.indexname} on ${idx.tablename}`);
      console.log(
        `   Scans: ${Number(idx.idx_scan)}, Rows read: ${Number(idx.idx_tup_read)}, Rows fetched: ${Number(idx.idx_tup_fetch)}`,
      );
      console.log(
        `   ${Number(idx.idx_scan) === 0 ? "⚠️  NEVER USED - Consider dropping!" : ""}\n`,
      );
    });

    // 4. Missing indexes analysis
    console.log("\n📊 5. MISSING INDEXES ANALYSIS...\n");
    const missingIndexes = await prisma.$queryRaw<
      Array<{
        tablename: string;
        seq_scan: number;
        seq_tup_read: number;
        idx_scan: number;
      }>
    >`
      SELECT 
        relname as tablename,
        seq_scan,
        seq_tup_read,
        idx_scan
      FROM pg_stat_user_tables
      WHERE seq_scan > 1000
        AND seq_tup_read > 10000
        AND (idx_scan = 0 OR seq_scan / NULLIF(idx_scan, 0) > 10)
      ORDER BY seq_scan DESC;
    `;

    if (missingIndexes.length > 0) {
      console.log("⚠️  Tables with potential missing indexes:\n");
      missingIndexes.forEach((t) => {
        console.log(`- ${t.tablename}`);
        console.log(
          `  Sequential scans: ${Number(t.seq_scan)} (${Number(t.seq_tup_read)} rows)`,
        );
        console.log(`  Index scans: ${Number(t.idx_scan) || 0}`);
        console.log(
          `  Recommendation: Add indexes on frequently queried columns\n`,
        );
      });
    } else {
      console.log("✅ No obvious missing indexes detected\n");
    }

    // 5. Database size
    console.log("\n📊 6. DATABASE SIZE...\n");
    const dbSize = await prisma.$queryRaw<Array<{ size: string }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `;
    console.log(`Total database size: ${dbSize[0].size}\n`);

    // 6. Table sizes
    console.log("\n📊 7. TOP 10 LARGEST TABLES...\n");
    const tableSizes = await prisma.$queryRaw<
      Array<{
        tablename: string;
        total_size: string;
        table_size: string;
        indexes_size: string;
      }>
    >`
      SELECT 
        c.relname as tablename,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
        pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) AS indexes_size
      FROM pg_class c
      LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC
      LIMIT 10;
    `;

    tableSizes.forEach((t, i) => {
      console.log(`${i + 1}. ${t.tablename}`);
      console.log(
        `   Total: ${t.total_size}, Table: ${t.table_size}, Indexes: ${t.indexes_size}\n`,
      );
    });

    // 7. Connection statistics
    console.log("\n📊 8. CONNECTION STATISTICS...\n");
    const connections = await prisma.$queryRaw<
      Array<{
        state: string;
        count: number;
      }>
    >`
      SELECT state, COUNT(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state;
    `;

    connections.forEach((c) => {
      console.log(`${c.state || "unknown"}: ${c.count} connections`);
    });

    // 8. Cache hit ratio
    console.log("\n\n📊 9. CACHE HIT RATIO...\n");
    const cacheHit = await prisma.$queryRaw<
      Array<{
        cache_hit_ratio: number;
      }>
    >`
      SELECT 
        ROUND(
          100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0),
          2
        ) as cache_hit_ratio
      FROM pg_stat_database
      WHERE datname = current_database();
    `;

    const ratio = cacheHit[0].cache_hit_ratio;
    console.log(`Cache hit ratio: ${ratio}%`);
    if (ratio < 90) {
      console.log("⚠️  LOW! Consider increasing shared_buffers");
    } else if (ratio < 95) {
      console.log("⚠️  MODERATE - Could be improved");
    } else {
      console.log("✅ GOOD");
    }

    // 9. Recommendations
    console.log("\n\n" + "=".repeat(80));
    console.log("📋 OPTIMIZATION RECOMMENDATIONS\n");
    console.log("=".repeat(80));

    console.log("\n1. IMMEDIATE ACTIONS:");
    console.log("   - Run VACUUM ANALYZE on tables with high dead tuple count");
    console.log("   - Review and optimize slow queries (mean_time > 100ms)");
    console.log(
      "   - Consider adding indexes on frequently seq_scanned tables",
    );

    console.log("\n2. INDEX OPTIMIZATION:");
    console.log("   - Drop unused indexes (idx_scan = 0)");
    console.log("   - Add composite indexes for common query patterns");
    console.log(
      "   - Review Article table indexes (topic, publishedAt, status)",
    );

    console.log("\n3. QUERY OPTIMIZATION:");
    console.log("   - Use EXPLAIN ANALYZE on slow queries");
    console.log("   - Add WHERE clauses to limit result sets");
    console.log("   - Use pagination for large result sets");

    console.log("\n4. MAINTENANCE:");
    console.log("   - Schedule regular VACUUM ANALYZE");
    console.log("   - Monitor connection pool usage");
    console.log("   - Archive old ArticleAnalytics data");

    console.log("\n5. CONFIGURATION:");
    console.log("   - Increase shared_buffers if cache hit ratio < 95%");
    console.log("   - Tune work_mem for complex queries");
    console.log("   - Enable pg_stat_statements if not already enabled");

    console.log("\n" + "=".repeat(80));
    console.log("✅ Analysis complete!\n");
  } catch (error) {
    console.error("❌ Error analyzing database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run analysis
analyzePerformance()
  .then(() => {
    console.log("✅ Performance analysis completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Performance analysis failed:", error);
    process.exit(1);
  });
