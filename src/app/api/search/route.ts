import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const COMPANY_ALIASES: Record<string, string[]> = {
  openai: ["openai"],
  google: ["google", "deepmind"],
  anthropic: ["anthropic"],
  meta: ["meta"],
  microsoft: ["microsoft"],
  nvidia: ["nvidia"],
};

function resolveCompanyTerms(term: string): string[] {
  const normalized = term.trim().toLowerCase();
  return COMPANY_ALIASES[normalized] || [normalized];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWholeWordMatch(text: string, term: string): boolean {
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegex(term)}([^\\p{L}\\p{N}]|$)`,
    "iu",
  );
  return pattern.test(text);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const mode = searchParams.get("mode");
    const topicParam = searchParams.get("topic");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Arama sorgusu en az 2 karakter olmalıdır" },
        { status: 400 },
      );
    }

    const searchTerm = query.trim();
    const skip = (page - 1) * limit;

    if (mode === "company") {
      const companyTerms = resolveCompanyTerms(searchTerm);
      const companyWhere = {
        status: "PUBLISHED" as const,
        OR: companyTerms.flatMap((term) => [
          { title: { contains: term, mode: "insensitive" as const } },
          { keywords: { has: term } },
        ]),
      };

      const candidates = await db.article.findMany({
        where: companyWhere,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          imageUrl: true,
          publishedAt: true,
          views: true,
          trendScore: true,
          keywords: true,
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [{ trendScore: "desc" }, { publishedAt: "desc" }],
        take: 300,
      });

      const strictResults = candidates.filter((article) =>
        companyTerms.some((term) => {
          const titleMatch = hasWholeWordMatch(
            article.title.toLowerCase(),
            term,
          );
          const keywordMatch = article.keywords.some(
            (keyword) => keyword.toLowerCase() === term,
          );
          return titleMatch || keywordMatch;
        }),
      );

      const totalCount = strictResults.length;
      const articles = strictResults
        .slice(skip, skip + limit)
        .map(({ keywords, ...article }) => article);

      return NextResponse.json({
        articles,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: skip + articles.length < totalCount,
        },
      });
    }

    if (mode === "topic" && topicParam?.trim()) {
      const topicKey = topicParam.trim();
      const topicWhere = {
        status: "PUBLISHED" as const,
        topic: {
          equals: topicKey,
          mode: "insensitive" as const,
        },
      };

      const [articles, totalCount] = await Promise.all([
        db.article.findMany({
          where: topicWhere,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            imageUrl: true,
            publishedAt: true,
            views: true,
            trendScore: true,
            category: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          orderBy: [{ trendScore: "desc" }, { publishedAt: "desc" }],
          skip,
          take: limit,
        }),
        db.article.count({ where: topicWhere }),
      ]);

      return NextResponse.json({
        articles,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: skip + articles.length < totalCount,
        },
      });
    }

    const searchWhere = {
      status: "PUBLISHED" as const,
      OR: [
        { title: { contains: searchTerm, mode: "insensitive" as const } },
        {
          excerpt: { contains: searchTerm, mode: "insensitive" as const },
        },
        {
          content: { contains: searchTerm, mode: "insensitive" as const },
        },
      ],
    };

    const articles = await db.article.findMany({
      where: searchWhere,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        publishedAt: true,
        views: true,
        trendScore: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ trendScore: "desc" }, { publishedAt: "desc" }],
      skip,
      take: limit,
    });

    const totalCount = await db.article.count({
      where: searchWhere,
    });

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + articles.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Arama sırasında bir hata oluştu" },
      { status: 500 },
    );
  }
}
