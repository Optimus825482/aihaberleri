/**
 * Check Topic API
 * Checks if similar articles exist in the database for a given topic
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const maxDuration = 30;

// Calculate similarity between two strings using Jaccard index
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const words1 = new Set(normalize(str1));
  const words2 = new Set(normalize(str2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// Extract key terms from topic for database search
function extractKeyTerms(topic: string): string[] {
  // Known company/product names to look for
  const knownEntities = [
    "openai",
    "gpt",
    "chatgpt",
    "gpt-4",
    "gpt-5",
    "dall-e",
    "sora",
    "google",
    "gemini",
    "bard",
    "deepmind",
    "google ai",
    "microsoft",
    "copilot",
    "bing",
    "azure",
    "anthropic",
    "claude",
    "meta",
    "llama",
    "facebook",
    "nvidia",
    "jensen",
    "cuda",
    "a100",
    "h100",
    "apple",
    "siri",
    "apple intelligence",
    "tesla",
    "elon musk",
    "optimus",
    "xai",
    "grok",
    "amazon",
    "aws",
    "alexa",
    "bedrock",
    "deepseek",
    "mistral",
    "cohere",
    "hugging face",
    "stability",
    "midjourney",
    "stable diffusion",
  ];

  const topicLower = topic.toLowerCase();
  const terms: string[] = [];

  // Find matching entities
  for (const entity of knownEntities) {
    if (topicLower.includes(entity)) {
      terms.push(entity);
    }
  }

  // Add significant words from topic
  const words = topicLower
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 3 &&
        ![
          "için",
          "olan",
          "gibi",
          "daha",
          "this",
          "that",
          "with",
          "from",
          "have",
          "been",
          "will",
          "their",
        ].includes(w),
    );

  terms.push(...words.slice(0, 5));

  return [...new Set(terms)];
}

export async function POST(request: NextRequest) {
  try {
    // Auth check - support both NextAuth and admin-session JWT
    const session = await auth();
    const adminSession = await getAdminSession();
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topic, sourceUrl } = body;

    if (!topic) {
      return NextResponse.json({ error: "Konu gerekli" }, { status: 400 });
    }

    // Extract key terms for search
    const keyTerms = extractKeyTerms(topic);
    console.log(
      `🔍 Searching for similar articles with terms: ${keyTerms.join(", ")}`,
    );

    // Build search conditions
    const searchConditions = keyTerms.map((term) => ({
      OR: [
        { title: { contains: term, mode: "insensitive" as const } },
        { content: { contains: term, mode: "insensitive" as const } },
      ],
    }));

    // Check for exact URL match first
    if (sourceUrl) {
      const exactMatch = await db.article.findFirst({
        where: { sourceUrl },
        select: { id: true },
      });

      if (exactMatch) {
        // Get the article details
        const article = await db.article.findUnique({
          where: { id: exactMatch.id },
          select: {
            id: true,
            title: true,
            slug: true,
            publishedAt: true,
            sourceUrl: true,
            views: true,
            category: { select: { name: true } },
          },
        });

        return NextResponse.json({
          hasSimilar: true,
          exactMatch: true,
          similarArticles: article
            ? [
                {
                  id: article.id,
                  title: article.title,
                  slug: article.slug,
                  publishedAt: article.publishedAt?.toISOString(),
                  sourceUrl: article.sourceUrl,
                  categoryName: article.category?.name || "Genel",
                  viewCount: article.views,
                },
              ]
            : [],
        });
      }
    }

    // Search for similar articles (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const candidateArticles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: thirtyDaysAgo },
        AND:
          searchConditions.length > 0 ? [{ OR: searchConditions }] : undefined,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        sourceUrl: true,
        views: true,
        category: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 50, // Get more candidates for similarity check
    });

    console.log(`📚 Found ${candidateArticles.length} candidate articles`);

    // Filter by similarity score
    const similarArticles = candidateArticles
      .map((article) => ({
        ...article,
        similarity: calculateSimilarity(topic, article.title),
      }))
      .filter((article) => article.similarity > 0.25) // 25% similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10); // Top 10 most similar

    console.log(
      `✅ ${similarArticles.length} articles passed similarity threshold`,
    );

    return NextResponse.json({
      hasSimilar: similarArticles.length > 0,
      exactMatch: false,
      similarArticles: similarArticles.map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        publishedAt: article.publishedAt?.toISOString(),
        sourceUrl: article.sourceUrl,
        categoryName: article.category?.name || "Genel",
        viewCount: article.views,
        similarity: Math.round(article.similarity * 100),
      })),
    });
  } catch (error) {
    console.error("Check topic error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Veritabanı kontrolü başarısız",
      },
      { status: 500 },
    );
  }
}
