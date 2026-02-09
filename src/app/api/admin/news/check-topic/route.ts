import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/news/check-topic
 * Veritabanında benzer topic/konu kontrolü
 * 
 * Request: { topic: string, sourceUrl: string }
 * Response: { hasSimilar: boolean, similarArticles: ExistingArticle[] }
 */
export async function POST(request: NextRequest) {
  try {
    // JWT Authentication
    const token = request.cookies.get("admin-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-this",
    );

    try {
      await jwtVerify(token, secret);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { topic, sourceUrl } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking for similar articles with topic: ${topic}`);

    // Time window: Last 7 days
    const timeWindowDays = 7;
    const cutoffDate = new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000);

    // Search strategies:
    // 1. Exact topic match
    // 2. Similar URL (same source article)
    // 3. Title similarity (contains key words from topic)

    const topicWords = topic.split("_").filter((w: string) => w.length > 2);

    // Build where clause for title search
    const titleContainsConditions = topicWords.map((word: string) => ({
      title: {
        contains: word,
        mode: "insensitive" as const,
      },
    }));

    // Find similar articles
    const similarArticles = await prisma.article.findMany({
      where: {
        OR: [
          // Exact topic match
          { topic: topic },
          // Same source URL (normalized)
          ...(sourceUrl ? [{
            sourceUrl: {
              contains: extractDomainAndPath(sourceUrl),
              mode: "insensitive" as const,
            },
          }] : []),
          // Title contains topic keywords (at least 2 matches)
          {
            AND: titleContainsConditions.length > 1 
              ? titleContainsConditions.slice(0, 2) // At least 2 keyword matches
              : titleContainsConditions,
          },
        ],
        publishedAt: {
          gte: cutoffDate,
        },
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        sourceUrl: true,
        views: true,
        categoryId: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 10, // Max 10 similar articles
    });

    // Get category names
    const categoryIds = [...new Set(similarArticles.map(a => a.categoryId))];
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const hasSimilar = similarArticles.length > 0;

    console.log(`📊 Found ${similarArticles.length} similar articles for topic: ${topic}`);

    // Transform response
    const formattedArticles = similarArticles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      publishedAt: article.publishedAt?.toISOString() || "",
      sourceUrl: article.sourceUrl || "",
      categoryName: categoryMap.get(article.categoryId) || "Genel",
      viewCount: article.views,
    }));

    return NextResponse.json({
      hasSimilar,
      similarArticles: formattedArticles,
      topicAnalyzed: topic,
      timeWindow: `${timeWindowDays} days`,
    });

  } catch (error) {
    console.error("❌ Check topic error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Topic check failed" },
      { status: 500 }
    );
  }
}

/**
 * Extract domain and path from URL for comparison
 * e.g., "https://example.com/news/article?param=1" -> "example.com/news/article"
 */
function extractDomainAndPath(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, ""); // Remove trailing slash
    return `${parsed.hostname}${path}`;
  } catch {
    return url;
  }
}
