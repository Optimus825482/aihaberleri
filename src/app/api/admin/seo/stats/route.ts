import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

    // Skor dağılımı
    const allArticles = await prisma.article.findMany({
      select: {
        seoScore: true,
      },
    });

    const scoreDistribution = [
      {
        range: "90-100",
        count: allArticles.filter((a: any) => a.seoScore >= 90).length,
      },
      {
        range: "70-89",
        count: allArticles.filter(
          (a: any) => a.seoScore >= 70 && a.seoScore < 90,
        ).length,
      },
      {
        range: "50-69",
        count: allArticles.filter(
          (a: any) => a.seoScore >= 50 && a.seoScore < 70,
        ).length,
      },
      {
        range: "30-49",
        count: allArticles.filter(
          (a: any) => a.seoScore >= 30 && a.seoScore < 50,
        ).length,
      },
      {
        range: "0-29",
        count: allArticles.filter((a: any) => a.seoScore < 30).length,
      },
    ];

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
