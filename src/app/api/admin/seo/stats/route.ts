import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  // Authentication & Authorization check
  const authResult = await withAuth(request, {
    roles: [UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN],
    skipCSRF: true, // GET request, CSRF not needed
  });

  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  try {
    // Toplam makale sayısı ve ortalama skor
    const articleStats = await prisma.article.aggregate({
      _count: true,
      _avg: {
        seoScore: true,
      },
    });

    // Öneri istatistikleri
    const recommendationStats = await prisma.sEORecommendation.aggregate({
      _count: true,
      where: {
        isResolved: false,
      },
    });

    const resolvedRecommendations = await prisma.sEORecommendation.count({
      where: {
        isResolved: true,
      },
    });

    // Önerisi olan makale sayısı
    const articlesWithRecommendations = await prisma.article.count({
      where: {
        seoRecommendations: {
          some: {
            isResolved: false,
          },
        },
      },
    });

    // Skor dağılımı - Database-level aggregation (N+1 query fix)
    const scoreDistributionRaw = await prisma.$queryRaw<
      Array<{ range: string; count: bigint }>
    >`
      SELECT 
        CASE 
          WHEN "seoScore" >= 90 THEN '90-100'
          WHEN "seoScore" >= 70 THEN '70-89'
          WHEN "seoScore" >= 50 THEN '50-69'
          WHEN "seoScore" >= 30 THEN '30-49'
          ELSE '0-29'
        END as range,
        COUNT(*) as count
      FROM "Article"
      GROUP BY range
      ORDER BY 
        CASE 
          WHEN range = '90-100' THEN 1
          WHEN range = '70-89' THEN 2
          WHEN range = '50-69' THEN 3
          WHEN range = '30-49' THEN 4
          ELSE 5
        END
    `;

    // Convert BigInt to Number for JSON serialization
    const scoreDistribution = scoreDistributionRaw.map((item) => ({
      range: item.range,
      count: Number(item.count),
    }));

    // Öneri türleri dağılımı
    const recommendationsByType = await prisma.sEORecommendation.groupBy({
      by: ["type"],
      _count: true,
      where: {
        isResolved: false,
      },
    });

    const recommendationTypes = recommendationsByType.map((item: any) => ({
      type: item.type,
      count: item._count,
    }));

    // En düşük skorlu makaleler
    const lowestScoringArticles = await prisma.article.findMany({
      where: {
        seoScore: {
          lt: 70,
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
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        seoScore: "asc",
      },
      take: 10,
    });

    const formattedLowestScoring = lowestScoringArticles.map(
      (article: any) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        seoScore: article.seoScore,
        recommendationCount: article.seoRecommendations.length,
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        totalArticles: articleStats._count,
        averageScore: articleStats._avg.seoScore || 0,
        articlesWithRecommendations,
        totalRecommendations:
          recommendationStats._count + resolvedRecommendations,
        resolvedRecommendations,
        scoreDistribution,
        recommendationTypes,
        lowestScoringArticles: formattedLowestScoring,
      },
    });
  } catch (error) {
    console.error("SEO stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "İstatistikler yüklenemedi",
      },
      { status: 500 },
    );
  }
}
