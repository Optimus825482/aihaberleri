import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getCache } from "@/lib/cache";
import { syncArticleToEnglishFromTurkish } from "@/lib/translation-sync";

export const dynamic = "force-dynamic";

/** EN çevirisi hiç olmayan PUBLISHED makaleleri listele */
async function listMissingEnArticles(
  page: number,
  limit: number,
  search?: string,
) {
  const offset = (page - 1) * limit;
  const searchClause = search?.trim()
    ? `AND (a.title ILIKE '%${search.trim().replace(/'/g, "''")}%' OR a.slug ILIKE '%${search.trim().replace(/'/g, "''")}%')`
    : "";

  type Row = {
    id: string;
    title: string;
    slug: string;
    status: string;
    categoryName: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
  };

  const rows = await db.$queryRawUnsafe<Row[]>(`
    SELECT
      a.id,
      a.title,
      a.slug,
      a.status::text AS status,
      c.name AS "categoryName",
      a."publishedAt",
      a."updatedAt"
    FROM "Article" a
    LEFT JOIN "ArticleTranslation" en_t
      ON en_t."articleId" = a.id AND en_t.locale = 'en'
    LEFT JOIN "Category" c ON c.id = a."categoryId"
    WHERE a.status = 'PUBLISHED'
      AND en_t.id IS NULL
      ${searchClause}
    ORDER BY a."updatedAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const totalResult = await db.$queryRawUnsafe<{ count: bigint }[]>(`
    SELECT COUNT(*)::bigint AS count
    FROM "Article" a
    LEFT JOIN "ArticleTranslation" en_t
      ON en_t."articleId" = a.id AND en_t.locale = 'en'
    WHERE a.status = 'PUBLISHED'
      AND en_t.id IS NULL
      ${searchClause}
  `);

  const total = Number(totalResult[0]?.count ?? 0);

  return {
    rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

// GET — liste
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const sp = request.nextUrl.searchParams;
    const idsOnly = sp.get("idsOnly") === "true";
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10)));
    const search = sp.get("search") ?? undefined;

    const result = await listMissingEnArticles(page, limit, search);

    if (idsOnly) {
      return NextResponse.json({
        success: true,
        data: result.rows.map((r) => ({ id: r.id, title: r.title })),
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[MISSING-EN] Listeleme hatası:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      { status: 500 },
    );
  }
}

// POST — çevir
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const articleIds: string[] = Array.isArray(body?.articleIds)
      ? body.articleIds.filter((x: unknown) => typeof x === "string")
      : [];

    if (articleIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "articleIds boş olamaz" },
        { status: 400 },
      );
    }

    let successCount = 0;
    const failed: Array<{ articleId: string; error: string }> = [];

    for (const articleId of articleIds) {
      try {
        await syncArticleToEnglishFromTurkish(articleId);
        successCount++;
      } catch (err) {
        failed.push({
          articleId,
          error: err instanceof Error ? err.message : "Bilinmeyen hata",
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
          ? `${successCount} makale başarıyla EN'ye çevrildi`
          : `${successCount} başarılı, ${failed.length} başarısız`,
    });
  } catch (error) {
    console.error("[MISSING-EN] Çeviri hatası:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      { status: 500 },
    );
  }
}
