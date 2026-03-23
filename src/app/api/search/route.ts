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
    const localeParam = searchParams.get("locale");
    const locale = localeParam === "en" ? "en" : "tr";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Arama sorgusu en az 2 karakter olmalıdır" },
        { status: 400 },
      );
    }

    // Prevent excessively long queries that could cause timeouts
    if (query.trim().length > 200) {
      return NextResponse.json(
        { error: "Arama sorgusu en fazla 200 karakter olabilir" },
        { status: 400 },
      );
    }

    const searchTerm = query.trim();
    const skip = (page - 1) * limit;

    if (mode === "company") {
      const companyTerms = resolveCompanyTerms(searchTerm);

      if (locale === "en") {
        const candidates = await db.articleTranslation.findMany({
          where: {
            locale: "en",
            article: { status: "PUBLISHED" },
            OR: companyTerms.flatMap((term) => [
              { title: { contains: term, mode: "insensitive" as const } },
              { excerpt: { contains: term, mode: "insensitive" as const } },
              {
                article: {
                  OR: [
                    { keywordsEn: { has: term } },
                    { keywords: { has: term } },
                  ],
                },
              },
            ]),
          },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            article: {
              select: {
                id: true,
                imageUrl: true,
                publishedAt: true,
                views: true,
                trendScore: true,
                keywords: true,
                keywordsEn: true,
                category: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { article: { trendScore: "desc" } },
            { article: { publishedAt: "desc" } },
          ],
          take: 300,
        });

        const strictResults = candidates.filter((item) =>
          companyTerms.some((term) => {
            const titleMatch = hasWholeWordMatch(
              item.title.toLowerCase(),
              term,
            );
            const keywordMatch = [
              ...item.article.keywordsEn,
              ...item.article.keywords,
            ].some((keyword) => keyword.toLowerCase() === term);
            return titleMatch || keywordMatch;
          }),
        );

        const totalCount = strictResults.length;
        const articles = strictResults
          .slice(skip, skip + limit)
          .map((item) => ({
            id: item.article.id,
            title: item.title,
            slug: item.slug,
            excerpt: item.excerpt,
            imageUrl: item.article.imageUrl,
            publishedAt: item.article.publishedAt,
            views: item.article.views,
            category: item.article.category,
          }));

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

      if (locale === "en") {
        const topicWhere = {
          locale: "en" as const,
          article: {
            status: "PUBLISHED" as const,
            topic: {
              equals: topicKey,
              mode: "insensitive" as const,
            },
          },
        };

        const [articles, totalCount] = await Promise.all([
          db.articleTranslation.findMany({
            where: topicWhere,
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              article: {
                select: {
                  id: true,
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
              },
            },
            orderBy: [
              { article: { trendScore: "desc" } },
              { article: { publishedAt: "desc" } },
            ],
            skip,
            take: limit,
          }),
          db.articleTranslation.count({ where: topicWhere }),
        ]);

        return NextResponse.json({
          articles: articles.map((item) => ({
            id: item.article.id,
            title: item.title,
            slug: item.slug,
            excerpt: item.excerpt,
            imageUrl: item.article.imageUrl,
            publishedAt: item.article.publishedAt,
            views: item.article.views,
            category: item.article.category,
          })),
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasMore: skip + articles.length < totalCount,
          },
        });
      }

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

    if (locale === "en") {
      const searchWhere = {
        locale: "en" as const,
        article: {
          status: "PUBLISHED" as const,
        },
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" as const } },
          {
            excerpt: { contains: searchTerm, mode: "insensitive" as const },
          },
        ],
      };

      const [articles, totalCount] = await Promise.all([
        db.articleTranslation.findMany({
          where: searchWhere,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            article: {
              select: {
                id: true,
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
            },
          },
          orderBy: [
            { article: { trendScore: "desc" } },
            { article: { publishedAt: "desc" } },
          ],
          skip,
          take: limit,
        }),
        db.articleTranslation.count({ where: searchWhere }),
      ]);

      return NextResponse.json({
        articles: articles.map((item) => ({
          id: item.article.id,
          title: item.title,
          slug: item.slug,
          excerpt: item.excerpt,
          imageUrl: item.article.imageUrl,
          publishedAt: item.article.publishedAt,
          views: item.article.views,
          category: item.article.category,
        })),
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
      ],
    };

    const [articles, totalCount] = await Promise.all([
      db.article.findMany({
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
      }),
      db.article.count({
        where: searchWhere,
      }),
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
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Arama sırasında bir hata oluştu" },
      { status: 500 },
    );
  }
}
