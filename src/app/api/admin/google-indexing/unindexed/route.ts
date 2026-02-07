import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get("language");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const statusFilter = searchParams.get("status"); // "all", "indexed", "not_indexed"

    // Build where clause - TÜM YAYINLANMIŞ HABERLERİ ÇEK
    const where: any = {
      status: "PUBLISHED",
    };

    // Status filter
    if (statusFilter === "indexed") {
      where.googleIndexed = true;
    } else if (statusFilter === "not_indexed") {
      where.googleIndexed = false;
    }
    // "all" ise filtre ekleme - tümünü getir

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

    // Fetch ALL published articles
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
        googleIndexStatus: true,
        googleIndexingScheduled: true,
        googleIndexingScheduledAt: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 1000, // Increased limit
    });

    // Transform data
    const transformedArticles = articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      language: article.language,
      publishedAt: article.publishedAt?.toISOString() || null,
      category: article.category?.name || "Uncategorized",
      googleIndexed: article.googleIndexed,
      googleIndexedAt: article.googleIndexedAt?.toISOString() || null,
      googleIndexStatus: article.googleIndexStatus,
      googleIndexingScheduled: article.googleIndexingScheduled,
      googleIndexingScheduledAt:
        article.googleIndexingScheduledAt?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      articles: transformedArticles,
      count: transformedArticles.length,
    });
  } catch (error) {
    console.error("Failed to fetch articles:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Haberler yüklenirken bir hata oluştu",
      },
      { status: 500 },
    );
  }
}
