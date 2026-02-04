/**
 * Bulk SEO Optimization API
 * POST /api/admin/seo/bulk-optimize
 *
 * Toplu SEO optimizasyonu başlatır (queue'ya job ekler)
 *
 * Security:
 * - Fix #14: Rate limiting (10 req/min)
 * - Fix #15: Input validation (Zod schema)
 * - Fix #16: SQL injection prevention (Prisma parameterized queries)
 */

import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@prisma/client";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";
import { nanoid } from "nanoid";
import { withSecurity, auditLog } from "@/middleware/security";
import {
  bulkOptimizeSchema,
  validateRequest,
  createValidationErrorResponse,
} from "@/lib/validation-schemas";

export async function POST(request: NextRequest) {
  // Apply security middleware (rate limiting + input sanitization)
  return withSecurity(request, "bulkOptimize", async (req) => {
    // Authentication & Authorization check - ADMIN only
    const authResult = await withAuth(req, {
      roles: [Role.ADMIN],
    });

    if (authResult instanceof NextResponse) {
      await auditLog(req, "bulk-optimize", "failure", {
        reason: "unauthorized",
      });
      return authResult;
    }

    try {
      // Validate request body with Zod schema (Fix #15)
      const validation = await validateRequest(req, bulkOptimizeSchema);

      if (!validation.success) {
        await auditLog(req, "bulk-optimize", "failure", {
          reason: "validation-error",
          errors: validation.error.issues,
        });
        return createValidationErrorResponse(validation.error);
      }

      const { articleIds } = validation.data;

      // Get SEO optimization queue
      const queue = getQueue(QUEUE_NAMES.SEO_OPTIMIZATION);
      if (!queue) {
        await auditLog(req, "bulk-optimize", "failure", {
          reason: "queue-unavailable",
        });
        return NextResponse.json(
          { error: "SEO optimization queue not available" },
          { status: 503 },
        );
      }

      // Generate unique job ID
      const jobId = nanoid();

      // Add job to queue
      const job = await queue.add(
        "bulk-optimize",
        {
          articleIds,
          jobId,
          batchSize: 10, // Default batch size
        },
        {
          jobId: `seo-optimize-${jobId}`,
          removeOnComplete: {
            count: 100,
            age: 24 * 3600, // 24 hours
          },
          removeOnFail: {
            count: 50,
          },
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        },
      );

      await auditLog(req, "bulk-optimize", "success", {
        jobId,
        articleCount: articleIds.length,
      });

      return NextResponse.json(
        {
          success: true,
          jobId,
          bullJobId: job.id,
          status: "queued",
          message: `${articleIds.length} makale optimizasyon kuyruğuna eklendi`,
          progress: {
            current: 0,
            total: articleIds.length,
            percentage: 0,
          },
        },
        { status: 202 }, // Accepted
      );
    } catch (error) {
      console.error("Bulk optimize error:", error);

      await auditLog(req, "bulk-optimize", "failure", {
        reason: "internal-error",
        error: error instanceof Error ? error.message : "unknown",
      });

      return NextResponse.json(
        {
          error: "Internal server error",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
        { status: 500 },
      );
    }
  });
}

// GET method to check queue status
export async function GET(request: NextRequest) {
  // Authentication & Authorization check - ADMIN only
  const authResult = await withAuth(request, {
    roles: [Role.ADMIN],
    skipCSRF: true, // GET request
  });

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Auth check (REMOVED - now handled by withAuth)
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const queue = getQueue(QUEUE_NAMES.SEO_OPTIMIZATION);
    if (!queue) {
      return NextResponse.json(
        { error: "SEO optimization queue not available" },
        { status: 503 },
      );
    }

    // Get queue stats
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return NextResponse.json({
      success: true,
      queue: {
        name: QUEUE_NAMES.SEO_OPTIMIZATION,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      },
    });
  } catch (error) {
    console.error("Queue status error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
