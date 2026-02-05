import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get("language");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Build where clause
    const where: any = {
      googleIndexed: false,
      status: "PUBLISHED",
    };

    if (language && language !== "all") {
      where.language = language;
    }

    if (dateFrom || dateTo) {
      where.publishedAt = {};
      if (dateFrom) {
        where.publishedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.publishedAt.lte = new Date(dateTo);
      }
    }

    // Fetch unindexed articles
    const articles = await prisma.article.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        language: true,
        publishedAt: true,
        googleIndexed: true,
        googleIndexedAt: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 500, // Limit to prevent performance issues
    });

    // Transform data
    const transformedArticles = articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      language: article.language,
      publishedAt: article.publishedAt.toISOString(),
      category: article.category?.name || "Uncategorized",
      googleIndexed: article.googleIndexed,
      googleIndexedAt: article.googleIndexedAt?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      articles: transformedArticles,
      count: transformedArticles.length,
    });
  } catch (error) {
    console.error("Failed to fetch unindexed articles:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Haberler yüklenirken bir hata oluştu",
      },
      { status: 500 },
    );
  }
}
