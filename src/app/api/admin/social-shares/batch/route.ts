/**
 * Social Share Batch API
 * POST: Create a batch job for sharing unshared articles (runs in background)
 * GET: Get batch status and list with progress
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  addSocialBatchJob,
  getSocialBatchProgress,
  cancelSocialBatchJob,
} from "@/lib/queue";

export const dynamic = "force-dynamic";

// Valid platforms (TR and EN versions)
const validPlatforms = [
  "FACEBOOK",
  "FACEBOOK_EN",
  "BLUESKY",
  "BLUESKY_EN",
  "MASTODON",
  "MASTODON_EN",
];

// GET: List batches with progress
export async function GET(req: NextRequest) {
  try {
    // Check authentication - support both NextAuth and admin-session JWT
    const [session, adminSession] = await Promise.all([
      auth(),
      getAdminSession(),
    ]);
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get batch ID from query if checking specific progress
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");

    if (batchId) {
      // Get specific batch progress from BullMQ
      const progress = await getSocialBatchProgress(batchId);
      const batch = await db.socialShareBatch.findUnique({
        where: { id: batchId },
      });

      return NextResponse.json({
        batch,
        progress,
      });
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
      } else if (
        s.status === "PENDING" ||
        s.status === "SCHEDULED" ||
        s.status === "PROCESSING"
      ) {
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

    // Check for active batches
    const activeBatch = batches.find((b) => b.status === "PROCESSING");
    let activeProgress = null;
    if (activeBatch) {
      activeProgress = await getSocialBatchProgress(activeBatch.id);
    }

    return NextResponse.json({
      batches,
      stats: platformStats,
      totalArticles,
      activeBatch: activeBatch
        ? {
            ...activeBatch,
            progress: activeProgress,
          }
        : null,
    });
  } catch (error) {
    console.error("Batch list error:", error);
    return NextResponse.json(
      { error: "Batch listesi alınamadı" },
      { status: 500 },
    );
  }
}

// POST: Create and start a batch job in background
export async function POST(req: NextRequest) {
  try {
    // Check authentication - support both NextAuth and admin-session JWT
    const [session, adminSession] = await Promise.all([
      auth(),
      getAdminSession(),
    ]);
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      platforms = [
        "FACEBOOK",
        "FACEBOOK_EN",
        "BLUESKY",
        "BLUESKY_EN",
        "MASTODON",
        "MASTODON_EN",
      ], // All platforms by default (TR + EN)
      batchSize = 50, // Increased default batch size
      intervalSeconds = 10, // Default 10 seconds between articles
      articleIds, // Optional selected article IDs
    } = body;

    // Validate platforms
    const invalidPlatforms = platforms.filter(
      (p: string) => !validPlatforms.includes(p),
    );
    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Geçersiz platformlar: ${invalidPlatforms.join(", ")}` },
        { status: 400 },
      );
    }

    // Check if there's already an active batch with overlapping platforms
    const activeBatches = await db.socialShareBatch.findMany({
      where: { status: "PROCESSING" },
    });

    if (activeBatches.length > 0) {
      // Check for platform overlap
      const activePlatforms = new Set<string>();
      activeBatches.forEach((batch) => {
        batch.platform.split(",").forEach((p) => activePlatforms.add(p.trim()));
      });

      const overlappingPlatforms = platforms.filter((p: string) =>
        activePlatforms.has(p),
      );

      if (overlappingPlatforms.length > 0) {
        return NextResponse.json(
          {
            error: `Bu platformlar için zaten aktif batch çalışıyor: ${overlappingPlatforms.join(", ")}`,
            activeBatchIds: activeBatches.map((b) => b.id),
          },
          { status: 400 },
        );
      }
      // Different platforms - allow parallel batch
      console.log(
        `📤 Allowing parallel batch. Active: ${activeBatches.length}, New platforms: ${platforms.join(", ")}`,
      );
    }

    let actualBatchSize = batchSize;
    let totalItems = 0;
    let unsharedCount = 0;

    // Different logic for selective vs automatic batch
    if (articleIds && Array.isArray(articleIds) && articleIds.length > 0) {
      // Selective Mode (Manual Selection)
      actualBatchSize = articleIds.length;
      totalItems = articleIds.length * platforms.length;

      // Verify articles exist (optional, but good practice)
      const existingCount = await db.article.count({
        where: { id: { in: articleIds } },
      });

      if (existingCount === 0) {
        return NextResponse.json(
          {
            error: "Selected articles not found",
          },
          { status: 404 },
        );
      }

      unsharedCount = existingCount; // Used for message
    } else {
      // Automatic Mode (Find unshared)
      // Count unshared articles (based on TR platform - base check)
      const sharedArticleIds = await db.socialShare.findMany({
        where: {
          platform: { in: platforms },
          language: "tr",
          status: "SHARED",
        },
        select: { articleId: true },
      });

      const sharedIds = [...new Set(sharedArticleIds.map((s) => s.articleId))];

      unsharedCount = await db.article.count({
        where: {
          status: "PUBLISHED",
          id: { notIn: sharedIds },
        },
      });

      if (unsharedCount === 0) {
        return NextResponse.json({
          success: true,
          message: "Paylaşılmamış haber bulunamadı",
          created: 0,
        });
      }

      totalItems = Math.min(unsharedCount, batchSize) * platforms.length;
      actualBatchSize = batchSize;
    }

    // Create batch record
    const batch = await db.socialShareBatch.create({
      data: {
        platform: platforms.join(","), // Store all platforms
        language: "tr,en", // Both languages
        batchSize: actualBatchSize,
        intervalMinutes: intervalSeconds / 60, // Convert to minutes for storage
        totalItems: totalItems,
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    // Add job to BullMQ queue - runs in background even if page is closed
    const jobResult = await addSocialBatchJob({
      batchId: batch.id,
      platforms,
      intervalSeconds,
      batchSize: actualBatchSize,
      articleIds: articleIds && articleIds.length > 0 ? articleIds : undefined,
    });

    if (!jobResult) {
      // Queue not available, update batch as failed
      await db.socialShareBatch.update({
        where: { id: batch.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
      });

      return NextResponse.json(
        { error: "Job kuyruğu kullanılamıyor. Worker çalışıyor mu?" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      jobId: jobResult.jobId,
      totalArticles: Math.min(unsharedCount, batchSize),
      platforms,
      intervalSeconds,
      message: `Batch başlatıldı! ${Math.min(unsharedCount, actualBatchSize)} haber, ${platforms.length} platform. Her ${intervalSeconds} saniyede bir paylaşılacak. Sayfa kapatılsa bile arka planda çalışmaya devam edecek.`,
    });
  } catch (error) {
    console.error("Batch create error:", error);
    return NextResponse.json(
      { error: "Batch oluşturulamadı" },
      { status: 500 },
    );
  }
}

// DELETE: Cancel an active batch
export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const [session, adminSession] = await Promise.all([
      auth(),
      getAdminSession(),
    ]);
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json({ error: "Batch ID gerekli" }, { status: 400 });
    }

    // Get the batch
    const batch = await db.socialShareBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch bulunamadı" }, { status: 404 });
    }

    if (batch.status !== "PROCESSING") {
      return NextResponse.json(
        { error: "Sadece çalışan batch iptal edilebilir" },
        { status: 400 },
      );
    }

    // Cancel the job in queue
    const cancelResult = await cancelSocialBatchJob(batchId);

    // Update batch status regardless
    await db.socialShareBatch.update({
      where: { id: batchId },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Batch iptal edildi",
      cancelResult,
    });
  } catch (error) {
    console.error("Batch cancel error:", error);
    return NextResponse.json(
      { error: "Batch iptal edilemedi" },
      { status: 500 },
    );
  }
}
