import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. General Stats
    const totalVisits = await db.articleAnalytics.count();
    
    const avgDurationResult = await db.articleAnalytics.aggregate({
      _avg: {
        duration: true,
      },
    });
    const avgDuration = Math.round(avgDurationResult._avg.duration || 0);

    // 2. Top Articles by Average Duration (Engagement)
    // Prisma doesn't support complex group by with relation fetching easily,
    // so we might need raw query or post-processing.
    // Let's use raw query for performance.
    
    const topArticles = await db.$queryRaw`
      SELECT 
        a.id, 
        a.title, 
        a.slug,
        COUNT(aa.id) as visits, 
        AVG(aa.duration) as avg_duration 
      FROM "Article" a
      JOIN "ArticleAnalytics" aa ON a.id = aa."articleId"
      GROUP BY a.id, a.title, a.slug
      ORDER BY avg_duration DESC
      LIMIT 10
    `;

    // 3. Recent Visits
    const recentVisits = await db.articleAnalytics.findMany({
      take: 20,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        article: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalVisits,
          avgDuration,
        },
        topArticles: JSON.parse(
          JSON.stringify(topArticles, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
        recentVisits,
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
