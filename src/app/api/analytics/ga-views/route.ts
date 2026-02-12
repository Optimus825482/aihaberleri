/**
 * GA4 Page Views API
 *
 * GET /api/analytics/ga-views?slug=xxx → Tek makale okunma sayısı
 * GET /api/analytics/ga-views?sync=true → Tüm makalelerin DB sync (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getArticlePageViews,
  getAllArticlePageViews,
  isGA4Configured,
} from "@/lib/ga4-client";
import { db } from "@/lib/db";

// In-memory rate limiter for sync
let lastSyncTime = 0;
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 dakika

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

  // ── Toplu sync (tüm makaleleri güncelle) ──
  if (sync === "true") {
    // Rate limit
    if (Date.now() - lastSyncTime < SYNC_COOLDOWN_MS) {
      const remaining = Math.ceil(
        (SYNC_COOLDOWN_MS - (Date.now() - lastSyncTime)) / 1000,
      );
      return NextResponse.json(
        {
          success: false,
          error: `Sync cooldown aktif. ${remaining}s sonra tekrar deneyin.`,
        },
        { status: 429 },
      );
    }

    try {
      const gaViews = await getAllArticlePageViews();

      if (gaViews.size === 0) {
        return NextResponse.json({
          success: true,
          message: "GA4'ten veri gelmedi",
          updated: 0,
        });
      }

      // DB'deki makaleleri slug'larıyla çek
      const articles = await db.article.findMany({
        select: { id: true, slug: true, views: true },
      });

      let updated = 0;
      const updates: Promise<any>[] = [];

      for (const article of articles) {
        const gaViewCount = gaViews.get(article.slug);
        if (gaViewCount !== undefined && gaViewCount !== article.views) {
          updates.push(
            db.article.update({
              where: { id: article.id },
              data: { views: gaViewCount },
            }),
          );
          updated++;
        }
      }

      // Batch execute (50'lik gruplar)
      for (let i = 0; i < updates.length; i += 50) {
        await Promise.all(updates.slice(i, i + 50));
      }

      lastSyncTime = Date.now();

      return NextResponse.json({
        success: true,
        message: `GA4 sync tamamlandı`,
        totalArticles: articles.length,
        gaArticles: gaViews.size,
        updated,
      });
    } catch (error) {
      console.error("[GA Views Sync] Error:", error);
      return NextResponse.json(
        { success: false, error: "Sync failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { success: false, error: "slug veya sync parametresi gerekli" },
    { status: 400 },
  );
}
