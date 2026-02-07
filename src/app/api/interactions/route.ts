import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const { articleId, type, value } = await req.json();

    if (!articleId || !type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Rate limiting: Check if IP has already interacted recently (for likes)
    // For ratings, allow update
    const headersList = await headers();
    // Get IP address more robustly
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

    const existingInteraction = await db.articleInteraction.findFirst({
      where: {
        articleId,
        ipAddress: ip,
        type,
      },
    });

    if (existingInteraction) {
      // If user already interacted

      if (type === "LIKE") {
        // User toggling like? Or preventing double like?
        // For now, let's treat it as "already liked", prevent simplistic spam.
        // Or better: toggle it. delete interaction if exists?
        // The requirement says "Like feature like YouTube". You can unlike.

        await db.articleInteraction.delete({
          where: { id: existingInteraction.id },
        });

        // Decrement logic below via count
      } else if (type === "RATING") {
        // Update rating
        await db.articleInteraction.update({
          where: { id: existingInteraction.id },
          data: { value: Number(value) },
        });
      }
    } else {
      // Create new interaction
      await db.articleInteraction.create({
        data: {
          articleId,
          type,
          value: type === "RATING" ? Number(value) : null,
          ipAddress: ip,
          userAgent: headersList.get("user-agent"),
        },
      });
    }

    // Now update article aggregates
    if (type === "LIKE") {
      const likeCount = await db.articleInteraction.count({
        where: { articleId, type: "LIKE" },
      });

      const updatedArticle = await db.article.update({
        where: { id: articleId },
        data: { likes: likeCount },
        select: { likes: true },
      });

      return NextResponse.json({
        likes: updatedArticle.likes,
        hasLiked: !existingInteraction,
      });
    }

    if (type === "RATING") {
      const ratings = await db.articleInteraction.aggregate({
        where: { articleId, type: "RATING" },
        _avg: { value: true },
        _count: { value: true },
      });

      const newRating = ratings._avg.value || 0;
      const newCount = ratings._count.value || 0;

      await db.article.update({
        where: { id: articleId },
        data: {
          rating: newRating,
          ratingCount: newCount,
        },
      });

      return NextResponse.json({ rating: newRating, ratingCount: newCount });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Interaction error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
