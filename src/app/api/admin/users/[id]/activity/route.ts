/**
 * User Management API - User Activity Log
 *
 * GET /api/admin/users/[id]/activity - Get user activity history
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  sensitiveRateLimit,
  getClientIdentifier,
  checkRateLimit,
} from "@/lib/rate-limiter";

// ============================================================================
// GET /api/admin/users/[id]/activity - User Activity Log
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // 1. Authentication check
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    // 2. Authorization check (only ADMIN and SUPER_ADMIN)
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Yetki yetersiz" },
        { status: 403 },
      );
    }

    // 3. Rate limiting (temporarily disabled due to type issues)
    // const identifier = getClientIdentifier(request);
    // const rateLimitResponse = await checkRateLimit(
    //   sensitiveRateLimit,
    //   identifier,
    // );
    // if (rateLimitResponse) return rateLimitResponse;

    // 4. Get user ID from params
    const userId = params.id;

    // 5. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const action = searchParams.get("action") || undefined;
    const dateFrom = searchParams.get("dateFrom")
      ? new Date(searchParams.get("dateFrom")!)
      : undefined;
    const dateTo = searchParams.get("dateTo")
      ? new Date(searchParams.get("dateTo")!)
      : undefined;

    const skip = (page - 1) * limit;

    // 6. Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        deletedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Kullanıcı bulunamadı" },
        { status: 404 },
      );
    }

    // 7. Build where clause for audit logs
    const where: any = { userId };

    if (action) {
      where.action = action;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // 8. Fetch audit logs and statistics
    const [auditLogs, totalLogs, articleCount, sessionCount] =
      await Promise.all([
        // Audit logs with pagination
        db.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            action: true,
            resource: true,
            resourceId: true,
            details: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
          },
        }),

        // Total audit logs count
        db.auditLog.count({ where }),

        // Total articles created by user
        db.article.count({
          where: { authorId: userId },
        }),

        // Active sessions count
        db.userSession.count({
          where: {
            userId,
            isActive: true,
            expiresAt: { gte: new Date() },
          },
        }),
      ]);

    // 9. Get action statistics
    const actionStats = await db.auditLog.groupBy({
      by: ["action"],
      where: { userId },
      _count: true,
      orderBy: {
        _count: {
          action: "desc",
        },
      },
      take: 10,
    });

    // 10. Get recent sessions
    const recentSessions = await db.userSession.findMany({
      where: { userId },
      orderBy: { lastActivity: "desc" },
      take: 5,
      select: {
        id: true,
        ipAddress: true,
        country: true,
        city: true,
        device: true,
        browser: true,
        os: true,
        isActive: true,
        lastActivity: true,
        createdAt: true,
      },
    });

    // 11. Calculate activity metrics
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [actionsLast24h, actionsLast7d, actionsLast30d] = await Promise.all([
      db.auditLog.count({
        where: {
          userId,
          createdAt: { gte: last24Hours },
        },
      }),
      db.auditLog.count({
        where: {
          userId,
          createdAt: { gte: last7Days },
        },
      }),
      db.auditLog.count({
        where: {
          userId,
          createdAt: { gte: last30Days },
        },
      }),
    ]);

    // 12. Return response
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          deletedAt: user.deletedAt,
        },
        activities: auditLogs,
        pagination: {
          total: totalLogs,
          page,
          limit,
          totalPages: Math.ceil(totalLogs / limit),
        },
        stats: {
          totalActions: totalLogs,
          totalArticles: articleCount,
          activeSessions: sessionCount,
          actionsLast24h,
          actionsLast7d,
          actionsLast30d,
          topActions: actionStats.map((stat) => ({
            action: stat.action,
            count: stat._count,
          })),
        },
        recentSessions,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/users/[id]/activity] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Kullanıcı aktivitesi alınırken hata oluştu",
      },
      { status: 500 },
    );
  }
}
