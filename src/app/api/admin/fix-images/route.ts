import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop";

/**
 * Fix articles with broken local image paths
 * Replaces /images/... paths with fallback Unsplash image
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find articles with local image paths that may be broken
    const brokenArticles = await db.article.findMany({
      where: {
        OR: [
          { imageUrl: { startsWith: "/images/" } },
          { imageUrlMedium: { startsWith: "/images/" } },
          { imageUrlSmall: { startsWith: "/images/" } },
          { imageUrlThumb: { startsWith: "/images/" } },
        ],
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        imageUrlMedium: true,
        imageUrlSmall: true,
        imageUrlThumb: true,
      },
    });

    if (brokenArticles.length === 0) {
      return NextResponse.json({
        message: "No articles with broken local image paths found",
        fixed: 0,
      });
    }

    // Update each article with fallback image
    const updates = await Promise.all(
      brokenArticles.map(async (article) => {
        const updateData: Record<string, string> = {};

        if (article.imageUrl?.startsWith("/images/")) {
          updateData.imageUrl = FALLBACK_IMAGE;
        }
        if (article.imageUrlMedium?.startsWith("/images/")) {
          updateData.imageUrlMedium = FALLBACK_IMAGE;
        }
        if (article.imageUrlSmall?.startsWith("/images/")) {
          updateData.imageUrlSmall = FALLBACK_IMAGE;
        }
        if (article.imageUrlThumb?.startsWith("/images/")) {
          updateData.imageUrlThumb = FALLBACK_IMAGE;
        }

        if (Object.keys(updateData).length > 0) {
          await db.article.update({
            where: { id: article.id },
            data: updateData,
          });
          return { id: article.id, title: article.title, fixed: true };
        }
        return { id: article.id, title: article.title, fixed: false };
      }),
    );

    const fixedCount = updates.filter((u) => u.fixed).length;

    return NextResponse.json({
      message: `Fixed ${fixedCount} articles with broken local image paths`,
      fixed: fixedCount,
      articles: updates.filter((u) => u.fixed),
    });
  } catch (error) {
    console.error("Fix images error:", error);
    return NextResponse.json(
      { error: "Failed to fix images" },
      { status: 500 },
    );
  }
}

/**
 * GET: Check for articles with broken local image paths
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brokenArticles = await db.article.findMany({
      where: {
        OR: [
          { imageUrl: { startsWith: "/images/" } },
          { imageUrlMedium: { startsWith: "/images/" } },
          { imageUrlSmall: { startsWith: "/images/" } },
          { imageUrlThumb: { startsWith: "/images/" } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      count: brokenArticles.length,
      articles: brokenArticles,
    });
  } catch (error) {
    console.error("Check images error:", error);
    return NextResponse.json(
      { error: "Failed to check images" },
      { status: 500 },
    );
  }
}
