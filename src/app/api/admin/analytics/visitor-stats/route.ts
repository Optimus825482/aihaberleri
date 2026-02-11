/**
 * Visitor Analytics Stats API
 * Provides comprehensive metrics for admin dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 90d, today

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Parallel queries for performance
    const [
      totalPageViews,
      uniqueVisitors,
      pageViewsByDay,
      topPages,
      topCountries,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      topReferrers,
      avgDuration,
      avgScrollDepth,
      bounceCount,
      topArticles,
      recentVisitors,
    ] = await Promise.all([
      // Total page views
      db.pageView.count({
        where: { createdAt: { gte: startDate } },
      }),

      // Unique visitors
      db.pageView
        .groupBy({
          by: ["visitorId"],
          where: { createdAt: { gte: startDate } },
        })
        .then((r) => r.length),

      // Page views by day
      db.$queryRawUnsafe<Array<{ date: string; count: bigint }>>(
        `SELECT DATE("createdAt") as date, COUNT(*) as count 
         FROM "PageView" 
         WHERE "createdAt" >= $1 
         GROUP BY DATE("createdAt") 
         ORDER BY date ASC`,
        startDate,
      ),

      // Top pages
      db.$queryRawUnsafe<
        Array<{ path: string; count: bigint; avg_duration: number }>
      >(
        `SELECT path, COUNT(*) as count, ROUND(AVG(duration)) as avg_duration 
         FROM "PageView" 
         WHERE "createdAt" >= $1 
         GROUP BY path 
         ORDER BY count DESC 
         LIMIT 20`,
        startDate,
      ),

      // Top countries
      db.$queryRawUnsafe<Array<{ country: string; count: bigint }>>(
        `SELECT COALESCE(country, 'Bilinmiyor') as country, COUNT(*) as count 
         FROM "PageView" 
         WHERE "createdAt" >= $1 
         GROUP BY country 
         ORDER BY count DESC 
         LIMIT 15`,
        startDate,
      ),

      // Device breakdown
      db.$queryRawUnsafe<Array<{ device: string; count: bigint }>>(
        `SELECT COALESCE(device, 'Unknown') as device, COUNT(*) as count 
         FROM "PageView" 
         WHERE "createdAt" >= $1 
         GROUP BY device 
         ORDER BY count DESC`,
        startDate,
      ),

      // Browser breakdown
      db.$queryRawUnsafe<Array<{ browser: string; count: bigint }>>(
        `SELECT COALESCE(browser, 'Unknown') as browser, COUNT(*) as count 
         FROM "PageView" 
         WHERE "createdAt" >= $1 
         GROUP BY browser 
         ORDER BY count DESC`,
        startDate,
      ),

      // OS breakdown
      db.$queryRawUnsafe<Array<{ os: string; count: bigint }>>(
        `SELECT COALESCE(os, 'Unknown') as os, COUNT(*) as count 
         FROM "PageView" 
         WHERE "createdAt" >= $1 
         GROUP BY os 
         ORDER BY count DESC`,
        startDate,
      ),

      // Top referrers
      db.$queryRawUnsafe<Array<{ referrer: string; count: bigint }>>(
        `SELECT COALESCE(referrer, 'Doğrudan') as referrer, COUNT(*) as count 
         FROM "PageView" 
         WHERE "createdAt" >= $1 
         GROUP BY referrer 
         ORDER BY count DESC 
         LIMIT 10`,
        startDate,
      ),

      // Average duration
      db.$queryRawUnsafe<Array<{ avg: number }>>(
        `SELECT ROUND(AVG(duration)) as avg 
         FROM "PageView" 
         WHERE "createdAt" >= $1 AND duration > 0`,
        startDate,
      ),

      // Average scroll depth
      db.$queryRawUnsafe<Array<{ avg: number }>>(
        `SELECT ROUND(AVG("scrollDepth")) as avg 
         FROM "PageView" 
         WHERE "createdAt" >= $1 AND "scrollDepth" > 0`,
        startDate,
      ),

      // Bounce count
      db.pageView.count({
        where: { createdAt: { gte: startDate }, bounced: true },
      }),

      // Top articles with reading metrics
      db.$queryRawUnsafe<
        Array<{
          articleId: string;
          title: string;
          slug: string;
          views: bigint;
          avg_duration: number;
          avg_scroll: number;
        }>
      >(
        `SELECT aa."articleId", a.title, a.slug,
                COUNT(*) as views,
                ROUND(AVG(aa.duration)) as avg_duration,
                ROUND(AVG(aa."scrollDepth")) as avg_scroll
         FROM "ArticleAnalytics" aa
         JOIN "Article" a ON a.id = aa."articleId"
         WHERE aa."createdAt" >= $1
         GROUP BY aa."articleId", a.title, a.slug
         ORDER BY views DESC
         LIMIT 15`,
        startDate,
      ),

      // Recent visitors
      db.visitor.findMany({
        where: {
          lastActivity: { gte: new Date(now.getTime() - 30 * 60 * 1000) },
        },
        orderBy: { lastActivity: "desc" },
        take: 20,
        select: {
          id: true,
          ipAddress: true,
          currentPage: true,
          country: true,
          countryCode: true,
          city: true,
          device: true,
          browser: true,
          os: true,
          lastActivity: true,
          totalVisits: true,
        },
      }),
    ]);

    const bounceRate =
      totalPageViews > 0 ? Math.round((bounceCount / totalPageViews) * 100) : 0;

    // Serialize BigInt values
    const serialize = (arr: any[]) =>
      arr.map((item) => {
        const obj: any = {};
        for (const [key, value] of Object.entries(item)) {
          obj[key] = typeof value === "bigint" ? Number(value) : value;
        }
        return obj;
      });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalPageViews,
          uniqueVisitors,
          avgDuration: Number(avgDuration[0]?.avg || 0),
          avgScrollDepth: Number(avgScrollDepth[0]?.avg || 0),
          bounceRate,
          activeNow: recentVisitors.filter(
            (v) =>
              new Date(v.lastActivity).getTime() >
              now.getTime() - 5 * 60 * 1000,
          ).length,
        },
        pageViewsByDay: serialize(pageViewsByDay),
        topPages: serialize(topPages),
        topCountries: serialize(topCountries),
        deviceBreakdown: serialize(deviceBreakdown),
        browserBreakdown: serialize(browserBreakdown),
        osBreakdown: serialize(osBreakdown),
        topReferrers: serialize(topReferrers),
        topArticles: serialize(topArticles),
        recentVisitors,
      },
    });
  } catch (error) {
    console.error("[Visitor Stats] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
