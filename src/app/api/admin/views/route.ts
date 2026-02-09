import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/views
 * Get view analytics data for admin panel
 */
export async function GET() {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);

    // 1. Total views (all time)
    const totalViews = await db.article.aggregate({
      _sum: { views: true },
    });

    // 2. Today's views
    const todayViews = await db.articleView.count({
      where: {
        viewedAt: { gte: today },
      },
    });

    // 3. Yesterday's views
    const yesterdayViews = await db.articleView.count({
      where: {
        viewedAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    // 4. Last 7 days views
    const last7DaysViews = await db.articleView.count({
      where: {
        viewedAt: { gte: last7Days },
      },
    });

    // 5. Last 30 days views
    const last30DaysViews = await db.articleView.count({
      where: {
        viewedAt: { gte: last30Days },
      },
    });

    // 6. Unique sessions today
    const uniqueSessionsToday = await db.articleView.groupBy({
      by: ["sessionId"],
      where: {
        viewedAt: { gte: today },
      },
    });

    // 7. Top 10 most viewed articles (all time) - with trend scores
    const topArticlesAllTime = await db.article.findMany({
      where: {
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        publishedAt: true,
        trendScore: true,
        isTrending: true,
        category: {
          select: { name: true },
        },
      },
      orderBy: { views: "desc" },
      take: 10,
    });

    // 8. Top 10 most viewed articles (today)
    const todayTopArticles = await db.articleView.groupBy({
      by: ["articleId"],
      where: {
        viewedAt: { gte: today },
      },
      _count: { articleId: true },
      orderBy: { _count: { articleId: "desc" } },
      take: 10,
    });

    // Get article details for today's top - with trend scores
    const todayTopIds = todayTopArticles.map((a) => a.articleId);
    const todayTopDetails = await db.article.findMany({
      where: { id: { in: todayTopIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        publishedAt: true,
        trendScore: true,
        isTrending: true,
        category: {
          select: { name: true },
        },
      },
    });

    // Merge today's views with article details
    const topArticlesToday = todayTopArticles.map((view) => {
      const article = todayTopDetails.find((a) => a.id === view.articleId);
      return {
        ...article,
        todayViews: view._count.articleId,
      };
    });

    // 9. Hourly views for last 24 hours
    const hourlyViews = await db.$queryRaw<
      Array<{ hour: number; count: bigint }>
    >`
      SELECT 
        EXTRACT(HOUR FROM "viewedAt") as hour,
        COUNT(*) as count
      FROM "ArticleView"
      WHERE "viewedAt" >= ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}
      GROUP BY EXTRACT(HOUR FROM "viewedAt")
      ORDER BY hour
    `;

    // Convert to simple format
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const found = hourlyViews.find((h) => Number(h.hour) === i);
      return {
        hour: i,
        views: found ? Number(found.count) : 0,
      };
    });

    // 10. Daily views for last 7 days
    const dailyViews = await db.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT 
        DATE("viewedAt") as date,
        COUNT(*) as count
      FROM "ArticleView"
      WHERE "viewedAt" >= ${last7Days}
      GROUP BY DATE("viewedAt")
      ORDER BY date
    `;

    const dailyData = dailyViews.map((d) => ({
      date: d.date,
      views: Number(d.count),
    }));

    // 11. Views by category (last 7 days)
    const viewsByCategory = await db.$queryRaw<
      Array<{ categoryName: string; count: bigint }>
    >`
      SELECT 
        c.name as "categoryName",
        COUNT(av.id) as count
      FROM "ArticleView" av
      JOIN "Article" a ON av."articleId" = a.id
      JOIN "Category" c ON a."categoryId" = c.id
      WHERE av."viewedAt" >= ${last7Days}
      GROUP BY c.name
      ORDER BY count DESC
    `;

    const categoryData = viewsByCategory.map((c) => ({
      category: c.categoryName,
      views: Number(c.count),
    }));

    // 12. Recent views (last 20) with location from Visitor table
    const recentViews = await db.articleView.findMany({
      orderBy: { viewedAt: "desc" },
      take: 20,
      select: {
        id: true,
        articleId: true,
        sessionId: true,
        viewedAt: true,
      },
    });

    // Get article titles for recent views
    const recentArticleIds = [...new Set(recentViews.map((v) => v.articleId))];
    const recentArticles = await db.article.findMany({
      where: { id: { in: recentArticleIds } },
      select: { id: true, title: true, slug: true },
    });

    // Get visitor locations (last 20 active visitors)
    const recentVisitors = await db.visitor.findMany({
      orderBy: { lastActivity: "desc" },
      take: 50,
      select: {
        ipAddress: true,
        country: true,
        countryCode: true,
        city: true,
        region: true,
        currentPage: true,
        lastActivity: true,
      },
    });

    // Create IP to location map
    const ipLocationMap = new Map(
      recentVisitors.map((v) => [
        v.ipAddress,
        {
          country: v.country,
          countryCode: v.countryCode,
          city: v.city,
          region: v.region,
        },
      ])
    );

    const recentViewsWithArticles = recentViews.map((view) => {
      const article = recentArticles.find((a) => a.id === view.articleId);
      // Try to extract IP from sessionId (format: ip_useragent_hash)
      const ipPart = view.sessionId.split("_")[0];
      const location = ipLocationMap.get(ipPart) || null;
      
      return {
        ...view,
        articleTitle: article?.title || "Unknown",
        articleSlug: article?.slug || "",
        location: location,
      };
    });

    // 13. Real-time active users (last 5 minutes)
    const activeUsers = await db.visitor.count({
      where: {
        lastActivity: { gte: last5Minutes },
      },
    });

    // 14. Active users timeline (last 60 minutes, 5-min intervals)
    const last60Minutes = new Date(now.getTime() - 60 * 60 * 1000);
    const activeUsersTimeline = await db.$queryRaw<
      Array<{ interval: Date; count: bigint }>
    >\`
      SELECT 
        date_trunc('minute', "lastActivity") - 
        (EXTRACT(MINUTE FROM "lastActivity")::integer % 5) * interval '1 minute' as interval,
        COUNT(DISTINCT id) as count
      FROM "Visitor"
      WHERE "lastActivity" >= \${last60Minutes}
      GROUP BY interval
      ORDER BY interval ASC
    \`;

    const realtimeData = activeUsersTimeline.map((item) => ({
      time: item.interval,
      users: Number(item.count),
    }));

    // Calculate change percentages
    const viewChangePercent =
      yesterdayViews > 0
        ? (((todayViews - yesterdayViews) / yesterdayViews) * 100).toFixed(1)
        : todayViews > 0
          ? "+100"
          : "0";

    return NextResponse.json({
      summary: {
        totalViews: totalViews._sum.views || 0,
        todayViews,
        yesterdayViews,
        last7DaysViews,
        last30DaysViews,
        uniqueSessionsToday: uniqueSessionsToday.length,
        viewChangePercent,
        activeUsers, // Real-time active users
      },
      topArticlesAllTime,
      topArticlesToday,
      hourlyData,
      dailyData,
      categoryData,
      recentViews: recentViewsWithArticles,
      realtimeData, // Active users timeline
    });
  } catch (error) {
    console.error("View analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch view analytics" },
      { status: 500 },
    );
  }
}
