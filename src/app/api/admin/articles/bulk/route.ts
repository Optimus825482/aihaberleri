/**
 * Bulk Article Operations API
 *
 * POST /api/admin/articles/bulk
 *
 * Toplu makale işlemleri: yayınla, yayından kaldır, sil, kategori değiştir
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getCache } from "@/lib/cache";
import { createAuditLog } from "@/lib/audit-logger";
import {
  BulkActionSchema,
  formatZodError,
  safeValidateRequest,
} from "@/lib/validation/admin";
import {
  bulkRateLimit,
  getClientIdentifier,
  checkRateLimit,
} from "@/lib/rate-limiter";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

    // 2. Rate limiting check (5 requests per minute)
    const identifier = getClientIdentifier(request);
    const rateLimitResponse = await checkRateLimit(bulkRateLimit, identifier);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validation = safeValidateRequest(BulkActionSchema, body);

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

    const { action, ids, categoryId } = validation.data;

    // 4. Execute bulk operation
    let processed = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Use transaction for data consistency
    await db.$transaction(async (tx) => {
      for (const id of ids) {
        try {
          switch (action) {
            case "publish":
              await tx.article.update({
                where: { id },
                data: {
                  status: "PUBLISHED",
                  publishedAt: new Date(),
                },
              });
              processed++;
              break;

            case "unpublish":
              await tx.article.update({
                where: { id },
                data: {
                  status: "DRAFT",
                },
              });
              processed++;
              break;

            case "delete":
              await tx.article.delete({
                where: { id },
              });
              processed++;
              break;

            case "changeCategory":
              if (!categoryId) {
                throw new Error("categoryId gerekli");
              }
              await tx.article.update({
                where: { id },
                data: {
                  categoryId,
                },
              });
              processed++;
              break;

            default:
              throw new Error(`Geçersiz işlem: ${action}`);
          }
        } catch (error) {
          failed++;
          errors.push({
            id,
            error: error instanceof Error ? error.message : "Bilinmeyen hata",
          });
          console.error(`[BULK] Failed to ${action} article ${id}:`, error);
        }
      }
    });

    // 5. Invalidate cache
    const cache = getCache();
    await cache.invalidateByTag("articles");

    // 6. Create audit log
    const auditAction = {
      publish: "BULK_PUBLISH_ARTICLES",
      unpublish: "BULK_UNPUBLISH_ARTICLES",
      delete: "BULK_DELETE_ARTICLES",
      changeCategory: "BULK_CHANGE_CATEGORY",
    }[action] as any;

    await createAuditLog({
      userId: session.user.id!,
      action: auditAction,
      resource: "Article",
      resourceIds: ids,
      metadata: {
        action,
        processed,
        failed,
        categoryId,
        duration: Date.now() - startTime,
      },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    // 7. Generate success message
    const actionMessages = {
      publish: "yayınlandı",
      unpublish: "yayından kaldırıldı",
      delete: "silindi",
      changeCategory: "kategorisi değiştirildi",
    };

    const message =
      failed === 0
        ? `${processed} makale başarıyla ${actionMessages[action]}`
        : `${processed} makale ${actionMessages[action]}, ${failed} makale başarısız`;

    // 8. Return response
    return NextResponse.json({
      success: true,
      processed,
      failed,
      errors,
      message,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[BULK] Bulk operation error:", error);

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
