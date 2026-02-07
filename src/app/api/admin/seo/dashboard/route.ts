/**
 * SEO Dashboard API
 * Genel SEO istatistikleri ve trend analizi
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

// Cache duration: 60 seconds
const CACHE_DURATION = 60;

interface SEODashboardStats {
  overview: {
    totalArticles: number;
    averageScore: number;
    articlesWithIssues: number;
    criticalIssues: number;
  };
  scoreDistribution: {
    excellent: number; // 90-100
    good: number; // 70-89
    fair: number; // 50-69
    poor: number; // 0-49
  };
  topIssues: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
  recentTrend: Array<{
    date: string;
    averageScore: number;
    articlesAnalyzed: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    // Get all published articles with SEO scores
    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
      },
      select: {
        id: true,
        seoScore: true,
        publishedAt: true,
      },
    });

    // Filter articles with valid seoScore
    const articlesWithScore = articles.filter((a) => a.seoScore !== null);
    const totalArticles = articles.length;
    const averageScore =
      articlesWithScore.length > 0
        ? Math.round(
            articlesWithScore.reduce((sum, a) => sum + (a.seoScore ?? 0), 0) /
              articlesWithScore.length,
          )
        : 0;

    // Score distribution (only articles with scores)
    const scoreDistribution = {
      excellent: articlesWithScore.filter((a) => (a.seoScore ?? 0) >= 90)
        .length,
      good: articlesWithScore.filter(
        (a) => (a.seoScore ?? 0) >= 70 && (a.seoScore ?? 0) < 90,
      ).length,
      fair: articlesWithScore.filter(
        (a) => (a.seoScore ?? 0) >= 50 && (a.seoScore ?? 0) < 70,
      ).length,
      poor: articlesWithScore.filter((a) => (a.seoScore ?? 0) < 50).length,
    };

    // Get unresolved recommendations
    const recommendations = await prisma.sEORecommendation.findMany({
      where: {
        isResolved: false,
      },
      select: {
        type: true,
        severity: true,
      },
    });

    const articlesWithIssues = await prisma.article.count({
      where: {
        status: "PUBLISHED",
        seoRecommendations: {
          some: {
            isResolved: false,
          },
        },
      },
    });

    const criticalIssues = recommendations.filter(
      (r) => r.severity === "critical",
    ).length;

    // Top issues by type
    const issuesByType = recommendations.reduce(
      (acc, rec) => {
        const key = rec.type;
        if (!acc[key]) {
          acc[key] = { type: key, count: 0, severity: rec.severity };
        }
        acc[key].count++;
        // Keep highest severity
        if (
          rec.severity === "critical" ||
          (rec.severity === "high" && acc[key].severity !== "critical")
        ) {
          acc[key].severity = rec.severity;
        }
        return acc;
      },
      {} as Record<string, { type: string; count: number; severity: string }>,
    );

    const topIssues = Object.values(issuesByType)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentArticles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        seoScore: true,
        publishedAt: true,
      },
      orderBy: {
        publishedAt: "asc",
      },
    });

    // Group by date
    const trendByDate = recentArticles.reduce(
      (acc, article) => {
        if (!article.publishedAt || article.seoScore === null) return acc;
        const date = article.publishedAt.toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = { scores: [], count: 0 };
        }
        acc[date].scores.push(article.seoScore);
        acc[date].count++;
        return acc;
      },
      {} as Record<string, { scores: number[]; count: number }>,
    );

    const recentTrend = Object.entries(trendByDate).map(([date, data]) => ({
      date,
      averageScore: Math.round(
        data.scores.reduce((sum, s) => sum + s, 0) / data.count,
      ),
      articlesAnalyzed: data.count,
    }));

    const stats: SEODashboardStats = {
      overview: {
        totalArticles,
        averageScore,
        articlesWithIssues,
        criticalIssues,
      },
      scoreDistribution,
      topIssues,
      recentTrend,
    };

    // Return with cache headers
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
      },
    });
  } catch (error) {
    console.error("[SEO_DASHBOARD_ERROR]", error);
    return NextResponse.json(
      {
        error: "SEO istatistikleri alınırken hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
