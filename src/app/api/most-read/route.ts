import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "week";
    const limit = parseInt(searchParams.get("limit") || "5");
    const sortBy = searchParams.get("sort") || "views"; // "views" | "trend"

    // Calculate date limit based on period
    const dateLimit = new Date();
    const whereClause: any = {
      status: "PUBLISHED",
    };

    if (period === "today") {
      dateLimit.setHours(0, 0, 0, 0);
      whereClause.publishedAt = { gte: dateLimit };
    } else if (period === "week") {
      dateLimit.setDate(dateLimit.getDate() - 7);
      whereClause.publishedAt = { gte: dateLimit };
    } else if (period === "month") {
      dateLimit.setDate(dateLimit.getDate() - 30);
      whereClause.publishedAt = { gte: dateLimit };
    }
    // "all" — no date filter

    // Sort by trend score or views
    const orderBy =
      sortBy === "trend"
        ? [{ trendScore: "desc" as const }, { views: "desc" as const }]
        : [{ views: "desc" as const }];

    const articles = await db.article.findMany({
      where: whereClause,
      orderBy,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        views: true,
        publishedAt: true,
        trendScore: true,
        isTrending: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      articles,
      period,
      sortBy,
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
