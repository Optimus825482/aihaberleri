/**
 * Social Shares API
 * GET: List articles with social share status
 * POST: Create share records for unshared articles
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  buildAdminShareMap,
  getEffectiveShareStatus,
  matchesShareStatus,
  SOCIAL_SHARE_PLATFORMS,
} from "@/lib/social-share-admin";

export const dynamic = "force-dynamic";

// GET: List articles with social share status
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
    const requestedPage = parseInt(searchParams.get("page") || "1");
    const requestedLimit = parseInt(searchParams.get("limit") || "20");
    const page =
      Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 20;
    const platform = searchParams.get("platform") || null;
    const language = searchParams.get("language") || null;
    const status = searchParams.get("status") || null;
    const visibility = searchParams.get("visibility") || null;
    const search = searchParams.get("search") || null;
    const unsharedOnly =
      searchParams.get("unsharedOnly") === "true" || visibility === "unshared";

    const articleWhere: Prisma.ArticleWhereInput = {
      status: "PUBLISHED",
      ...(language && { language }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const articles = await db.article.findMany({
      where: articleWhere,
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
        publishedAt: true,
        language: true,
        category: {
          select: { name: true },
        },
        socialShares: {
          select: {
            id: true,
            platform: true,
            language: true,
            status: true,
            postId: true,
            sharedAt: true,
            error: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
    });

    const filteredArticles = articles
      .map((article) => {
        const shareMap = buildAdminShareMap(article.socialShares);
        const visiblePlatforms = platform ? [platform] : [...SOCIAL_SHARE_PLATFORMS];
        const effectiveStatus = getEffectiveShareStatus(status, visibility);

        if (
          effectiveStatus &&
          !visiblePlatforms.some((platformKey) =>
            matchesShareStatus(
              shareMap[platformKey]?.status || "NOT_CREATED",
              effectiveStatus,
            ),
          )
        ) {
          return null;
        }

        if (
          unsharedOnly &&
          !visiblePlatforms.some(
            (platformKey) =>
              (shareMap[platformKey]?.status || "NOT_CREATED") ===
              "NOT_CREATED",
          )
        ) {
          return null;
        }

        return {
          ...article,
          socialShares: undefined,
          shares: shareMap,
        };
      })
      .filter((article): article is NonNullable<typeof article> => Boolean(article));

    const total = filteredArticles.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    return NextResponse.json({
      articles: filteredArticles.slice(skip, skip + limit),
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Social shares fetch error:", error);
    return NextResponse.json(
      { error: "Sosyal paylaşım verileri alınamadı" },
      { status: 500 },
    );
  }
}

// POST: Create share records for specific articles
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
    const { articleIds, platform, language = "tr" } = body;

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json(
        { error: "Article IDs gerekli" },
        { status: 400 },
      );
    }

    if (!platform) {
      return NextResponse.json({ error: "Platform gerekli" }, { status: 400 });
    }

    const created = await db.socialShare.createMany({
      data: articleIds.map((articleId: string) => ({
        articleId,
        platform,
        language,
        status: "PENDING",
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      created: created.count,
      message: `${created.count} paylaşım kaydı oluşturuldu`,
    });
  } catch (error) {
    console.error("Social share create error:", error);
    return NextResponse.json(
      { error: "Paylaşım kayıtları oluşturulamadı" },
      { status: 500 },
    );
  }
}
