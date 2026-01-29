import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/articles/bulk
 *
 * Bulk operations for articles
 *
 * Actions:
 * - publish: Publish selected articles
 * - unpublish: Unpublish selected articles
 * - delete: Delete selected articles
 * - changeCategory: Change category for selected articles
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, ids, categoryId } = body;

    // Validation
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "action and ids[] are required" },
        { status: 400 },
      );
    }

    let result;

    switch (action) {
      case "publish":
        result = await prisma.article.updateMany({
          where: { id: { in: ids } },
          data: { status: "PUBLISHED", updatedAt: new Date() },
        });
        break;

      case "unpublish":
        result = await prisma.article.updateMany({
          where: { id: { in: ids } },
          data: { status: "DRAFT", updatedAt: new Date() },
        });
        break;

      case "delete":
        // Soft delete (set status to DELETED or hard delete)
        result = await prisma.article.deleteMany({
          where: { id: { in: ids } },
        });
        break;

      case "changeCategory":
        if (!categoryId) {
          return NextResponse.json(
            { error: "categoryId is required for changeCategory action" },
            { status: 400 },
          );
        }

        result = await prisma.article.updateMany({
          where: { id: { in: ids } },
          data: { categoryId, updatedAt: new Date() },
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      action,
      count: result.count,
      message: `${result.count} articles ${action}ed successfully`,
    });
  } catch (error) {
    console.error("[BULK_ARTICLES_ERROR]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
