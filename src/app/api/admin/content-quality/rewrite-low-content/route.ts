import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { rewriteArticleWithNote } from "@/lib/deepseek";

const normalizeLength = (html: string | null) => {
  if (!html) return 0;
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
};

export async function POST(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const body = await request.json().catch(() => ({}));

    const inputLimit = Number(body?.limit ?? 10);
    const inputMin = Number(body?.minContentLength ?? 1800);
    const dryRun = body?.dryRun === true;

    const limit = Number.isFinite(inputLimit)
      ? Math.max(1, Math.min(30, Math.floor(inputLimit)))
      : 10;

    const minContentLength = Number.isFinite(inputMin)
      ? Math.max(200, Math.min(10000, Math.floor(inputMin)))
      : 1800;

    const published = await db.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        content: true,
        excerpt: true,
        category: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 3000,
    });

    const candidates = published
      .map((article) => ({
        ...article,
        contentLength: normalizeLength(article.content),
      }))
      .filter((article) => article.contentLength < minContentLength)
      .sort((a, b) => a.contentLength - b.contentLength)
      .slice(0, limit);

    let updated = 0;
    let failed = 0;
    const results: Array<{
      id: string;
      title: string;
      beforeLength: number;
      afterLength: number;
      updated: boolean;
      error?: string;
    }> = [];

    for (const article of candidates) {
      try {
        const note = `Bu haberi kalite standardına göre yeniden yaz. İçerik en az ${minContentLength} karakter olsun. Gereksiz tekrar yapma, gerçek haber tonu koru, teknik doğruluğu bozma, tarihleri güncel tut, paragraf yapısını netleştir.`;

        const rewritten = await rewriteArticleWithNote(
          article.title,
          article.content || article.excerpt || article.title,
          article.category.name,
          note,
        );

        const afterLength = normalizeLength(rewritten.content);

        if (!dryRun) {
          await db.article.update({
            where: { id: article.id },
            data: {
              title: rewritten.title,
              content: rewritten.content,
              excerpt: rewritten.excerpt,
              metaTitle: rewritten.metaTitle || rewritten.title,
              metaDescription: rewritten.metaDescription || rewritten.excerpt,
              keywords: rewritten.keywords,
              score: rewritten.score,
              updatedAt: new Date(),
            },
          });
        }

        updated += 1;
        results.push({
          id: article.id,
          title: article.title,
          beforeLength: article.contentLength,
          afterLength,
          updated: true,
        });
      } catch (error) {
        failed += 1;
        results.push({
          id: article.id,
          title: article.title,
          beforeLength: article.contentLength,
          afterLength: article.contentLength,
          updated: false,
          error: error instanceof Error ? error.message : "Rewrite başarısız",
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        dryRun,
        minContentLength,
        requestedLimit: limit,
        candidates: candidates.length,
        updated,
        failed,
        results,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Düşük içerik rewrite işlemi başarısız",
      },
      { status: 500 },
    );
  }
}
