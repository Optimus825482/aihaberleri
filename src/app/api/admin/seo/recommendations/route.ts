/**
 * SEO Recommendations API
 * Makale için SEO önerilerini yönetme
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdminAuth, type AdminSession } from "@/lib/admin-auth";

function hasRequiredRole(session: AdminSession, roles: string[]) {
  return roles.includes(session.role) || session.role === "SUPER_ADMIN";
}

// Validation schemas
const resolveSchema = z.object({
  id: z.string().cuid(),
  resolved: z.boolean(),
});

const deleteSchema = z.object({
  id: z.string().cuid(),
});

/**
 * GET - Makale için SEO önerilerini getir
 * Query params: articleId (required)
 */
export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }
  if (!hasRequiredRole(session, ["VIEWER", "EDITOR", "ADMIN"])) {
    return NextResponse.json({ error: "Yetki yetersiz" }, { status: 403 });
  }

  try {
    // Authentication check (REMOVED - now handled by withAuth)
    // const session = await auth();
    // if (!session) {
    //   return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    // }

    // Get articleId from query params
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get("articleId");

    if (!articleId) {
      return NextResponse.json(
        { error: "articleId parametresi gerekli" },
        { status: 400 },
      );
    }

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, title: true, seoScore: true },
    });

    if (!article) {
      return NextResponse.json({ error: "Makale bulunamadı" }, { status: 404 });
    }

    // Get recommendations
    const recommendations = await prisma.sEORecommendation.findMany({
      where: { articleId },
      orderBy: [
        { isResolved: "asc" }, // Unresolved first
        { severity: "asc" }, // Critical first
        { createdAt: "desc" },
      ],
    });

    // Group by severity
    const grouped = {
      critical: recommendations.filter((r: any) => r.severity === "critical"),
      high: recommendations.filter((r: any) => r.severity === "high"),
      medium: recommendations.filter((r: any) => r.severity === "medium"),
      low: recommendations.filter((r: any) => r.severity === "low"),
    };

    const stats = {
      total: recommendations.length,
      unresolved: recommendations.filter((r: any) => !r.isResolved).length,
      resolved: recommendations.filter((r: any) => r.isResolved).length,
      bySeverity: {
        critical: grouped.critical.length,
        high: grouped.high.length,
        medium: grouped.medium.length,
        low: grouped.low.length,
      },
    };

    return NextResponse.json({
      article: {
        id: article.id,
        title: article.title,
        seoScore: article.seoScore,
      },
      recommendations,
      grouped,
      stats,
    });
  } catch (error) {
    console.error("[GET_RECOMMENDATIONS_ERROR]", error);
    return NextResponse.json(
      {
        error: "Öneriler alınırken hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

/**
 * POST - Öneriyi çözüldü/çözülmedi olarak işaretle
 * Body: { id: string, resolved: boolean }
 */
export async function POST(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }
  if (!hasRequiredRole(session, ["EDITOR", "ADMIN"])) {
    return NextResponse.json({ error: "Yetki yetersiz" }, { status: 403 });
  }

  try {
    // Authentication check (REMOVED - now handled by withAuth)
    // const session = await auth();
    // if (!session) {
    //   return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    // }

    // Parse and validate body
    const body = await request.json();
    const validation = resolveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Geçersiz istek",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { id, resolved } = validation.data;

    // Check if recommendation exists
    const recommendation = await prisma.sEORecommendation.findUnique({
      where: { id },
      include: {
        article: {
          select: { id: true, title: true },
        },
      },
    });

    if (!recommendation) {
      return NextResponse.json({ error: "Öneri bulunamadı" }, { status: 404 });
    }

    // Update recommendation
    const updated = await prisma.sEORecommendation.update({
      where: { id },
      data: { isResolved: resolved },
    });

    return NextResponse.json({
      success: true,
      message: resolved
        ? "Öneri çözüldü olarak işaretlendi"
        : "Öneri çözülmedi olarak işaretlendi",
      recommendation: updated,
      article: recommendation.article,
    });
  } catch (error) {
    console.error("[RESOLVE_RECOMMENDATION_ERROR]", error);
    return NextResponse.json(
      {
        error: "Öneri güncellenirken hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Öneriyi sil
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }
  if (!hasRequiredRole(session, ["EDITOR", "ADMIN"])) {
    return NextResponse.json({ error: "Yetki yetersiz" }, { status: 403 });
  }

  try {
    // Authentication check (REMOVED - now handled by withAuth)
    // const session = await auth();
    // if (!session) {
    //   return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    // }

    // Parse and validate body
    const body = await request.json();
    const validation = deleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Geçersiz istek",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { id } = validation.data;

    // Check if recommendation exists
    const recommendation = await prisma.sEORecommendation.findUnique({
      where: { id },
      include: {
        article: {
          select: { id: true, title: true },
        },
      },
    });

    if (!recommendation) {
      return NextResponse.json({ error: "Öneri bulunamadı" }, { status: 404 });
    }

    // Delete recommendation
    await prisma.sEORecommendation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Öneri silindi",
      article: recommendation.article,
    });
  } catch (error) {
    console.error("[DELETE_RECOMMENDATION_ERROR]", error);
    return NextResponse.json(
      {
        error: "Öneri silinirken hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
