import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

/**
 * GET /api/admin/monitoring/errors
 * Error logs endpoint with filtering and pagination
 * Query params: level, limit, page, dateFrom, dateTo, search
 */

const querySchema = z.object({
  level: z.enum(["error", "warn", "fatal", "all"]).optional().default("all"),
  limit: z.coerce.number().min(1).max(1000).optional().default(50),
  page: z.coerce.number().min(1).optional().default(1),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication check
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    // 2. Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      level: searchParams.get("level"),
      limit: searchParams.get("limit"),
      page: searchParams.get("page"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
      search: searchParams.get("search"),
    });

    // Calculate offset from page
    const offset = (params.page - 1) * params.limit;

    // 3. Build where clause
    const where: any = {};

    // Filter by level
    if (params.level !== "all") {
      where.level = params.level;
    }

    // Filter by date range
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.createdAt.lte = new Date(params.dateTo);
      }
    }

    // Search in message or stack trace
    if (params.search) {
      where.OR = [
        { message: { contains: params.search, mode: "insensitive" } },
        { stack: { contains: params.search, mode: "insensitive" } },
      ];
    }

    // 4. Parallel queries for better performance
    const [total, errors, errorStats, topErrors] = await Promise.all([
      // Total count
      db.errorLog.count({ where }),

      // Paginated errors
      db.errorLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.limit,
        skip: offset,
        select: {
          id: true,
          level: true,
          message: true,
          stack: true,
          context: true,
          createdAt: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
        },
      }),

      // Error statistics (last 24 hours)
      db.errorLog.groupBy({
        by: ["level"],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        _count: true,
      }),

      // Top errors (most common)
      db.$queryRaw<Array<{ message: string; count: bigint }>>`
        SELECT message, COUNT(*) as count
        FROM "ErrorLog"
        WHERE "createdAt" > NOW() - INTERVAL '24 hours'
        GROUP BY message
        ORDER BY count DESC
        LIMIT 10
      `.catch(() => []),
    ]);

    // 5. Build statistics
    const totalPages = Math.ceil(total / params.limit);
    const errorsByLevel = errorStats.reduce(
      (acc, stat) => {
        acc[stat.level] = stat._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const last24HoursTotal = errorStats.reduce(
      (sum, stat) => sum + stat._count,
      0,
    );

    // 6. Build response
    const responseData = {
      success: true,
      data: errors,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages,
        hasMore: params.page < totalPages,
      },
      stats: {
        totalErrors: total,
        last24Hours: last24HoursTotal,
        errorsByLevel,
        topErrors: topErrors.map((e) => ({
          message: e.message,
          count: Number(e.count),
        })),
      },
      timestamp: new Date().toISOString(),
    };

    // 7. Add response time header
    const responseTime = Date.now() - startTime;
    const response = NextResponse.json(responseData);
    response.headers.set("X-Response-Time", `${responseTime}ms`);

    // Cache for 60 seconds (REALTIME)
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=120",
    );

    return response;
  } catch (error) {
    console.error("Error logs fetch error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz sorgu parametreleri",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    const responseTime = Date.now() - startTime;
    const response = NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
    response.headers.set("X-Response-Time", `${responseTime}ms`);

    return response;
  }
}
