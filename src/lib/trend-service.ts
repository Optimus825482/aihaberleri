import { db } from "@/lib/db";

/**
 * Recalculates the trend score for a specific article based on interactions and freshness.
 */
export async function recalculateTrendScore(articleId: string) {
  try {
    const article = await db.article.findUnique({
      where: { id: articleId },
      include: {
        analytics: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        },
      },
    });

    if (!article) return 0;

    // Base metrics
    const views = article.views || 0;
    const likes = article.likes || 0;

    // Check if rating exists on the article model (optional based on schema)
    // Using simple property access with fallback
    const rating = (article as any).rating || 0;
    const ratingCount = (article as any).ratingCount || 0;

    // Recent activity weight (analytics count in last 24h)
    const recentViews = article.analytics?.length || 0;

    // Time decay logic (freshness)
    const publishedAt = article.publishedAt || article.createdAt;
    const hoursSincePublished = Math.max(
      1,
      (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60),
    );

    // Trend Calculation Formula (Heavily weighted towards recent activity)
    // 1. Base popularity (20%)
    // 2. Velocity (recent views * 15) - High impact
    // 3. Engagement (likes * 10)
    const baseScore =
      views * 0.2 + recentViews * 15 + likes * 10 + rating * ratingCount * 5;

    // Gravity factor to decay score over time (Hacker News style)
    // Higher gravity = faster decay for older items
    const gravity = 1.8;
    const trendScore = Math.round(
      (baseScore / Math.pow(hoursSincePublished + 2, gravity)) * 100,
    );

    // Update article with new trend score and status
    // Threshold > 40 implies "Trending" status
    await db.article.update({
      where: { id: articleId },
      data: {
        trendScore,
        isTrending: trendScore > 40,
      },
    });

    return trendScore;
  } catch (error) {
    console.error(
      `Error recalculating trend score for article ${articleId}:`,
      error,
    );
    return 0;
  }
}

/**
 * Bulk recalculates trend scores for all articles published in a given timeframe.
 */
export async function bulkRecalculateTrends(hours: number = 24) {
  try {
    const articles = await db.article.findMany({
      where: {
        publishedAt: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000),
        },
        status: "PUBLISHED",
      },
      select: { id: true },
    });

    console.log(
      `Starting bulk trend recalculation for ${articles.length} articles...`,
    );

    // Run sequentially to manage DB load
    for (const article of articles) {
      await recalculateTrendScore(article.id);
    }

    console.log("Bulk trend recalculation completed.");
  } catch (error) {
    console.error("Error during bulk trend recalculation:", error);
  }
}
