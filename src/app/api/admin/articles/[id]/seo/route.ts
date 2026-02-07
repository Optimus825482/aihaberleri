import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  analyzeArticleSEO,
  saveSEORecommendations,
  getArticleSEORecommendations,
} from "@/lib/seo-analyzer";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-this",
);

/**
 * GET /api/admin/articles/[id]/seo
 * Get SEO recommendations for an article
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication using custom JWT
    const token = req.cookies.get("admin-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userRole = "VIEWER";
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userRole = (payload.role as string) || "VIEWER";
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(userRole, Permission.VIEW_ARTICLES)) {
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
    // Check authentication using custom JWT
    const token = req.cookies.get("admin-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userRole = "VIEWER";
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userRole = (payload.role as string) || "VIEWER";
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(userRole, Permission.EDIT_ARTICLE)) {
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
