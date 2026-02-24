import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type QualityItem = {
  id: string;
  slug: string;
  title: string;
  publishedAt: string | null;
  imageUrl?: string | null;
  contentLength?: number;
  qualityScore?: number | null;
  qualityReason?: string | null;
  rewriteAttempts?: number | null;
};

const normalizeLength = (html: string | null) => {
  if (!html) return 0;
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
};

export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const inputLimit = Number(searchParams.get("limit") ?? "50");
    const inputMin = Number(searchParams.get("minContent") ?? "1800");

    const limit = Number.isFinite(inputLimit)
      ? Math.max(1, Math.min(200, Math.floor(inputLimit)))
      : 50;

    const minContentLength = Number.isFinite(inputMin)
      ? Math.max(200, Math.min(10000, Math.floor(inputMin)))
      : 1800;

    const [
      publishedTotal,
      imagelessTotal,
      imagelessRows,
      lowContentRows,
      lowValueRows,
    ] = await Promise.all([
      db.article.count({ where: { status: "PUBLISHED" } }),
      db.article.count({
        where: {
          status: "PUBLISHED",
          OR: [
            { imageUrl: null },
            { imageUrl: "" },
            { imageUrl: "/logos/og-image.png" },
          ],
        },
      }),
      db.article.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { imageUrl: null },
            { imageUrl: "" },
            { imageUrl: "/logos/og-image.png" },
          ],
        },
        select: {
          id: true,
          slug: true,
          title: true,
          imageUrl: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: "desc" },
        take: limit,
      }),
      db.article.findMany({
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          slug: true,
          title: true,
          content: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: "desc" },
        take: 3000,
      }),
      db.sEORecommendation.findMany({
        where: {
          type: "CONTENT_QUALITY_LOW_VALUE",
          isResolved: false,
          article: {
            status: "PUBLISHED",
          },
        },
        select: {
          message: true,
          suggestion: true,
          article: {
            select: {
              id: true,
              slug: true,
              title: true,
              publishedAt: true,
              seoScore: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
      }),
    ]);

    const imagelessList: QualityItem[] = imagelessRows.map(
      (row: {
        id: string;
        slug: string;
        title: string;
        imageUrl: string | null;
        publishedAt: Date | null;
      }) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        imageUrl: row.imageUrl,
        publishedAt: row.publishedAt?.toISOString() ?? null,
      }),
    );

    const lowContentComputed = lowContentRows
      .map(
        (row: {
          id: string;
          slug: string;
          title: string;
          content: string;
          publishedAt: Date | null;
        }) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          contentLength: normalizeLength(row.content),
          publishedAt: row.publishedAt?.toISOString() ?? null,
        }),
      )
      .filter((row: QualityItem) => (row.contentLength ?? 0) < minContentLength)
      .sort(
        (a: QualityItem, b: QualityItem) =>
          (a.contentLength ?? 0) - (b.contentLength ?? 0),
      );

    const lowContentTotal = lowContentComputed.length;
    const lowContentList: QualityItem[] = lowContentComputed.slice(0, limit);

    const lowValueList: QualityItem[] = lowValueRows
      .filter(
        (row: {
          message: string;
          suggestion: string | null;
          article: {
            id: string;
            slug: string;
            title: string;
            publishedAt: Date | null;
            seoScore: number | null;
          } | null;
        }) => row.article !== null,
      )
      .map(
        (row: {
          message: string;
          suggestion: string | null;
          article: {
            id: string;
            slug: string;
            title: string;
            publishedAt: Date | null;
            seoScore: number | null;
          };
        }) => {
          const match = row.message?.match(/Attempts:\s*(\d+)/i);
          const rewriteAttempts = match ? Number(match[1]) : null;

          return {
            id: row.article.id,
            slug: row.article.slug,
            title: row.article.title,
            publishedAt: row.article.publishedAt?.toISOString() ?? null,
            qualityScore: row.article.seoScore,
            qualityReason: row.suggestion,
            rewriteAttempts,
          };
        },
      );

    const lowValueTotal = lowValueList.length;

    const recommendations: string[] = [];
    if (imagelessTotal > 0) {
      recommendations.push(
        `Görselsiz içerikler için backfill çalıştırın: /api/admin/images/backfill (limit ${Math.min(
          200,
          imagelessTotal,
        )}).`,
      );
    }
    if (lowContentTotal > 0) {
      recommendations.push(
        `Düşük içerikleri >= ${minContentLength} karaktere çıkarın (editoryal veya LLM rewrite).`,
      );
    }
    if (lowValueTotal > 0) {
      recommendations.push(
        "Kontroller Agent tarafından düşük değerli işaretlenen içerikleri editöryal olarak tekrar gözden geçirin.",
      );
    }
    if (recommendations.length === 0) {
      recommendations.push(
        "Görsel ve içerik kalitesi açısından kritik eksik görünmüyor.",
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          params: {
            limit,
            minContentLength,
          },
          summary: {
            publishedTotal,
            imagelessTotal,
            lowContentTotal,
            lowValueTotal,
            imagelessRatio:
              publishedTotal > 0
                ? Number(((imagelessTotal / publishedTotal) * 100).toFixed(2))
                : 0,
            lowContentRatio:
              publishedTotal > 0
                ? Number(((lowContentTotal / publishedTotal) * 100).toFixed(2))
                : 0,
            lowValueRatio:
              publishedTotal > 0
                ? Number(((lowValueTotal / publishedTotal) * 100).toFixed(2))
                : 0,
          },
          lists: {
            imageless: imagelessList,
            lowContent: lowContentList,
            lowValue: lowValueList,
          },
          recommendations,
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "İçerik kalite verisi alınamadı",
      },
      { status: 500 },
    );
  }
}
