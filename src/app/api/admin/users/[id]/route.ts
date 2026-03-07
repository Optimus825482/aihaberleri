/**
 * User Management API - Update & Delete User
 *
 * PATCH /api/admin/users/[id] - Update user
 * DELETE /api/admin/users/[id] - Soft delete user
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuthWithPermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { UpdateUserSchema, formatZodError } from "@/lib/validation/admin";
import { createAuditLog } from "@/lib/audit-logger";
import {
  sensitiveRateLimit,
  checkRateLimit,
  createRateLimitHeaders,
} from "@/lib/rate-limiter";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

// ============================================================================
// PATCH /api/admin/users/[id] - Update User
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // 1. Auth + RBAC (matrix: PATCH /api/admin/users/:id → SUPER_ADMIN only)
    const session = await requireAdminAuthWithPermission(request);
    if (session instanceof NextResponse) return session;

    // 2. Rate limiting
    const rateLimitResult = await checkRateLimit(request, sensitiveRateLimit);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin.",
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) },
      );
    }

    // 3. Get user ID from params
    const userId = params.id;

    // 4. Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: "Kullanıcı bulunamadı" },
        { status: 404 },
      );
    }

    // Check if user is deleted
    if (existingUser.deletedAt) {
      return NextResponse.json(
        { success: false, error: "Bu kullanıcı silinmiş" },
        { status: 410 },
      );
    }

    // 6. Prevent self-demotion (SUPER_ADMIN cannot change their own role)
    const body = await request.json();
    if (userId === session.id && body.role && body.role !== existingUser.role) {
      return NextResponse.json(
        {
          success: false,
          error: "Kendi rolünüzü değiştiremezsiniz",
        },
        { status: 403 },
      );
    }

    // 7. Validate request body
    let validatedData;
    try {
      validatedData = UpdateUserSchema.parse(body);
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

    // 8. Check email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return NextResponse.json(
          {
            success: false,
            error: "Bu email adresi zaten kullanılıyor",
          },
          { status: 409 },
        );
      }
    }

    // 9. Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 10. Create audit log
    await createAuditLog({
      userId: session.id,
      action: "UPDATE_USER",
      resource: "User",
      resourceId: userId,
      details: {
        changes: validatedData,
        previousData: {
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
      },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    // 11. Invalidate cache
    revalidateTag("users");

    // 12. Return response
    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: "Kullanıcı başarıyla güncellendi",
    });
  } catch (error) {
    console.error("[PATCH /api/admin/users/[id]] Error:", error);

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
        error: "Kullanıcı güncellenirken hata oluştu",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/admin/users/[id] - Soft Delete User
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // 1. Auth + RBAC (matrix: DELETE /api/admin/users/:id → SUPER_ADMIN only)
    const session = await requireAdminAuthWithPermission(request);
    if (session instanceof NextResponse) return session;

    // 2. Rate limiting
    const rateLimitResultDelete = await checkRateLimit(
      request,
      sensitiveRateLimit,
    );
    if (!rateLimitResultDelete.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin.",
          retryAfter: rateLimitResultDelete.retryAfter,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResultDelete),
        },
      );
    }

    // 3. Get user ID from params
    const userId = params.id;

    // 4. Prevent self-deletion
    if (userId === session.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Kendi hesabınızı silemezsiniz",
        },
        { status: 403 },
      );
    }

    // 5. Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        deletedAt: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: "Kullanıcı bulunamadı" },
        { status: 404 },
      );
    }

    // Check if already deleted
    if (existingUser.deletedAt) {
      return NextResponse.json(
        { success: false, error: "Bu kullanıcı zaten silinmiş" },
        { status: 410 },
      );
    }

    // 7. Soft delete user (set deletedAt and modify email for unique constraint)
    const timestamp = Date.now();
    const deletedUser = await db.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${timestamp}_${existingUser.email}`, // Email unique constraint için
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        deletedAt: true,
      },
    });

    // 8. Create audit log
    await createAuditLog({
      userId: session.id,
      action: "DELETE_USER",
      resource: "User",
      resourceId: userId,
      details: {
        userName: existingUser.name,
        userEmail: existingUser.email,
        userRole: existingUser.role,
      },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    // 9. Invalidate cache
    revalidateTag("users");

    // 10. Return response
    return NextResponse.json({
      success: true,
      data: {
        id: deletedUser.id,
        deletedAt: deletedUser.deletedAt,
      },
      message: "Kullanıcı başarıyla silindi",
    });
  } catch (error) {
    console.error("[DELETE /api/admin/users/[id]] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Kullanıcı silinirken hata oluştu",
      },
      { status: 500 },
    );
  }
}
