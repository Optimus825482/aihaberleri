/**
 * User Management API - List & Create Users
 *
 * GET /api/admin/users - List users with pagination, search, and filters
 * POST /api/admin/users - Create new user
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  CreateUserSchema,
  ListUsersSchema,
  formatZodError,
} from "@/lib/validation/admin";
import { createAuditLog } from "@/lib/audit-logger";
import {
  sensitiveRateLimit,
  userCreationRateLimit,
  checkRateLimit,
  createRateLimitHeaders,
} from "@/lib/rate-limiter";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

// ============================================================================
// GET /api/admin/users - List Users
// ============================================================================

export async function GET(request: NextRequest) {
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

    // 3. Rate limiting
    const rateLimit = await checkRateLimit(request, sensitiveRateLimit);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.",
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimit),
        },
      );
    }

    // 4. Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "50",
      search: searchParams.get("search") || undefined,
      role: searchParams.get("role") || undefined,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    };

    let validatedParams;
    try {
      validatedParams = ListUsersSchema.parse(queryParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: "Geçersiz parametreler",
            details: formatZodError(error),
          },
          { status: 400 },
        );
      }
      throw error;
    }

    const { page, limit, search, role, sortBy, sortOrder } = validatedParams;
    const skip = (page - 1) * limit;

    // 5. Build where clause
    const where: any = {
      deletedAt: null, // Sadece silinmemiş kullanıcılar
    };

    // Search filter (name veya email)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Role filter
    if (role) {
      where.role = role;
    }

    // 6. Execute queries
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              articles: true,
              auditLogs: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    // 7. Return response
    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/users] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Kullanıcılar listelenirken hata oluştu",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/admin/users - Create User
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    // 2. Authorization check (only SUPER_ADMIN can create users)
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Sadece SUPER_ADMIN kullanıcı oluşturabilir",
        },
        { status: 403 },
      );
    }

    // 3. Rate limiting
    const rateLimit = await checkRateLimit(request, userCreationRateLimit);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Çok fazla kullanıcı oluşturma isteği. Lütfen daha sonra tekrar deneyin.",
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimit),
        },
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();

    let validatedData;
    try {
      validatedData = CreateUserSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            details: formatZodError(error),
          },
          { status: 400 },
        );
      }
      throw error;
    }

    const { name, email, password, role } = validatedData;

    // 5. Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu email adresi zaten kullanılıyor",
        },
        { status: 409 },
      );
    }

    // 6. Hash password (bcrypt with 10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Create user
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // 8. Create audit log
    await createAuditLog({
      userId: session.id || "",
      action: "CREATE_USER",
      resource: "User",
      resourceId: newUser.id,
      details: {
        userName: newUser.name,
        userEmail: newUser.email,
        userRole: newUser.role,
      },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    // 9. Invalidate cache
    revalidateTag("users");

    // 10. Return response
    return NextResponse.json(
      {
        success: true,
        data: newUser,
        message: "Kullanıcı başarıyla oluşturuldu",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/admin/users] Error:", error);

    // Handle Prisma unique constraint error
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu email adresi zaten kullanılıyor",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Kullanıcı oluşturulurken hata oluştu",
      },
      { status: 500 },
    );
  }
}
