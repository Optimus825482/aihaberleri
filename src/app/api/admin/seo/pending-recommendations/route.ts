import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const severityFilter = searchParams.get("severity")?.split(",") || [];
    const typeFilter = searchParams.get("type")?.split(",") || [];

    // Get all articles with unresolved recommendations
    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        seoRecommendations: {
          some: {
            isResolved: false,
            ...(severityFilter.length > 0 && {
              severity: { in: severityFilter },
            }),
            ...(typeFilter.length > 0 && { type: { in: typeFilter } }),
          },
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        seoScore: true,
        seoRecommendations: {
          where: {
            isResolved: false,
            ...(severityFilter.length > 0 && {
              severity: { in: severityFilter },
            }),
            ...(typeFilter.length > 0 && { type: { in: typeFilter } }),
          },
          orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        },
      },
      orderBy: [{ seoScore: "asc" }],
      take: limit,
      skip: (page - 1) * limit,
    });

    // Group by severity
    const grouped = {
      critical: [] as any[],
      high: [] as any[],
      medium: [] as any[],
      low: [] as any[],
    };

    articles.forEach((article) => {
      const criticalRecs = article.seoRecommendations.filter(
        (r) => r.severity === "critical",
      );
      const highRecs = article.seoRecommendations.filter(
        (r) => r.severity === "high",
      );
      const mediumRecs = article.seoRecommendations.filter(
        (r) => r.severity === "medium",
      );
      const lowRecs = article.seoRecommendations.filter(
        (r) => r.severity === "low",
      );

      const articleData = {
        articleId: article.id,
        articleTitle: article.title,
        articleSlug: article.slug,
        seoScore: article.seoScore,
        recommendations: article.seoRecommendations,
      };

      if (criticalRecs.length > 0) {
        grouped.critical.push({
          ...articleData,
          recommendations: criticalRecs,
        });
      }
      if (highRecs.length > 0) {
        grouped.high.push({
          ...articleData,
          recommendations: highRecs,
        });
      }
      if (mediumRecs.length > 0) {
        grouped.medium.push({
          ...articleData,
          recommendations: mediumRecs,
        });
      }
      if (lowRecs.length > 0) {
        grouped.low.push({
          ...articleData,
          recommendations: lowRecs,
        });
      }
    });

    // Get total count
    const totalCount = await prisma.article.count({
      where: {
        status: "PUBLISHED",
        seoRecommendations: {
          some: {
            isResolved: false,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: grouped,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("[PENDING_RECOMMENDATIONS_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Öneriler yüklenemedi",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
