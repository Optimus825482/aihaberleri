import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { scanAllChannels } from "@/lib/youtube-monitor";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/youtube/scan
 * Manually trigger YouTube channel scan
 * Returns ALL topics with coverage status (published in last 12h)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const body = await request.json().catch(() => ({}));
    const hoursAgo = body.hoursAgo || 48;

    console.log(
      `🎬 Manuel YouTube taraması başlatılıyor (son ${hoursAgo} saat)...`,
    );

    const topics = await scanAllChannels(hoursAgo);

    // Check which topics already have articles published in last 12 hours
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const recentArticles = await db.article.findMany({
      where: {
        publishedAt: { gte: twelveHoursAgo },
        status: "PUBLISHED",
      },
      select: { title: true, topic: true },
    });

    const recentTitlesLower = recentArticles.map((a) =>
      (a.topic || a.title).toLowerCase(),
    );

    // Enrich topics with coverage status and sort by confidence (as score proxy)
    const enrichedTopics = topics
      .map((topic) => {
        const topicLower = topic.topic.toLowerCase();
        const isCovered = recentTitlesLower.some(
          (t) =>
            t.includes(topicLower.substring(0, 30)) ||
            topicLower.includes(t.substring(0, 30)) ||
            calculateSimilarity(t, topicLower) > 0.5,
        );
        return {
          topic: topic.topic,
          originalTitle: topic.originalTitle,
          description: topic.description,
          source: topic.source,
          sourceUrl: topic.sourceUrl,
          publishedAt: topic.publishedAt,
          confidence: topic.confidence,
          keywords: topic.keywords,
          isCovered,
        };
      })
      .sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      success: true,
      data: {
        topicsFound: enrichedTopics.length,
        coveredCount: enrichedTopics.filter((t) => t.isCovered).length,
        uncoveredCount: enrichedTopics.filter((t) => !t.isCovered).length,
        topics: enrichedTopics,
      },
    });
  } catch (error) {
    console.error("YouTube scan error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

/** Simple word-overlap similarity (Jaccard) */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.split(/\s+/).filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  return intersection / (wordsA.size + wordsB.size - intersection);
}
