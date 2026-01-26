import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArticleStatus } from "@prisma/client";

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Get current date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get last 7 days for chart
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Parallel queries for better performance
    const [
      totalArticles,
      totalViews,
      todayArticles,
      publishedArticles,
      draftArticles,
      categoryStats,
      recentArticles,
      last7DaysArticles,
    ] = await Promise.all([
      // Total articles
      db.article.count(),

      // Total views
      db.article.aggregate({
        _sum: {
          views: true,
        },
      }),

      // Today's articles
      db.article.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // Published articles
      db.article.count({
        where: {
          status: ArticleStatus.PUBLISHED,
        },
      }),

      // Draft articles
      db.article.count({
        where: {
          status: ArticleStatus.DRAFT,
        },
      }),

      // Category stats with last article date and views
      db.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              articles: true,
            },
          },
          articles: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              createdAt: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),

      // Recent 5 articles
      db.article.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
          publishedAt: true,
          views: true,
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      }),

      // Last 7 days articles for chart
      db.article.groupBy({
        by: ["createdAt"],
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        _count: true,
      }),
    ]);

    // Get category views
    const categoryViews = await db.article.groupBy({
      by: ["categoryId"],
      _sum: {
        views: true,
      },
    });

    // Map category views to category stats
    const categoryStatsWithViews = await Promise.all(
      categoryStats.map(async (cat) => {
        const viewData = categoryViews.find((v) => v.categoryId === cat.id);
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          articleCount: cat._count.articles,
          lastArticleDate: cat.articles[0]?.createdAt || null,
          totalViews: viewData?._sum.views || 0,
        };
      }),
    );

    // Process last 7 days data for chart
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const count = last7DaysArticles.filter((article) => {
        const articleDate = new Date(article.createdAt)
          .toISOString()
          .split("T")[0];
        return articleDate === dateStr;
      }).length;

      chartData.push({
        date: dateStr,
        count,
        label: date.toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "short",
        }),
      });
    }

    // Category distribution for pie chart
    const categoryDistribution = categoryStatsWithViews.map((cat) => ({
      name: cat.name,
      value: cat.articleCount,
      percentage:
        totalArticles > 0
          ? Math.round((cat.articleCount / totalArticles) * 100)
          : 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalArticles,
          totalViews: totalViews._sum.views || 0,
          todayArticles,
          publishedArticles,
          draftArticles,
        },
        categoryStats: categoryStatsWithViews,
        recentArticles,
        charts: {
          last7Days: chartData,
          categoryDistribution,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
