/**
 * GA4 Page Views API
 *
 * GET /api/analytics/ga-views?slug=xxx → Tek makale okunma sayısı
 * GET /api/analytics/ga-views?sync=true → Tüm makalelerin DB sync (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { getArticlePageViews, isGA4Configured } from "@/lib/ga4-client";
import { db } from "@/lib/db";

// Rate limiter artık gerekli değil (sync devre dışı)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const sync = searchParams.get("sync");

  if (!isGA4Configured()) {
    return NextResponse.json(
      { success: false, error: "GA4 yapılandırması eksik" },
      { status: 503 },
    );
  }

  // ── Tekil makale view count ──
  if (slug) {
    try {
      const views = await getArticlePageViews(slug);

      if (views === -1) {
        // GA hatası — DB'den fallback
        const article = await db.article.findUnique({
          where: { slug },
          select: { views: true },
        });
        return NextResponse.json({
          success: true,
          source: "db",
          views: article?.views ?? 0,
        });
      }

      return NextResponse.json({
        success: true,
        source: "ga4",
        views,
      });
    } catch (error) {
      console.error("[GA Views] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal error" },
        { status: 500 },
      );
    }
  }

  // ── Toplu sync — DEVRE DIŞI ──
  // Article.views artık kendi tracking sistemimiz tarafından yönetiliyor.
  // GA4 sync, local view count'ları override ediyordu.
  if (sync === "true") {
    return NextResponse.json(
      {
        success: false,
        error:
          "GA4 sync devre dışı. Article.views artık kendi tracking sistemimiz tarafından yönetiliyor.",
      },
      { status: 410 },
    );
  }

  return NextResponse.json(
    { success: false, error: "slug veya sync parametresi gerekli" },
    { status: 400 },
  );
}
