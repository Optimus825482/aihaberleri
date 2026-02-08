import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recalculateTrendScore, bulkRecalculateTrends } from "@/lib/trend-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for bulk operations

/**
 * POST /api/admin/recalculate-trends
 * 
 * Recalculates trend scores for all published articles
 * 
 * Query params:
 * - scope: "all" | "recent" | "single"
 * - hours: number (for recent scope, default 168 = 1 week)
 * - articleId: string (for single scope)
 * 
 * Auth: Session OR X-API-Secret header OR secret query param
 * 
 * Response includes progress stats
 */
export async function POST(request: NextRequest) {
  // Auth check - allow session OR API secret
  const session = await auth();
  const apiSecret = request.headers.get("X-API-Secret") || request.nextUrl.searchParams.get("secret");
  const validSecret = process.env.CRON_SECRET || process.env.API_SECRET || "aihaberleri-trend-2026";
  
  if (!session && apiSecret !== validSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get("scope") || "recent";
    const hours = parseInt(searchParams.get("hours") || "168"); // Default 1 week
    const articleId = searchParams.get("articleId");

    let result: {
      success: boolean;
      processed: number;
      scope: string;
      details?: any;
    };

    if (scope === "single" && articleId) {
      // Recalculate for a single article
      const newScore = await recalculateTrendScore(articleId);
      result = {
        success: true,
        processed: 1,
        scope: "single",
        details: { articleId, newScore },
      };
    } else if (scope === "all") {
      // Recalculate for ALL published articles
      const articles = await db.article.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, title: true, views: true },
        orderBy: { publishedAt: "desc" },
      });

      console.log(`[TrendRecalc] Starting bulk recalc for ${articles.length} articles...`);

      const results: { id: string; title: string; oldScore: number | null; newScore: number }[] = [];
      
      for (const article of articles) {
        const oldArticle = await db.article.findUnique({
          where: { id: article.id },
          select: { trendScore: true },
        });
        
        const newScore = await recalculateTrendScore(article.id);
        results.push({
          id: article.id,
          title: article.title.substring(0, 50),
          oldScore: oldArticle?.trendScore ?? null,
          newScore,
        });
      }

      result = {
        success: true,
        processed: articles.length,
        scope: "all",
        details: {
          topScores: results
            .sort((a, b) => b.newScore - a.newScore)
            .slice(0, 10),
          summary: {
            totalArticles: articles.length,
            trending: results.filter((r) => r.newScore > 40).length,
            viral: results.filter((r) => r.newScore > 80).length,
          },
        },
      };
    } else {
      // Recalculate for articles published in last N hours
      await bulkRecalculateTrends(hours);
      
      const recentArticles = await db.article.findMany({
        where: {
          publishedAt: {
            gte: new Date(Date.now() - hours * 60 * 60 * 1000),
          },
          status: "PUBLISHED",
        },
        select: { id: true, title: true, trendScore: true, views: true },
        orderBy: { trendScore: "desc" },
        take: 10,
      });

      result = {
        success: true,
        processed: recentArticles.length,
        scope: `recent_${hours}h`,
        details: {
          topScores: recentArticles.map((a) => ({
            id: a.id,
            title: a.title.substring(0, 50),
            score: a.trendScore,
            views: a.views,
          })),
        },
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[TrendRecalc] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to recalculate trend scores",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/recalculate-trends
 * 
 * Returns current trend statistics without recalculating
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [totalArticles, trendingCount, topArticles, recentArticles] = await Promise.all([
      db.article.count({ where: { status: "PUBLISHED" } }),
      db.article.count({ where: { status: "PUBLISHED", isTrending: true } }),
      db.article.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { trendScore: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          views: true,
          trendScore: true,
          publishedAt: true,
        },
      }),
      db.article.findMany({
        where: { 
          status: "PUBLISHED",
          publishedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { views: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          views: true,
          trendScore: true,
          publishedAt: true,
        },
      }),
    ]);

    // Calculate score distribution
    const scoreDistribution = await db.article.groupBy({
      by: ["isTrending"],
      where: { status: "PUBLISHED" },
      _count: true,
    });

    return NextResponse.json({
      stats: {
        totalArticles,
        trendingCount,
        distribution: scoreDistribution,
      },
      topByScore: topArticles,
      topByRecentViews: recentArticles,
    });
  } catch (error) {
    console.error("[TrendStats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trend statistics" },
      { status: 500 }
    );
  }
}
