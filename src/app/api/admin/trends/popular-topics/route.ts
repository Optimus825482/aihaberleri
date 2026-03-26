/**
 * Admin Popular Topics API
 *
 * GET: Son LLM topic clustering sonuçlarını getir
 * Döndürdüğü veri: Popüler konu cluster'ları, puan ortalamaları, platform dağılımları
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getLastClusteringResult,
  getPopularTopics,
} from "@/services/trend-topic-clustering.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const { requireAdminAuth } = await import("@/lib/admin-auth");
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(request.url);
    const minScore = Number(searchParams.get("minScore") || 0);
    const limit = Number(searchParams.get("limit") || 20);

    const clusteringResult = getLastClusteringResult();

    if (!clusteringResult) {
      return NextResponse.json({
        clusters: [],
        unclustered: [],
        stats: {
          clusterCount: 0,
          trendCount: 0,
          lastUpdated: null,
          durationMs: 0,
        },
        message:
          "Henüz topic clustering çalıştırılmadı. Trend fetch çalıştığında otomatik oluşturulacak.",
      });
    }

    const popularTopics =
      minScore > 0
        ? getPopularTopics(minScore, limit)
        : clusteringResult.clusters.slice(0, limit);

    return NextResponse.json({
      clusters: popularTopics.map((c) => ({
        canonicalTopic: c.canonicalTopic,
        avgScore: c.avgScore,
        maxScore: c.maxScore,
        platformCount: c.platformCount,
        platforms: c.platforms,
        totalVolume: c.totalVolume,
        trendCount: c.trends.length,
        trends: c.trends.map((t) => ({
          platform: t.platform,
          topic: t.topic,
          score: t.score,
          url: t.url,
        })),
      })),
      unclustered: clusteringResult.unclustered.map((t) => ({
        platform: t.platform,
        topic: t.topic,
        score: t.score,
        url: t.url,
      })),
      stats: {
        clusterCount: clusteringResult.clusterCount,
        trendCount: clusteringResult.trendCount,
        lastUpdated: clusteringResult.timestamp.toISOString(),
        durationMs: clusteringResult.durationMs,
      },
    });
  } catch (error) {
    console.error("Failed to fetch popular topics:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch popular topics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
