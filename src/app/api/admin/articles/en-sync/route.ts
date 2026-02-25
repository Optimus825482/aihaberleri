import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getCache } from "@/lib/cache";
import { syncArticleToEnglishFromTurkish } from "@/lib/translation-sync";

export const dynamic = "force-dynamic";

type InconsistentArticleRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  trUpdatedAt: Date;
  enTranslationId: string | null;
  enTitle: string | null;
  enSlug: string | null;
  enUpdatedAt: Date | null;
  categoryName: string | null;
};

function buildSearchFilter(search?: string) {
  if (!search || !search.trim()) {
    return Prisma.sql``;
  }

  const query = `%${search.trim()}%`;
  return Prisma.sql`AND (a.title ILIKE ${query} OR a.slug ILIKE ${query})`;
}

function buildInconsistencyFilter() {
  return Prisma.sql`AND (at.id IS NULL OR at."updatedAt" < a."updatedAt")`;
}

async function listInconsistentArticles(
  page: number,
  limit: number,
  search?: string,
) {
  const offset = (page - 1) * limit;
  const searchFilter = buildSearchFilter(search);
  const inconsistencyFilter = buildInconsistencyFilter();

  const rows = await db.$queryRaw<InconsistentArticleRow[]>`
    SELECT
      a.id,
      a.title,
      a.slug,
      a.status::text as status,
      a."updatedAt" as "trUpdatedAt",
      at.id as "enTranslationId",
      at.title as "enTitle",
      at.slug as "enSlug",
      at."updatedAt" as "enUpdatedAt",
      c.name as "categoryName"
    FROM "Article" a
    LEFT JOIN "ArticleTranslation" at
      ON at."articleId" = a.id
      AND at.locale = 'en'
    LEFT JOIN "Category" c
      ON c.id = a."categoryId"
    WHERE 1=1
    ${searchFilter}
    ${inconsistencyFilter}
    ORDER BY a."updatedAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const totalResult = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint as count
    FROM "Article" a
    LEFT JOIN "ArticleTranslation" at
      ON at."articleId" = a.id
      AND at.locale = 'en'
    WHERE 1=1
    ${searchFilter}
    ${inconsistencyFilter}
  `;

  const total = Number(totalResult[0]?.count || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

async function getInconsistentIds(limit: number, search?: string) {
  const searchFilter = buildSearchFilter(search);
  const inconsistencyFilter = buildInconsistencyFilter();

  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT a.id
    FROM "Article" a
    LEFT JOIN "ArticleTranslation" at
      ON at."articleId" = a.id
      AND at.locale = 'en'
    WHERE 1=1
    ${searchFilter}
    ${inconsistencyFilter}
    ORDER BY a."updatedAt" DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => row.id);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const search = searchParams.get("search") || undefined;

    const result = await listInconsistentArticles(page, limit, search);

    return NextResponse.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        categoryName: row.categoryName,
        trUpdatedAt: row.trUpdatedAt,
        enTranslationId: row.enTranslationId,
        enTitle: row.enTitle,
        enSlug: row.enSlug,
        enUpdatedAt: row.enUpdatedAt,
        isMissingEnTranslation: !row.enTranslationId,
        isOutdated:
          !!row.enTranslationId &&
          !!row.enUpdatedAt &&
          row.enUpdatedAt < row.trUpdatedAt,
      })),
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[EN-SYNC] Listeleme hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    const body = await request.json();
    const syncAllInconsistent = Boolean(body?.syncAllInconsistent);
    const search = typeof body?.search === "string" ? body.search : undefined;
    const requestedIds: string[] = Array.isArray(body?.articleIds)
      ? body.articleIds.filter((item: unknown) => typeof item === "string")
      : [];

    let articleIds: string[] = [];

    if (syncAllInconsistent) {
      const limit = Math.min(500, Math.max(1, Number(body?.limit) || 200));
      articleIds = await getInconsistentIds(limit, search);
    } else {
      articleIds = requestedIds;
    }

    if (articleIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Senkronize edilecek makale bulunamadı",
        },
        { status: 400 },
      );
    }

    let successCount = 0;
    const failed: Array<{ articleId: string; error: string }> = [];

    for (const articleId of articleIds) {
      try {
        await syncArticleToEnglishFromTurkish(articleId);
        successCount++;
      } catch (error) {
        failed.push({
          articleId,
          error: error instanceof Error ? error.message : "Bilinmeyen hata",
        });
      }
    }

    const cache = getCache();
    await cache.invalidateByTag("articles");

    return NextResponse.json({
      success: true,
      processed: articleIds.length,
      successCount,
      failedCount: failed.length,
      failed,
      message:
        failed.length === 0
          ? `${successCount} makale başarıyla EN ile senkronize edildi`
          : `${successCount} başarılı, ${failed.length} başarısız`,
    });
  } catch (error) {
    console.error("[EN-SYNC] Senkron hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
