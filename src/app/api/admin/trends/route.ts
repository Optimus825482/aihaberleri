/**
 * Admin Trends API - GET trends data and stats
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Get all active trends
    const trends = await db.$queryRaw<any[]>`
      SELECT 
        id,
        topic,
        hashtag,
        platform,
        score,
        volume,
        sentiment,
        keywords,
        "isActive",
        "createdAt",
        "expiresAt"
      FROM "SocialTrend"
      WHERE "isActive" = true
      ORDER BY score DESC
      LIMIT 50
    `;

    // Get stats
    const statsRaw = await db.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as "totalTrends",
        COUNT(*) FILTER (WHERE "isActive" = true) as "activeTrends",
        COUNT(*) FILTER (WHERE platform = 'twitter') as "twitterTrends",
        COUNT(*) FILTER (WHERE platform = 'reddit') as "redditTrends",
        COALESCE(AVG(score), 0) as "avgTrendScore"
      FROM "SocialTrend"
    `;

    // Get enriched articles count
    const enrichedCount = await db.article.count({
      where: {
        isTrending: true,
      },
    });

    const stats = {
      totalTrends: Number(statsRaw[0]?.totalTrends || 0),
      activeTrends: Number(statsRaw[0]?.activeTrends || 0),
      twitterTrends: Number(statsRaw[0]?.twitterTrends || 0),
      redditTrends: Number(statsRaw[0]?.redditTrends || 0),
      articlesEnriched: enrichedCount,
      avgTrendScore: Math.round(Number(statsRaw[0]?.avgTrendScore || 0)),
    };

    // Get pipeline status from Redis or settings
    const lastRunSetting = await db.setting.findUnique({
      where: { key: "trend.lastRun" },
    });

    const nextRunSetting = await db.setting.findUnique({
      where: { key: "trend.nextRun" },
    });

    const pipeline = {
      isRunning: false,
      lastRun: lastRunSetting?.value || null,
      nextRun: nextRunSetting?.value || calculateNextRun(),
      currentPhase: "idle",
      progress: 0,
    };

    return NextResponse.json({
      trends: trends.map((t) => ({
        ...t,
        keywords: Array.isArray(t.keywords) ? t.keywords : [],
      })),
      stats,
      pipeline,
    });
  } catch (error) {
    console.error("Failed to fetch trends:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch trends",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

function calculateNextRun(): string {
  // Default: next run in 30 minutes
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  return now.toISOString();
}
