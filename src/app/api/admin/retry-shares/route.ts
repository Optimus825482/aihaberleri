/**
 * Retry Shares API
 * GET: Per-platform per-language breakdown of missing shares
 * POST: Start retry process for specific platform+language combos
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { SocialPlatform } from "@prisma/client";
import {
  recordShareSuccess,
  recordShareFailure,
} from "@/services/social-share.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for serverless

// Platform+Language combos
const PLATFORM_COMBOS = [
  {
    key: "FACEBOOK_tr",
    platform: "FACEBOOK" as SocialPlatform,
    language: "tr",
    label: "Facebook TR",
    icon: "📘",
  },
  {
    key: "FACEBOOK_EN_en",
    platform: "FACEBOOK_EN" as SocialPlatform,
    language: "en",
    label: "Facebook EN",
    icon: "📘",
  },
  {
    key: "BLUESKY_tr",
    platform: "BLUESKY" as SocialPlatform,
    language: "tr",
    label: "Bluesky TR",
    icon: "🦋",
  },
  {
    key: "BLUESKY_EN_en",
    platform: "BLUESKY_EN" as SocialPlatform,
    language: "en",
    label: "Bluesky EN",
    icon: "🦋",
  },
  {
    key: "MASTODON_tr",
    platform: "MASTODON" as SocialPlatform,
    language: "tr",
    label: "Mastodon TR",
    icon: "🐘",
  },
  {
    key: "MASTODON_EN_en",
    platform: "MASTODON_EN" as SocialPlatform,
    language: "en",
    label: "Mastodon EN",
    icon: "🐘",
  },
] as const;

// GET: Detailed per-platform per-language breakdown
export async function GET(req: NextRequest) {
  try {
    const [session, adminSession] = await Promise.all([
      auth(),
      getAdminSession(),
    ]);
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all published TR articles with translations and shares
    const articles = await db.article.findMany({
      where: { status: "PUBLISHED", language: "tr" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
        translations: {
          where: { locale: "en" },
          select: { title: true, slug: true, excerpt: true },
        },
        socialShares: {
          where: { status: "SHARED" },
          select: { platform: true, language: true },
        },
      },
      orderBy: { publishedAt: "asc" },
    });

    // Build per-combo missing articles
    const comboBreakdown: Record<
      string,
      {
        key: string;
        platform: string;
        language: string;
        label: string;
        icon: string;
        missingCount: number;
        articles: Array<{
          id: string;
          title: string;
          slug: string;
          excerpt: string;
          imageUrl: string | null;
          categoryName: string;
          enSlug?: string;
          enTitle?: string;
          enExcerpt?: string;
        }>;
      }
    > = {};

    for (const combo of PLATFORM_COMBOS) {
      comboBreakdown[combo.key] = {
        key: combo.key,
        platform: combo.platform,
        language: combo.language,
        label: combo.label,
        icon: combo.icon,
        missingCount: 0,
        articles: [],
      };
    }

    for (const article of articles) {
      const hasEN = article.translations.length > 0;
      const enTrans = article.translations[0];
      const sharedSet = new Set(
        article.socialShares.map((s) => {
          if (!s.platform.endsWith("_EN") && s.language === "en") {
            return `${s.platform}_EN_${s.language}`;
          }
          return `${s.platform}_${s.language}`;
        }),
      );

      const articleData = {
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || "",
        imageUrl: article.imageUrl,
        categoryName: article.category?.name || "Yapay Zeka",
        ...(hasEN &&
          enTrans && {
            enSlug: enTrans.slug,
            enTitle: enTrans.title,
            enExcerpt: enTrans.excerpt || "",
          }),
      };

      for (const combo of PLATFORM_COMBOS) {
        // Skip EN combos if no EN translation
        if (combo.language === "en" && !hasEN) continue;

        if (!sharedSet.has(combo.key)) {
          comboBreakdown[combo.key].missingCount++;
          comboBreakdown[combo.key].articles.push(articleData);
        }
      }
    }

    // Don't send full article lists in summary — just counts
    const summary = Object.values(comboBreakdown).map(
      ({ articles, ...rest }) => ({
        ...rest,
        articleCount: articles.length,
      }),
    );

    const totalMissing = Object.values(comboBreakdown).reduce(
      (sum, c) => sum + c.missingCount,
      0,
    );

    return NextResponse.json({
      summary,
      totalArticles: articles.length,
      totalMissing,
    });
  } catch (error) {
    console.error("Retry shares GET error:", error);
    return NextResponse.json({ error: "Veriler alınamadı" }, { status: 500 });
  }
}

// POST: Start retry for specific platform+language combos
// Uses existing batch queue system for background processing
export async function POST(req: NextRequest) {
  try {
    const [session, adminSession] = await Promise.all([
      auth(),
      getAdminSession(),
    ]);
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      combos = [], // Array of combo keys like ["BLUESKY_tr", "MASTODON_EN_en"]
      intervalSeconds = 30,
      limit = 9999,
    } = body;

    if (!combos.length) {
      return NextResponse.json(
        { error: "En az bir platform+dil seçin" },
        { status: 400 },
      );
    }

    // Resolve combos to platform names for the batch system
    const platformSet = new Set<string>();
    for (const comboKey of combos) {
      const found = PLATFORM_COMBOS.find((c) => c.key === comboKey);
      if (found) platformSet.add(found.platform);
    }
    const platforms = Array.from(platformSet);

    if (platforms.length === 0) {
      return NextResponse.json(
        { error: "Geçersiz combo seçimi" },
        { status: 400 },
      );
    }

    // Use existing batch system
    const { addSocialBatchJob } = await import("@/lib/queue");

    // Check for active batches
    const activeBatches = await db.socialShareBatch.findMany({
      where: { status: "PROCESSING" },
    });

    if (activeBatches.length > 0) {
      const activePlatforms = new Set<string>();
      activeBatches.forEach((b) =>
        b.platform.split(",").forEach((p) => activePlatforms.add(p.trim())),
      );
      const overlap = platforms.filter((p) => activePlatforms.has(p));
      if (overlap.length > 0) {
        return NextResponse.json(
          {
            error: `Bu platformlar için zaten aktif batch var: ${overlap.join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    // Create batch record
    const batch = await db.socialShareBatch.create({
      data: {
        platform: platforms.join(","),
        language: "tr,en",
        batchSize: limit,
        intervalMinutes: intervalSeconds / 60,
        totalItems: 0, // Will be calculated by worker
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    const jobResult = await addSocialBatchJob({
      batchId: batch.id,
      platforms,
      intervalSeconds,
      batchSize: limit,
    });

    if (!jobResult) {
      await db.socialShareBatch.update({
        where: { id: batch.id },
        data: { status: "FAILED", completedAt: new Date() },
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
      platforms,
      intervalSeconds,
      message: `Retry başlatıldı! ${platforms.length} platform, ${intervalSeconds}s aralıkla.`,
    });
  } catch (error) {
    console.error("Retry shares POST error:", error);
    return NextResponse.json({ error: "Retry başlatılamadı" }, { status: 500 });
  }
}
