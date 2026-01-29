import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  scheduleArticle,
  cancelScheduledPublish,
} from "@/lib/scheduled-publisher";

/**
 * POST /api/admin/articles/[id]/schedule
 * Schedule article for future publishing
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.EDIT_ARTICLE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { publishAt } = await req.json();

    if (!publishAt) {
      return NextResponse.json(
        { error: "publishAt is required" },
        { status: 400 },
      );
    }

    const publishDate = new Date(publishAt);

    // Validate future date
    if (publishDate <= new Date()) {
      return NextResponse.json(
        { error: "Publish date must be in the future" },
        { status: 400 },
      );
    }

    const article = await scheduleArticle(
      params.id,
      publishDate,
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      article,
      message: "Article scheduled successfully",
    });
  } catch (error) {
    console.error("[SCHEDULE_ARTICLE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/articles/[id]/schedule
 * Cancel scheduled publishing
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.EDIT_ARTICLE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const article = await cancelScheduledPublish(params.id, session.user.id);

    return NextResponse.json({
      success: true,
      article,
      message: "Schedule cancelled successfully",
    });
  } catch (error) {
    console.error("[CANCEL_SCHEDULE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
