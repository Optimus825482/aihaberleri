/**
 * Advanced Article Filters API
 *
 * GET /api/admin/articles/advanced
 *
 * Gelişmiş filtreleme ve arama özellikleri
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCache } from "@/lib/cache";
import {
  AdvancedFiltersSchema,
  safeValidateRequest,
  formatZodError,
} from "@/lib/validation/admin";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim" },
        { status: 401 },
      );
    }

    // 2. Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = safeValidateRequest(AdvancedFiltersSchema, queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: formatZodError(validation.error),
        },
        { status: 400 },
      );
    }

    const {
      page,
      limit,
      categories,
      dateFrom,
      dateTo,
      status,
      viewsMin,
      viewsMax,
      scoreMin,
      scoreMax,
      search,
      sortBy,
      sortOrder,
    } = validation.data;

    // 3. Check cache
    const cacheKey = `articles:advanced:${JSON.stringify(validation.data)}`;
    const cache = getCache();

    const cached = await cache.get<any>(cacheKey, {
      tags: ["articles", "articles:advanced"],
    });

    if (cached) {
      const response = NextResponse.json(cached);
      response.headers.set("X-Cache", "HIT");
      response.headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
      return response;
    }

    // 4. Build Prisma where clause
    const where: Prisma.ArticleWhereInput = {
      AND: [
        // Categories filter
        categories && categories.length > 0
          ? {
              category: {
                slug: { in: categories },
              },
            }
          : {},

        // Date range filter
        dateFrom || dateTo
          ? {
              publishedAt: {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(dateTo) }),
              },
            }
          : {},

        // Status filter
        status && status.length > 0
          ? {
              status: { in: status },
            }
          : {},

        // Views range filter
        viewsMin !== undefined || viewsMax !== undefined
          ? {
              views: {
                ...(viewsMin !== undefined && { gte: viewsMin }),
                ...(viewsMax !== undefined && { lte: viewsMax }),
              },
            }
          : {},

        // Score range filter
        scoreMin !== undefined || scoreMax !== undefined
          ? {
              score: {
                ...(scoreMin !== undefined && { gte: scoreMin }),
                ...(scoreMax !== undefined && { lte: scoreMax }),
              },
            }
          : {},

        // Search filter (full-text search)
        search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { excerpt: { contains: search, mode: "insensitive" } },
                { content: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    // 5. Execute queries in parallel
    const skip = (page - 1) * limit;

    const [articles, total, availableCategories, statusCounts, ranges] =
      await Promise.all([
        // Get articles
        db.article.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            imageUrl: true,
            status: true,
            views: true,
            score: true,
            publishedAt: true,
            createdAt: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
        }),

        // Get total count
        db.article.count({ where }),

        // Get available categories with counts
        db.category.findMany({
          select: {
            slug: true,
            name: true,
            _count: {
              select: {
                articles: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        }),

        // Get status counts
        db.article.groupBy({
          by: ["status"],
          _count: true,
        }),

        // Get ranges for filters
        db.article.aggregate({
          _min: {
            publishedAt: true,
            views: true,
            score: true,
          },
          _max: {
            publishedAt: true,
            views: true,
            score: true,
          },
        }),
      ]);

    // 6. Format response
    const responseData = {
      success: true,
      data: articles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        applied: [
          ...(categories && categories.length > 0
            ? [`categories: ${categories.join(", ")}`]
            : []),
          ...(dateFrom ? [`dateFrom: ${dateFrom}`] : []),
          ...(dateTo ? [`dateTo: ${dateTo}`] : []),
          ...(status && status.length > 0
            ? [`status: ${status.join(", ")}`]
            : []),
          ...(viewsMin !== undefined ? [`viewsMin: ${viewsMin}`] : []),
          ...(viewsMax !== undefined ? [`viewsMax: ${viewsMax}`] : []),
          ...(scoreMin !== undefined ? [`scoreMin: ${scoreMin}`] : []),
          ...(scoreMax !== undefined ? [`scoreMax: ${scoreMax}`] : []),
          ...(search ? [`search: ${search}`] : []),
        ],
        available: {
          categories: availableCategories.map((c) => ({
            slug: c.slug,
            name: c.name,
            count: c._count.articles,
          })),
          statusCounts: statusCounts.reduce(
            (acc, s) => {
              acc[s.status] = s._count;
              return acc;
            },
            {} as Record<string, number>,
          ),
          dateRange: {
            min: ranges._min.publishedAt?.toISOString() || null,
            max: ranges._max.publishedAt?.toISOString() || null,
          },
          viewsRange: {
            min: ranges._min.views || 0,
            max: ranges._max.views || 0,
          },
          scoreRange: {
            min: ranges._min.score || 0,
            max: ranges._max.score || 0,
          },
        },
      },
      meta: {
        duration: Date.now() - startTime,
        cached: false,
      },
    };

    // 7. Cache response (2 minutes TTL)
    await cache.set(cacheKey, responseData, {
      ttl: 120,
      tags: ["articles", "articles:advanced"],
    });

    // 8. Return response
    const response = NextResponse.json(responseData);
    response.headers.set("X-Cache", "MISS");
    response.headers.set("X-Response-Time", `${Date.now() - startTime}ms`);

    return response;
  } catch (error) {
    console.error("[ADVANCED_FILTERS] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
        duration: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}
