import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";
import { ArticleStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/articles
 * Get all articles with optional filters and includes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const include = searchParams.get("include");
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const language = searchParams.get("language")?.toLowerCase();
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Prisma.ArticleWhereInput = {};
    if (
      status &&
      Object.values(ArticleStatus).includes(status as ArticleStatus)
    ) {
      where.status = status as ArticleStatus;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (language && ["tr", "en"].includes(language)) {
      where.language = language;
    }

    // Build include clause
    const includeClause: Prisma.ArticleInclude = {
      category: true,
      socialShares: {
        select: {
          platform: true,
          language: true,
          status: true,
          sharedAt: true,
          postUrl: true,
        },
      },
      _count: {
        select: {
          seoRecommendations: true,
        },
      },
    };

    // Include SEO recommendations if requested
    if (include === "seo") {
      includeClause.seoRecommendations = {
        where: {
          isResolved: false,
        },
        orderBy: {
          severity: "asc",
        },
      };
    }

    // Fetch articles
    const articles = await prisma.article.findMany({
      where,
      include: includeClause,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await prisma.article.count({ where });

    return NextResponse.json({
      articles,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 },
    );
  }
}
