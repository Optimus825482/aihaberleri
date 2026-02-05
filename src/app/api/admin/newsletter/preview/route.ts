import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch newsletter preview with top trending articles
export async function GET() {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch top 30 most-read articles published today, sorted by viewCount
    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        imageUrl: true,
        publishedAt: true,
        viewCount: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { viewCount: "desc" }, // Primary: Most viewed
        { publishedAt: "desc" }, // Secondary: Newest
      ],
      take: 30, // Top 30 most-read articles
    });

    // Get subscriber count (newsletter table with ACTIVE status)
    const subscriberCount = await prisma.newsletter.count({
      where: {
        status: "ACTIVE",
      },
    });

    // Generate subject line
    const now = new Date();
    const dateStr = now.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const subject =
      articles.length > 0
        ? `🔥 Bugünün En Çok Okunanları | ${dateStr} | ${articles.length} Trend Haber`
        : `🤖 AI Haberleri - ${dateStr}`;

    // Format articles for preview with trend indicator
    const formattedArticles = articles.map((article, index) => ({
      id: article.id,
      title: article.title,
      excerpt: article.excerpt || "",
      category: article.category.name,
      publishedAt: article.publishedAt?.toISOString() || "",
      imageUrl: article.imageUrl,
      viewCount: article.viewCount || 0,
      trendRank: index + 1, // 1-based rank
      isTrending: (article.viewCount || 0) > 100, // Mark as trending if >100 views
    }));

    return NextResponse.json({
      success: true,
      data: {
        subject,
        articleCount: articles.length,
        articles: formattedArticles,
        subscriberCount,
        scheduledTime: "19:00",
        sortedBy: "viewCount", // Indicate sorting method
        totalViews: articles.reduce((sum, a) => sum + (a.viewCount || 0), 0),
      },
    });
  } catch (error) {
    console.error("Newsletter preview error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch newsletter preview" },
      { status: 500 },
    );
  }
}
