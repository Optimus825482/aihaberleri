/**
 * User Management API - Bulk Role Assignment
 *
 * POST /api/admin/users/bulk-role - Assign role to multiple users
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { BulkRoleSchema, formatZodError } from "@/lib/validation/admin";
import { createAuditLog } from "@/lib/audit-logger";
import {
  bulkRateLimit,
  getClientIdentifier,
  checkRateLimit,
} from "@/lib/rate-limiter";
import { revalidateTag } from "next/cache";

// ============================================================================
// POST /api/admin/users/bulk-role - Bulk Role Assignment
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim" },
        { status: 401 },
      );
    }

    // 2. Authorization check (only SUPER_ADMIN can bulk assign roles)
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Sadece SUPER_ADMIN toplu rol ataması yapabilir",
        },
        { status: 403 },
      );
    }

    // 3. Rate limiting (strict for bulk operations)
    const identifier = getClientIdentifier(request);
    const rateLimitResponse = await checkRateLimit(bulkRateLimit, identifier);
    if (rateLimitResponse) return rateLimitResponse;

    // 4. Parse and validate request body
    const body = await request.json();

    let validatedData;
    try {
      validatedData = BulkRoleSchema.parse(body);
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

    const { userIds, role } = validatedData;

    // 5. Prevent self-role change in bulk operation
    if (userIds.includes(session.user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Toplu işlemde kendi rolünüzü değiştiremezsiniz",
        },
        { status: 403 },
      );
    }

    // 6. Check if all users exist and are not deleted
    const existingUsers = await db.user.findMany({
      where: {
        id: { in: userIds },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Find missing or deleted users
    const existingUserIds = existingUsers.map((u) => u.id);
    const missingUserIds = userIds.filter(
      (id) => !existingUserIds.includes(id),
    );

    if (missingUserIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Bazı kullanıcılar bulunamadı veya silinmiş",
          details: {
            missingUserIds,
            foundCount: existingUsers.length,
            requestedCount: userIds.length,
          },
        },
        { status: 404 },
      );
    }

    // 7. Perform bulk role assignment using transaction
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    try {
      // Use transaction for atomicity
      await db.$transaction(async (tx) => {
        for (const user of existingUsers) {
          try {
            await tx.user.update({
              where: { id: user.id },
              data: {
                role,
                updatedAt: new Date(),
              },
            });
            processed++;
          } catch (error) {
            failed++;
            errors.push({
              id: user.id,
              error: error instanceof Error ? error.message : "Bilinmeyen hata",
            });
          }
        }
      });
    } catch (error) {
      console.error(
        "[POST /api/admin/users/bulk-role] Transaction error:",
        error,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Toplu rol ataması sırasında hata oluştu",
          details: {
            processed,
            failed,
            errors,
          },
        },
        { status: 500 },
      );
    }

    const duration = Date.now() - startTime;

    // 8. Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: "BULK_ROLE_ASSIGNMENT",
      resource: "User",
      resourceIds: userIds,
      metadata: {
        role,
        processed,
        failed,
        duration,
        errors: errors.length > 0 ? errors : undefined,
        userDetails: existingUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          previousRole: u.role,
          newRole: role,
        })),
      },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    // 9. Invalidate cache
    revalidateTag("users");

    // 10. Return response
    const success = failed === 0;
    const message = success
      ? `${processed} kullanıcının rolü başarıyla güncellendi`
      : `${processed} kullanıcının rolü güncellendi, ${failed} başarısız`;

    return NextResponse.json(
      {
        success,
        processed,
        failed,
        errors,
        message,
        duration,
      },
      { status: success ? 200 : 207 }, // 207 Multi-Status for partial success
    );
  } catch (error) {
    console.error("[POST /api/admin/users/bulk-role] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Toplu rol ataması sırasında hata oluştu",
      },
      { status: 500 },
    );
  }
}
