import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { optimizeAndGenerateSizes } from "@/lib/image-optimizer";

/**
 * Check if R2 is properly configured
 */
function checkR2Config(): { configured: boolean; missing: string[] } {
  const required = [
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
  ];
  const missing = required.filter((key) => !process.env[key]);
  return {
    configured: missing.length === 0,
    missing,
  };
}

/**
 * POST /api/admin/migrate-images
 * Migrate Pollinations.ai images to R2 storage
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check R2 configuration BEFORE processing
  const r2Config = checkR2Config();
  if (!r2Config.configured) {
    console.error("❌ R2 not configured. Missing env vars:", r2Config.missing);
    return NextResponse.json(
      {
        error: "R2 storage not configured",
        details: `Missing environment variables: ${r2Config.missing.join(", ")}`,
        hint: "Set these in Coolify Dashboard → Environment Variables, then Redeploy",
      },
      { status: 503 },
    );
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
 * Check if an R2 URL exists (HEAD request)
 */
async function checkR2UrlExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/migrate-images
 * Get count of articles needing migration
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Action: Check for broken R2 URLs
  if (action === "check-broken") {
    try {
      const r2Articles = await db.article.findMany({
        where: {
          imageUrl: {
            contains: "r2.dev",
          },
        },
        select: {
          id: true,
          slug: true,
          imageUrl: true,
        },
        take: 20, // Check 20 at a time
      });

      const brokenArticles: { slug: string; imageUrl: string }[] = [];

      for (const article of r2Articles) {
        if (!article.imageUrl) continue;
        const exists = await checkR2UrlExists(article.imageUrl);
        if (!exists) {
          brokenArticles.push({
            slug: article.slug,
            imageUrl: article.imageUrl,
          });
        }
      }

      return NextResponse.json({
        success: true,
        checked: r2Articles.length,
        broken: brokenArticles.length,
        brokenArticles,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Check failed" },
        { status: 500 },
      );
    }
  }

  // Action: Fix broken R2 URLs (set to null so they get regenerated)
  if (action === "fix-broken") {
    try {
      const r2Articles = await db.article.findMany({
        where: {
          imageUrl: {
            contains: "r2.dev",
          },
        },
        select: {
          id: true,
          slug: true,
          imageUrl: true,
        },
        take: 20,
      });

      let fixedCount = 0;

      for (const article of r2Articles) {
        if (!article.imageUrl) continue;
        const exists = await checkR2UrlExists(article.imageUrl);
        if (!exists) {
          // Reset to placeholder - will need manual migration later
          await db.article.update({
            where: { id: article.id },
            data: {
              imageUrl: "/images/placeholder.webp",
              imageUrlMedium: null,
              imageUrlSmall: null,
              imageUrlThumb: null,
            },
          });
          fixedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        fixed: fixedCount,
        message: `Reset ${fixedCount} broken R2 URLs to placeholder`,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Fix failed" },
        { status: 500 },
      );
    }
  }

  // Action: Update R2 URLs to new domain
  if (action === "update-domain") {
    try {
      const oldDomain =
        searchParams.get("old") ||
        "pub-32620931b6ce48bca2549881c536b806.r2.dev";
      const newDomain =
        searchParams.get("new") ||
        process.env.R2_PUBLIC_URL?.replace("https://", "");

      if (!newDomain) {
        return NextResponse.json(
          {
            error:
              "New domain not specified. Set R2_PUBLIC_URL or pass ?new=domain",
          },
          { status: 400 },
        );
      }

      // Update all articles with old R2 domain
      const result = await db.$executeRaw`
        UPDATE "Article" 
        SET 
          "imageUrl" = REPLACE("imageUrl", ${oldDomain}, ${newDomain}),
          "imageUrlMedium" = REPLACE("imageUrlMedium", ${oldDomain}, ${newDomain}),
          "imageUrlSmall" = REPLACE("imageUrlSmall", ${oldDomain}, ${newDomain}),
          "imageUrlThumb" = REPLACE("imageUrlThumb", ${oldDomain}, ${newDomain})
        WHERE "imageUrl" LIKE ${"%" + oldDomain + "%"}
      `;

      return NextResponse.json({
        success: true,
        updated: result,
        message: `Updated URLs from ${oldDomain} to ${newDomain}`,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Update failed" },
        { status: 500 },
      );
    }
  }

  // Default: Count pending migrations
  try {
    const pollinationsCount = await db.article.count({
      where: {
        imageUrl: {
          contains: "pollinations.ai",
        },
      },
    });

    const r2Count = await db.article.count({
      where: {
        imageUrl: {
          contains: "r2.dev",
        },
      },
    });

    const placeholderCount = await db.article.count({
      where: {
        OR: [{ imageUrl: { contains: "placeholder" } }, { imageUrl: null }],
      },
    });

    return NextResponse.json({
      success: true,
      pendingMigration: pollinationsCount,
      r2Images: r2Count,
      placeholderImages: placeholderCount,
      hint: "Use ?action=check-broken to find R2 URLs that don't exist, ?action=fix-broken to reset them",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to count" },
      { status: 500 },
    );
  }
}
