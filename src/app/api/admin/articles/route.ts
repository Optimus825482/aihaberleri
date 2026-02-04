import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/articles
 * Get all articles with optional filters and includes
 */
export async function GET(request: NextRequest) {
  try {
    // JWT Authentication
    const token = request.cookies.get("admin-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-this",
    );

    try {
      await jwtVerify(token, secret);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const include = searchParams.get("include");
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Build include clause
    const includeClause: any = {
      category: true,
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
