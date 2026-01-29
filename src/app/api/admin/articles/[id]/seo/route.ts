import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  analyzeArticleSEO,
  saveSEORecommendations,
  getArticleSEORecommendations,
} from "@/lib/seo-analyzer";

/**
 * GET /api/admin/articles/[id]/seo
 * Get SEO recommendations for an article
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_ARTICLE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const recommendations = await getArticleSEORecommendations(params.id);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("[GET_SEO_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/articles/[id]/seo
 * Analyze article and generate SEO recommendations
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.EDIT_ARTICLE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const analysis = await analyzeArticleSEO(params.id);
    await saveSEORecommendations(params.id, analysis.recommendations);

    return NextResponse.json({
      success: true,
      score: analysis.score,
      recommendations: analysis.recommendations,
    });
  } catch (error) {
    console.error("[ANALYZE_SEO_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
