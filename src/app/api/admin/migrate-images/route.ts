import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { optimizeAndGenerateSizes } from "@/lib/image-optimizer";

/**
 * POST /api/admin/migrate-images
 * Migrate Pollinations.ai images to R2 storage
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { limit = 10 } = await request.json().catch(() => ({}));

    // Find articles with Pollinations.ai URLs
    const articles = await db.article.findMany({
      where: {
        imageUrl: {
          contains: "pollinations.ai",
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        imageUrl: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No articles with Pollinations.ai images found",
        migrated: 0,
        remaining: 0,
      });
    }

    const results: { slug: string; success: boolean; error?: string }[] = [];

    for (const article of articles) {
      if (!article.imageUrl) continue;

      try {
        // Generate optimized images and upload to R2
        const imageSizes = await optimizeAndGenerateSizes(
          article.imageUrl,
          article.slug,
        );

        // Update the article with new R2 URLs
        await db.article.update({
          where: { id: article.id },
          data: {
            imageUrl: imageSizes.large,
            imageUrlMedium: imageSizes.medium,
            imageUrlSmall: imageSizes.small,
            imageUrlThumb: imageSizes.thumb,
          },
        });

        results.push({ slug: article.slug, success: true });
      } catch (error) {
        results.push({
          slug: article.slug,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // Count remaining
    const remainingCount = await db.article.count({
      where: {
        imageUrl: {
          contains: "pollinations.ai",
        },
      },
    });

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Migrated ${successCount}/${articles.length} images`,
      migrated: successCount,
      failed: results.filter((r) => !r.success).length,
      remaining: remainingCount,
      details: results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/migrate-images
 * Get count of articles needing migration
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await db.article.count({
      where: {
        imageUrl: {
          contains: "pollinations.ai",
        },
      },
    });

    return NextResponse.json({
      success: true,
      pendingMigration: count,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to count" },
      { status: 500 },
    );
  }
}
