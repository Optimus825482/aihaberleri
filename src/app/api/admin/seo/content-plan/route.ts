import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type SearchIntent = "informational" | "commercial" | "transactional";

interface PriorityArticle {
  id: string;
  title: string;
  slug: string;
  language: string;
  category: string;
  publishedAt: string | null;
  seoScore: number;
  targetScore: number;
  projectedLift: number;
  priorityScore: number;
  intent: SearchIntent;
  primaryKeyword: string;
  secondaryKeywords: string[];
}

interface PlanWeek {
  week: number;
  focus: string;
  targetKeyword: string;
  contentType: string;
  wordCountTarget: number;
  internalLinkTargets: string[];
  articleIds: string[];
}

function toNumber(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function detectIntent(title: string, slug: string): SearchIntent {
  const haystack = `${title} ${slug}`.toLowerCase();

  if (/fiyat|satın|abonelik|paket|ücret/.test(haystack)) {
    return "transactional";
  }

  if (/vs|karşılaştır|alternatif|en iyi/.test(haystack)) {
    return "commercial";
  }

  return "informational";
}

function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim();
}

function extractKeywords(title: string, keywords: string[]) {
  const normalized = keywords.map(normalizeKeyword).filter(Boolean);
  if (normalized.length > 0) {
    return {
      primary: normalized[0],
      secondary: normalized.slice(1, 5),
    };
  }

  const fallback = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/\s+/)
    .filter((item) => item.length > 3)
    .slice(0, 5);

  return {
    primary: fallback[0] || "ai haberleri",
    secondary: fallback.slice(1),
  };
}

function getAgeInDays(publishedAt: Date | null): number {
  if (!publishedAt) return 0;
  const diff = Date.now() - new Date(publishedAt).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    const params = request.nextUrl.searchParams;
    const maxScore = toNumber(params.get("maxScore"), 80, 40, 95);
    const ageDays = toNumber(params.get("ageDays"), 30, 1, 3650);
    const weeks = toNumber(params.get("weeks"), 8, 2, 12);
    const limit = toNumber(params.get("limit"), 60, 10, 200);
    const rawLanguage = (params.get("language") || "tr").toLowerCase();
    const language = rawLanguage === "enb" ? "en" : rawLanguage;
    const mode = (params.get("mode") || "autonomous").toLowerCase();

    const ageThreshold = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000);

    const whereClause: any = {
      status: "PUBLISHED",
      publishedAt: { lte: ageThreshold },
      OR: [{ seoScore: { lt: maxScore } }, { seoScore: null }],
    };

    if (language === "tr" || language === "en") {
      whereClause.language = language;
    }

    const candidates = await prisma.article.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        slug: true,
        language: true,
        seoScore: true,
        publishedAt: true,
        keywords: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            seoRecommendations: {
              where: {
                isResolved: false,
              },
            },
          },
        },
      },
      orderBy: [{ seoScore: "asc" }, { publishedAt: "asc" }],
      take: limit,
    });

    const priorityArticles: PriorityArticle[] = candidates.map((article) => {
      const score = article.seoScore ?? 0;
      const scoreGap = Math.max(0, maxScore - score);
      const age = getAgeInDays(article.publishedAt);
      const freshnessPenalty = Math.min(30, Math.floor(age / 10));
      const unresolvedPenalty = Math.min(
        20,
        article._count.seoRecommendations * 2,
      );
      const keywordPenalty = Math.max(0, 6 - article.keywords.length) * 2;
      const priorityScore = Math.round(
        scoreGap * 1.4 + freshnessPenalty + unresolvedPenalty + keywordPenalty,
      );
      const projectedLift = Math.max(
        6,
        Math.min(28, Math.round(priorityScore / 3)),
      );
      const targetScore = Math.min(95, score + projectedLift);
      const keywordBundle = extractKeywords(
        article.title,
        article.keywords || [],
      );

      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        language: article.language,
        category: article.category?.name || "Genel",
        publishedAt: article.publishedAt
          ? article.publishedAt.toISOString()
          : null,
        seoScore: score,
        targetScore,
        projectedLift,
        priorityScore,
        intent: detectIntent(article.title, article.slug),
        primaryKeyword: keywordBundle.primary,
        secondaryKeywords: keywordBundle.secondary,
      };
    });

    priorityArticles.sort((a, b) => b.priorityScore - a.priorityScore);

    const topArticles = priorityArticles.slice(
      0,
      Math.min(40, priorityArticles.length),
    );

    const categoryClusters = Object.entries(
      topArticles.reduce(
        (acc, article) => {
          if (!acc[article.category]) {
            acc[article.category] = [];
          }
          acc[article.category].push(article);
          return acc;
        },
        {} as Record<string, PriorityArticle[]>,
      ),
    ).map(([category, items]) => ({
      category,
      pillarTitle: `${category} rehberi: güncel trendler ve kritik gelişmeler`,
      supportingArticles: items.slice(0, 5).map((item) => item.title),
      targetKeywords: Array.from(
        new Set(
          items.flatMap((item) => [
            item.primaryKeyword,
            ...item.secondaryKeywords,
          ]),
        ),
      ).slice(0, 8),
    }));

    const weeklyCapacity = Math.max(1, Math.ceil(topArticles.length / weeks));
    const calendar: PlanWeek[] = [];

    for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
      const chunk = topArticles.slice(
        weekIndex * weeklyCapacity,
        (weekIndex + 1) * weeklyCapacity,
      );

      if (chunk.length === 0) {
        break;
      }

      const dominantIntent = chunk.reduce(
        (acc, item) => {
          acc[item.intent] = (acc[item.intent] || 0) + 1;
          return acc;
        },
        {} as Record<SearchIntent, number>,
      );

      const intent = (Object.entries(dominantIntent).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0] || "informational") as SearchIntent;
      const primaryKeywords = Array.from(
        new Set(chunk.map((item) => item.primaryKeyword)),
      ).slice(0, 3);

      calendar.push({
        week: weekIndex + 1,
        focus:
          intent === "transactional"
            ? "Dönüşüm odaklı başlık + meta güncelleme"
            : intent === "commercial"
              ? "Karşılaştırma ve alternatif odaklı içerik güçlendirme"
              : "Bilgilendirici içerik derinleştirme ve yapılandırma",
        targetKeyword: primaryKeywords.join(", ") || "ai haberleri",
        contentType: "Historical content refresh",
        wordCountTarget: 900 + chunk.length * 180,
        internalLinkTargets: chunk.slice(0, 3).map((item) => `/${item.slug}`),
        articleIds: chunk.map((item) => item.id),
      });
    }

    const totalProjectedLift = topArticles.reduce(
      (sum, item) => sum + item.projectedLift,
      0,
    );
    const averageCurrentScore =
      topArticles.length > 0
        ? Math.round(
            topArticles.reduce((sum, item) => sum + item.seoScore, 0) /
              topArticles.length,
          )
        : 0;
    const averageTargetScore =
      topArticles.length > 0
        ? Math.round(
            topArticles.reduce((sum, item) => sum + item.targetScore, 0) /
              topArticles.length,
          )
        : 0;

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      filters: {
        mode,
        language,
        maxScore,
        ageDays,
        weeks,
        limit,
      },
      summary: {
        candidateCount: priorityArticles.length,
        plannedCount: topArticles.length,
        averageCurrentScore,
        averageTargetScore,
        averageLift: Math.max(0, averageTargetScore - averageCurrentScore),
        totalProjectedLift,
      },
      priorityArticles: topArticles,
      topicClusters: categoryClusters,
      calendar,
    });
  } catch (error) {
    console.error("[SEO_CONTENT_PLAN_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "SEO içerik planı oluşturulamadı",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
