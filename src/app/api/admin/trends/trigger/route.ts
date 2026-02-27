/**
 * Admin Trends Trigger API - POST to manually trigger trend fetching
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Dynamically import to avoid issues with workers in API routes
    const { fetchAllTrends } = await import("@/services/trend-fetcher.service");

    // Record the trigger in settings
    await db.setting.upsert({
      where: { key: "trend.lastManualTrigger" },
      create: {
        key: "trend.lastManualTrigger",
        value: new Date().toISOString(),
      },
      update: { value: new Date().toISOString() },
    });

    // Trigger trend fetching (runs in background)
    const result = await fetchAllTrends();

    // Update last run time
    await db.setting.upsert({
      where: { key: "trend.lastRun" },
      create: { key: "trend.lastRun", value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    // Calculate next run (30 minutes from now)
    const nextRun = new Date();
    nextRun.setMinutes(nextRun.getMinutes() + 30);

    await db.setting.upsert({
      where: { key: "trend.nextRun" },
      create: { key: "trend.nextRun", value: nextRun.toISOString() },
      update: { value: nextRun.toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: `${result.mastodonCount + result.blueskyCount + result.hackernewsCount + result.arxivCount + result.lobstersCount} trend başarıyla çekildi`,
      details: {
        mastodon: result.mastodonCount,
        bluesky: result.blueskyCount,
        hackernews: result.hackernewsCount,
        arxiv: result.arxivCount,
        lobsters: result.lobstersCount,
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error("Failed to trigger trend fetch:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Trend çekme başarısız",
      },
      { status: 500 },
    );
  }
}
