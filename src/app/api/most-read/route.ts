import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "week";
    const limit = parseInt(searchParams.get("limit") || "5");

    // Calculate date limit based on period
    const dateLimit = new Date();
    if (period === "today") {
      dateLimit.setHours(0, 0, 0, 0); // Start of today
    } else if (period === "week") {
      dateLimit.setDate(dateLimit.getDate() - 7);
    } else if (period === "month") {
      dateLimit.setDate(dateLimit.getDate() - 30);
    }

    const articles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          gte: dateLimit,
        },
      },
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
      count: articles.length,
    });
  } catch (error) {
    console.error("Most read API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch most read articles", articles: [] },
      { status: 500 }
    );
  }
}
