/**
 * SEO Recalculation API
 * Toplu SEO skorunu yeniden hesaplama
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { analyzeArticleSEO, saveSEORecommendations } from "@/lib/seo-analyzer";

// Validation schema
const recalculateSchema = z.object({
  articleIds: z.array(z.string().cuid()).optional(),
  all: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

interface RecalculationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ articleId: string; error: string }>;
  duration: number;
  stats: {
    averageScoreBefore: number;
    averageScoreAfter: number;
    improvement: number;
  };
}

/**
 * POST - SEO skorlarını yeniden hesapla
 * Body: { articleIds?: string[], all?: boolean, status?: ArticleStatus }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const validation = recalculateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Geçersiz istek",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { articleIds, all, status } = validation.data;

    // Validate request
    if (!articleIds && !all) {
      return NextResponse.json(
        {
          error: "articleIds veya all parametresi gerekli",
        },
        { status: 400 },
      );
    }

    // Get articles to process
    let articles;
    if (all) {
      const whereClause: any = {};
      if (status) {
        whereClause.status = status;
      }

      articles = await prisma.article.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          seoScore: true,
        },
      });
    } else if (articleIds && articleIds.length > 0) {
      articles = await prisma.article.findMany({
        where: {
          id: { in: articleIds },
        },
        select: {
          id: true,
          title: true,
          seoScore: true,
        },
      });
    } else {
      return NextResponse.json(
        { error: "İşlenecek makale bulunamadı" },
        { status: 400 },
      );
    }

    if (articles.length === 0) {
      return NextResponse.json(
        { error: "İşlenecek makale bulunamadı" },
        { status: 404 },
      );
    }

    // Calculate average score before
    const totalScoreBefore = articles.reduce(
      (sum: number, a: any) => sum + a.seoScore,
      0,
    );
    const averageScoreBefore = Math.round(totalScoreBefore / articles.length);

    // Process articles
    const results: RecalculationResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
      duration: 0,
      stats: {
        averageScoreBefore,
        averageScoreAfter: 0,
        improvement: 0,
      },
    };

    // Process in batches to avoid timeout
    const BATCH_SIZE = 10;
    const batches = [];
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      batches.push(articles.slice(i, i + BATCH_SIZE));
    }

    let totalScoreAfter = 0;

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (article: any) => {
          try {
            // Analyze article
            const analysis = await analyzeArticleSEO(article.id);

            // Save recommendations
            await saveSEORecommendations(article.id, analysis.recommendations);

            results.processed++;
            totalScoreAfter += analysis.score;
          } catch (error) {
            results.failed++;
            results.errors.push({
              articleId: article.id,
              error: error instanceof Error ? error.message : "Bilinmeyen hata",
            });
          }
        }),
      );
    }

    // Calculate stats
    const averageScoreAfter =
      results.processed > 0
        ? Math.round(totalScoreAfter / results.processed)
        : 0;
    const improvement = averageScoreAfter - averageScoreBefore;

    results.stats.averageScoreAfter = averageScoreAfter;
    results.stats.improvement = improvement;
    results.duration = Date.now() - startTime;

    // Log operation
    console.log("[SEO_RECALCULATION]", {
      user: session.user?.email,
      processed: results.processed,
      failed: results.failed,
      duration: results.duration,
      improvement,
    });

    return NextResponse.json({
      success: true,
      message: `${results.processed} makale başarıyla işlendi`,
      results,
    });
  } catch (error) {
    console.error("[RECALCULATE_SEO_ERROR]", error);
    return NextResponse.json(
      {
        error: "SEO yeniden hesaplanırken hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
        duration: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * GET - Recalculation status (for long-running operations)
 * Query params: operationId (optional, for future implementation)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Get total articles and their SEO status
    const stats = await prisma.article.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
      _avg: {
        seoScore: true,
      },
    });

    const totalArticles = await prisma.article.count();
    const articlesWithRecommendations = await prisma.article.count({
      where: {
        seoRecommendations: {
          some: {},
        },
      },
    });

    return NextResponse.json({
      totalArticles,
      articlesWithRecommendations,
      byStatus: stats.map((s: any) => ({
        status: s.status,
        count: s._count.id,
        averageScore: Math.round(s._avg.seoScore || 0),
      })),
    });
  } catch (error) {
    console.error("[GET_RECALCULATION_STATUS_ERROR]", error);
    return NextResponse.json(
      {
        error: "Durum bilgisi alınırken hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
