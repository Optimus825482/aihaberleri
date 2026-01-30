import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

/**
 * GET /api/admin/analytics/advanced
 * Advanced analytics with detailed charts and statistics
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    if (!hasPermission(session.user.role, Permission.VIEW_ANALYTICS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all data in parallel
    const [
      totalArticles,
      publishedArticles,
      draftArticles,
      totalViews,
      averageScore,
      totalVisitors,
      categoryStats,
      categoryViewsAgg,
      topArticles,
      viewsOverTime,
      trafficSources,
    ] = await Promise.all([
      // Total articles
      prisma.article.count(),

      // Published articles
      prisma.article.count({ where: { status: "PUBLISHED" } }),

      // Draft articles
      prisma.article.count({ where: { status: "DRAFT" } }),

      // Total views
      prisma.article.aggregate({
        _sum: { views: true },
      }),

      // Average score
      prisma.article.aggregate({
        _avg: { score: true },
      }),

      // Total visitors
      prisma.visitor.count(),

      // Category stats - OPTIMIZED: Use _count and separate view aggregation
      prisma.category.findMany({
        include: {
          _count: {
            select: { articles: true },
          },
        },
      }),

      // Category views aggregation - OPTIMIZED: Single groupBy query
      prisma.article.groupBy({
        by: ["categoryId"],
        _sum: {
          views: true,
        },
      }),

      // Top articles
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          views: true,
          score: true,
        },
        orderBy: { views: "desc" },
        take: 10,
      }),

      // Views over time (last 30 days)
      prisma.$queryRaw<Array<{ date: string; views: number }>>`
        SELECT 
          DATE(published_at) as date,
          SUM(views) as views
        FROM "Article"
        WHERE published_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(published_at)
        ORDER BY date ASC
      `,

      // Traffic sources (mock data - would come from analytics service)
      Promise.resolve([
        { source: "Direct", visitors: 1234 },
        { source: "Google", visitors: 5678 },
        { source: "Social Media", visitors: 2345 },
        { source: "Referral", visitors: 890 },
      ]),
    ]);

    // Process category stats - OPTIMIZED: Use aggregated data
    const processedCategoryStats = categoryStats.map((cat) => {
      const viewData = categoryViewsAgg.find(
        (v: any) => v.categoryId === cat.id,
      );
      return {
        name: cat.name,
        count: cat._count.articles,
        views: viewData?._sum?.views || 0,
      };
    });

    return NextResponse.json({
      summary: {
        totalArticles,
        publishedArticles,
        draftArticles,
        totalViews: totalViews._sum.views || 0,
        averageScore: averageScore._avg.score || 0,
        totalVisitors,
      },
      viewsOverTime: viewsOverTime.map((row) => ({
        date: new Date(row.date).toLocaleDateString("tr-TR", {
          month: "short",
          day: "numeric",
        }),
        views: Number(row.views),
      })),
      categoryStats: processedCategoryStats,
      topArticles,
      trafficSources,
    });
  } catch (error) {
    console.error("[ADVANCED_ANALYTICS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
