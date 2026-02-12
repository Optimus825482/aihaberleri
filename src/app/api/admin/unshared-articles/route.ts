/**
 * Unshared Articles API
 * GET: List articles that are missing social shares on one or more platforms
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALL_PLATFORMS = [
  "FACEBOOK",
  "FACEBOOK_EN",
  "BLUESKY",
  "BLUESKY_EN",
  "MASTODON",
  "MASTODON_EN",
] as const;

export async function GET(req: NextRequest) {
  try {
    const [session, adminSession] = await Promise.all([
      auth(),
      getAdminSession(),
    ]);
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");
    const search = searchParams.get("search") || null;
    const filterPlatform = searchParams.get("platform") || null;
    const skip = (page - 1) * limit;

    // Get all published TR articles with their shares
    const whereClause: any = {
      status: "PUBLISHED",
      language: "tr",
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const totalAll = await db.article.count({ where: whereClause });

    const articles = await db.article.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
        publishedAt: true,
        category: { select: { name: true } },
        translations: {
          where: { locale: "en" },
          select: { title: true, slug: true },
        },
        socialShares: {
          where: { status: "SHARED" },
          select: { platform: true, language: true },
        },
      },
      orderBy: { publishedAt: "asc" },
    });

    // Filter to only articles missing at least one platform share
    const unsharedArticles = articles
      .map((article) => {
        const sharedSet = new Set(
          article.socialShares.map((s) => {
            // Handle legacy data: if platform doesn't end with _EN but language is "en"
            if (!s.platform.endsWith("_EN") && s.language === "en") {
              return `${s.platform}_EN`;
            }
            return s.platform;
          }),
        );

        const hasEN = article.translations.length > 0;
        const missingPlatforms = ALL_PLATFORMS.filter((p) => {
          // Skip EN platforms if no EN translation
          if (p.endsWith("_EN") && !hasEN) return false;
          return !sharedSet.has(p);
        });

        if (missingPlatforms.length === 0) return null;

        // If filtering by platform, only include if that platform is missing
        if (
          filterPlatform &&
          !missingPlatforms.includes(filterPlatform as any)
        ) {
          return null;
        }

        return {
          id: article.id,
          title: article.title,
          slug: article.slug,
          imageUrl: article.imageUrl,
          publishedAt: article.publishedAt,
          category: article.category?.name || "-",
          hasEN,
          missingPlatforms,
          sharedPlatforms: Array.from(sharedSet),
        };
      })
      .filter(Boolean);

    const total = unsharedArticles.length;
    const paginated = unsharedArticles.slice(skip, skip + limit);

    // Platform summary stats
    const platformSummary: Record<string, number> = {};
    ALL_PLATFORMS.forEach((p) => {
      platformSummary[p] = unsharedArticles.filter((a) =>
        a!.missingPlatforms.includes(p),
      ).length;
    });

    return NextResponse.json({
      articles: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: {
        totalPublished: totalAll,
        totalUnshared: total,
        byPlatform: platformSummary,
      },
    });
  } catch (error) {
    console.error("Unshared articles fetch error:", error);
    return NextResponse.json({ error: "Veriler alınamadı" }, { status: 500 });
  }
}
