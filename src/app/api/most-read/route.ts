import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recalculateTrendScore } from "@/lib/trend-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "week";
    const limit = parseInt(searchParams.get("limit") || "5");

    // Calculate date limit based on period
    const dateLimit = new Date();
    // Use 'any' to allow dynamic property addition
    let whereClause: any = {
      status: "PUBLISHED",
    };

    if (period === "today") {
      dateLimit.setHours(0, 0, 0, 0); // Start of today
      whereClause.publishedAt = { gte: dateLimit };
    } else if (period === "week") {
      dateLimit.setDate(dateLimit.getDate() - 7);
      whereClause.publishedAt = { gte: dateLimit };
    } else if (period === "month") {
      dateLimit.setDate(dateLimit.getDate() - 30);
      whereClause.publishedAt = { gte: dateLimit };
    }
    // For "all" period, don't filter by date

    const articles = await db.article.findMany({
      where: whereClause,
      orderBy: {
        views: "desc",
      },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
        views: true,
        publishedAt: true,
        trendScore: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    // Fire-and-forget trend recalculation for these popular articles
    // This ensures that articles appearing in the "Most Read" list have up-to-date trend scores
    // We don't await this to keep the API response fast
    (async () => {
      try {
        await Promise.allSettled(
          articles.map((a) => recalculateTrendScore(a.id)),
        );
      } catch (e) {
        console.error("Background trend update error:", e);
      }
    })();

    return NextResponse.json({
      articles,
      period,
      count: articles.length,
    });
  } catch (error) {
    console.error("Most read API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch most read articles", articles: [] },
      { status: 500 },
    );
  }
}
