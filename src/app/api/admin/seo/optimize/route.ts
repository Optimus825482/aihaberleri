/**
 * SEO Optimize API
 *
 * POST /api/admin/seo/optimize
 *
 * KULLANIM:
 * {
 *   "articleId": "...",
 *   "mode": "auto" | "review",
 *   "agents": ["analyzer", "content", "technical"] // optional
 * }
 *
 * RESPONSE:
 * {
 *   "success": true,
 *   "mode": "review",
 *   "changes": { ... },
 *   "applied": false,
 *   "metrics": { ... }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { SEOOrchestratorService } from "@/services/seo-orchestrator.service";
import { withAuth } from "@/lib/auth/middleware";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  // Authentication & Authorization check - EDITOR or ADMIN
  const authResult = await withAuth(request, {
    roles: [UserRole.EDITOR, UserRole.ADMIN],
  });

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();

    // Validation
    if (!body.articleId) {
      return NextResponse.json(
        {
          success: false,
          error: "articleId gerekli",
        },
        { status: 400 },
      );
    }

    if (body.mode && !["auto", "review"].includes(body.mode)) {
      return NextResponse.json(
        {
          success: false,
          error: "mode 'auto' veya 'review' olmalı",
        },
        { status: 400 },
      );
    }

    console.log(`\n🎯 SEO Optimize API çağrıldı:`);
    console.log(`   Article ID: ${body.articleId}`);
    console.log(`   Mode: ${body.mode || "review"}`);
    console.log(`   Agents: ${body.agents?.join(", ") || "all"}`);

    // Orchestrator'ı başlat
    const orchestrator = new SEOOrchestratorService();

    const result = await orchestrator.optimizeArticle(body.articleId, {
      mode: body.mode || "review",
      agents: body.agents,
      includeRelatedArticles: body.includeRelatedArticles !== false,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Optimization failed",
        },
        { status: 500 },
      );
    }

    console.log(`✅ SEO Optimize API başarılı`);

    return NextResponse.json({
      success: true,
      mode: result.mode,
      changes: result.changes,
      applied: result.applied,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error("❌ SEO Optimize API hatası:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Batch optimization endpoint
 *
 * POST /api/admin/seo/optimize?batch=true
 *
 * KULLANIM:
 * {
 *   "articleIds": ["id1", "id2", ...],
 *   "mode": "auto" | "review"
 * }
 */
export async function PUT(request: NextRequest) {
  // Authentication & Authorization check - ADMIN only for batch operations
  const authResult = await withAuth(request, {
    roles: [UserRole.ADMIN],
  });

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();

    // Validation
    if (!body.articleIds || !Array.isArray(body.articleIds)) {
      return NextResponse.json(
        {
          success: false,
          error: "articleIds array gerekli",
        },
        { status: 400 },
      );
    }

    if (body.articleIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "En az 1 article ID gerekli",
        },
        { status: 400 },
      );
    }

    if (body.articleIds.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Maksimum 100 makale optimize edilebilir",
        },
        { status: 400 },
      );
    }

    console.log(`\n🎯 Batch SEO Optimize API çağrıldı:`);
    console.log(`   Articles: ${body.articleIds.length}`);
    console.log(`   Mode: ${body.mode || "review"}`);

    // Orchestrator'ı başlat
    const orchestrator = new SEOOrchestratorService();

    const results = await orchestrator.optimizeBatch(body.articleIds, {
      mode: body.mode || "review",
      agents: body.agents,
      includeRelatedArticles: body.includeRelatedArticles !== false,
    });

    // Sonuçları özetle
    const summary = {
      total: body.articleIds.length,
      success: 0,
      failed: 0,
      applied: 0,
      averageScore: 0,
      totalDuration: 0,
    };

    let totalScore = 0;

    for (const [articleId, result] of results.entries()) {
      if (result.success) {
        summary.success++;
        if (result.applied) {
          summary.applied++;
        }
        if (result.changes?.estimatedScore) {
          totalScore += result.changes.estimatedScore;
        }
      } else {
        summary.failed++;
      }
      summary.totalDuration += result.metrics.duration;
    }

    summary.averageScore =
      summary.success > 0 ? Math.round(totalScore / summary.success) : 0;

    console.log(`✅ Batch SEO Optimize API tamamlandı:`);
    console.log(`   Success: ${summary.success}/${summary.total}`);
    console.log(`   Applied: ${summary.applied}`);
    console.log(`   Average Score: ${summary.averageScore}`);

    return NextResponse.json({
      success: true,
      summary,
      results: Object.fromEntries(results),
    });
  } catch (error) {
    console.error("❌ Batch SEO Optimize API hatası:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
