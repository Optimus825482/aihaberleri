/**
 * Social Shares API
 * GET: List articles with social share status
 * POST: Create share records for unshared articles
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET: List articles with social share status
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const platform = searchParams.get("platform") || null;
    const language = searchParams.get("language") || null;
    const status = searchParams.get("status") || null;
    const search = searchParams.get("search") || null;
    const unsharedOnly = searchParams.get("unsharedOnly") === "true";

    const skip = (page - 1) * limit;

    // Build where clause for articles
    const articleWhere: Prisma.ArticleWhereInput = {
      status: "PUBLISHED",
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    // Get total count
    const totalCount = await db.article.count({ where: articleWhere });

    // Get articles with their social shares
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
      skip,
      take: limit,
    });

    // Transform data for frontend - add missing platforms
    const platforms = [
      "FACEBOOK",
      "FACEBOOK_EN",
      "TWITTER",
      "BLUESKY",
      "MASTODON",
      "TUMBLR",
    ];

    const transformedArticles = articles
      .map((article) => {
        const shareMap: Record<string, any> = {};

        // Initialize all platforms as not shared
        platforms.forEach((p) => {
          shareMap[p] = { status: "NOT_CREATED", platform: p };
        });

        // Fill in existing shares
        article.socialShares.forEach((share) => {
          shareMap[share.platform] = share;
        });

        // Apply filters if specified
        if (platform && shareMap[platform]?.status !== status) {
          return null;
        }

        // Filter unshared only
        if (unsharedOnly) {
          const hasUnshared = platforms.some(
            (p) =>
              shareMap[p].status === "NOT_CREATED" ||
              shareMap[p].status === "PENDING",
          );
          if (!hasUnshared) return null;
        }

        return {
          ...article,
          socialShares: undefined,
          shares: shareMap,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      articles: transformedArticles,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
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
    const session = await auth();
    if (!session) {
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

    // Create share records
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
