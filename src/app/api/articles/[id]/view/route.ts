import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { headers } from "next/headers";

// View tracking with session control
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Get client IP and user agent for session tracking
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0]
      : headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Create a simple session identifier
    const sessionId = `${ip}-${userAgent}`;

    // Check if this session has viewed this article recently (within 5 minutes)
    const recentView = await db.articleView.findFirst({
      where: {
        articleId: id,
        sessionId: sessionId,
        viewedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        },
      },
    });

    // If already viewed recently, don't increment
    if (recentView) {
      return NextResponse.json({
        success: true,
        message: "Already counted",
        incremented: false,
      });
    }

    // Record the view
    await db.articleView.create({
      data: {
        articleId: id,
        sessionId: sessionId,
        viewedAt: new Date(),
      },
    });

    // Increment the view count
    await db.article.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      message: "View counted",
      incremented: true,
    });
  } catch (error) {
    console.error("View tracking error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track view" },
      { status: 500 },
    );
  }
}
