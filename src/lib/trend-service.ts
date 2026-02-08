import { db } from "@/lib/db";

/**
 * IMPROVED Trend Score Calculation Algorithm
 * 
 * Formula: TrendScore = (ViewScore + EngagementScore + VelocityScore) * FreshnessMultiplier
 * 
 * Components:
 * 1. ViewScore (40%): Total views with logarithmic scaling
 * 2. EngagementScore (20%): Likes, ratings, shares
 * 3. VelocityScore (30%): Recent activity (last 24h views vs total)
 * 4. FreshnessMultiplier (10%): Time decay with longer half-life
 * 
 * Output: 0-100 scale where:
 * - 0-20: Low interest
 * - 21-40: Moderate interest
 * - 41-60: Popular
 * - 61-80: Trending
 * - 81-100: Viral
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

    // === Base Metrics ===
    const totalViews = article.views || 0;
    const likes = article.likes || 0;
    const rating = (article as any).rating || 0;
    const ratingCount = (article as any).ratingCount || 0;
    const recentViews = article.analytics?.length || 0;

    // === Time Calculations ===
    const publishedAt = article.publishedAt || article.createdAt;
    const hoursSincePublished = Math.max(
      1,
      (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60),
    );

    // === 1. VIEW SCORE (40%) ===
    // Logarithmic scaling to prevent very high view articles from dominating
    // log10(1) = 0, log10(10) = 1, log10(100) = 2, log10(1000) = 3
    const viewScore = totalViews > 0 
      ? Math.min(40, Math.log10(totalViews + 1) * 13.3) // Max 40 points
      : 0;

    // === 2. ENGAGEMENT SCORE (20%) ===
    // Likes: 2 points each (max 10 points)
    // Rating: Up to 10 points based on average rating
    const likeScore = Math.min(10, likes * 2);
    const ratingScore = ratingCount > 0 ? (rating / 5) * 10 : 0;
    const engagementScore = Math.min(20, likeScore + ratingScore);

    // === 3. VELOCITY SCORE (30%) ===
    // Higher weight for recent activity relative to total
    // If article gets 50% of views in last 24h, it's very trendy
    const velocityRatio = totalViews > 0 ? recentViews / Math.max(totalViews, 1) : 0;
    const velocityBonus = recentViews * 0.5; // Direct bonus for recent views
    const velocityScore = Math.min(30, (velocityRatio * 20) + Math.min(10, velocityBonus));

    // === 4. FRESHNESS MULTIPLIER (affects final score) ===
    // Slower decay than before - 48h half-life instead of aggressive Hacker News style
    // After 48h: 0.5x, After 96h: 0.25x, After 168h (1 week): 0.125x
    const halfLife = 48; // hours
    const freshnessMultiplier = Math.pow(0.5, hoursSincePublished / halfLife);
    // Minimum freshness of 0.1 to prevent old articles from going to zero
    const adjustedFreshness = Math.max(0.1, freshnessMultiplier);

    // === FINAL CALCULATION ===
    const rawScore = viewScore + engagementScore + velocityScore;
    const trendScore = Math.round(rawScore * adjustedFreshness * 1.1); // 1.1 boost factor

    // Ensure score is within 0-100 range
    const finalScore = Math.min(100, Math.max(0, trendScore));

    // Update article with new trend score and status
    // Thresholds:
    // > 60: Trending (show trending badge)
    // > 40: Popular (show in popular section)
    await db.article.update({
      where: { id: articleId },
      data: {
        trendScore: finalScore,
        isTrending: finalScore > 40,
      },
    });

    return finalScore;
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
