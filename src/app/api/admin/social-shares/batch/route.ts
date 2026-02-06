/**
 * Social Share Batch API
 * POST: Create a batch job for sharing unshared articles
 * GET: Get batch status and list
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { postToFacebook, postToFacebookEN } from "@/lib/social/facebook";
import { postToBluesky } from "@/lib/social/bluesky";
import { postToMastodon } from "@/lib/social/mastodon";
import { postToTumblr } from "@/lib/social/tumblr";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

// Platform posting functions map
const platformPosters: Record<
  string,
  (article: any) => Promise<string | null>
> = {
  FACEBOOK: postToFacebook,
  FACEBOOK_EN: postToFacebookEN,
  BLUESKY: postToBluesky,
  MASTODON: postToMastodon,
  TUMBLR: postToTumblr,
};

// GET: List batches
export async function GET(req: NextRequest) {
  try {
    // Check authentication - support both NextAuth and admin-session JWT
    const session = await auth();
    const adminSession = await getAdminSession();
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batches = await db.socialShareBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Get platform statistics
    const stats = await db.socialShare.groupBy({
      by: ["platform", "status"],
      _count: { id: true },
    });

    // Get total published articles count
    const totalArticles = await db.article.count({
      where: { status: "PUBLISHED" },
    });

    // Transform stats
    const platformStats: Record<string, any> = {};
    stats.forEach((s) => {
      if (!platformStats[s.platform]) {
        platformStats[s.platform] = {
          shared: 0,
          pending: 0,
          failed: 0,
          total: totalArticles,
        };
      }
      if (s.status === "SHARED") {
        platformStats[s.platform].shared = s._count.id;
      } else if (s.status === "PENDING" || s.status === "SCHEDULED") {
        platformStats[s.platform].pending += s._count.id;
      } else if (s.status === "FAILED") {
        platformStats[s.platform].failed = s._count.id;
      }
    });

    // Calculate unshared for each platform
    Object.keys(platformStats).forEach((platform) => {
      const stat = platformStats[platform];
      stat.unshared = totalArticles - stat.shared - stat.pending - stat.failed;
    });

    return NextResponse.json({
      batches,
      stats: platformStats,
      totalArticles,
    });
  } catch (error) {
    console.error("Batch list error:", error);
    return NextResponse.json(
      { error: "Batch listesi alınamadı" },
      { status: 500 },
    );
  }
}

// POST: Create and optionally start a batch
export async function POST(req: NextRequest) {
  try {
    // Check authentication - support both NextAuth and admin-session JWT
    const session = await auth();
    const adminSession = await getAdminSession();
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      platform,
      language = "tr",
      batchSize = 10,
      intervalMinutes = 5,
      executeNow = false,
    } = body;

    if (!platform) {
      return NextResponse.json({ error: "Platform gerekli" }, { status: 400 });
    }

    // Validate platform
    const validPlatforms = [
      "FACEBOOK",
      "FACEBOOK_EN",
      "BLUESKY",
      "MASTODON",
      "TUMBLR",
    ];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: "Geçersiz platform" }, { status: 400 });
    }

    // Find unshared articles for this platform
    // Articles that don't have a share record or have PENDING/FAILED status
    const sharedArticleIds = await db.socialShare.findMany({
      where: {
        platform,
        language,
        status: "SHARED",
      },
      select: { articleId: true },
    });

    const sharedIds = sharedArticleIds.map((s) => s.articleId);

    const unsharedArticles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        id: { notIn: sharedIds },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        category: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: batchSize,
    });

    if (unsharedArticles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Bu platform için paylaşılmamış haber bulunamadı",
        created: 0,
      });
    }

    // Create batch record
    const batch = await db.socialShareBatch.create({
      data: {
        platform,
        language,
        batchSize,
        intervalMinutes,
        totalItems: unsharedArticles.length,
        status: executeNow ? "PROCESSING" : "PENDING",
        startedAt: executeNow ? new Date() : null,
      },
    });

    // Create share records for each article
    await db.socialShare.createMany({
      data: unsharedArticles.map((article) => ({
        articleId: article.id,
        platform,
        language,
        status: executeNow ? "PROCESSING" : "SCHEDULED",
        scheduledAt: new Date(),
      })),
      skipDuplicates: true,
    });

    // If executeNow, process the batch immediately
    if (executeNow) {
      const results = await processBatch(
        batch.id,
        platform,
        unsharedArticles,
        intervalMinutes,
      );

      // Update batch status
      await db.socialShareBatch.update({
        where: { id: batch.id },
        data: {
          status: "COMPLETED",
          processedItems: results.success,
          failedItems: results.failed,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        batchId: batch.id,
        processed: results.success,
        failed: results.failed,
        message: `${results.success} haber paylaşıldı, ${results.failed} başarısız`,
      });
    }

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      totalItems: unsharedArticles.length,
      message: `${unsharedArticles.length} haber için batch oluşturuldu`,
    });
  } catch (error) {
    console.error("Batch create error:", error);
    return NextResponse.json(
      { error: "Batch oluşturulamadı" },
      { status: 500 },
    );
  }
}

// Process batch - share articles to platform
async function processBatch(
  batchId: string,
  platform: string,
  articles: any[],
  intervalMinutes: number,
): Promise<{ success: number; failed: number }> {
  const poster = platformPosters[platform];
  if (!poster) {
    console.error(`No poster found for platform: ${platform}`);
    return { success: 0, failed: articles.length };
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    try {
      console.log(
        `[Batch ${batchId}] Sharing ${i + 1}/${articles.length}: ${article.title}`,
      );

      const postId = await poster({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        imageUrl: article.imageUrl,
        categoryName: article.category?.name,
      });

      if (postId) {
        // Update share record as successful
        await db.socialShare.updateMany({
          where: {
            articleId: article.id,
            platform: platform as any,
          },
          data: {
            status: "SHARED",
            postId,
            sharedAt: new Date(),
            error: null,
          },
        });
        success++;
        console.log(`   ✅ Shared: ${postId}`);
      } else {
        // Mark as failed
        await db.socialShare.updateMany({
          where: {
            articleId: article.id,
            platform: platform as any,
          },
          data: {
            status: "FAILED",
            error: "No post ID returned",
            retryCount: { increment: 1 },
          },
        });
        failed++;
        console.log(`   ❌ Failed: No post ID`);
      }

      // Wait between posts to avoid rate limiting (except for last item)
      if (i < articles.length - 1 && intervalMinutes > 0) {
        const waitMs = Math.min(intervalMinutes * 60 * 1000, 30000); // Max 30 seconds for API timeout
        console.log(`   ⏳ Waiting ${waitMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    } catch (error: any) {
      console.error(`   ❌ Error sharing:`, error?.message);

      await db.socialShare.updateMany({
        where: {
          articleId: article.id,
          platform: platform as any,
        },
        data: {
          status: "FAILED",
          error: error?.message || "Unknown error",
          retryCount: { increment: 1 },
        },
      });
      failed++;
    }
  }

  return { success, failed };
}
