import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const EN_CATEGORY_SLUG_TRANSLATIONS: Record<string, string> = {
  "yapay-zeka-haberleri": "AI News",
  "yapay-zeka": "Artificial Intelligence",
  "yapay-zeka-modelleri": "AI Models",
  "makine-ogrenmesi": "Machine Learning",
  "dogal-dil-isleme": "Natural Language Processing",
  "bilgisayarli-goru": "Computer Vision",
  robotik: "Robotics",
  "robotik-ve-otonom-sistemler": "Robotics and Autonomous Systems",
  "yapay-zeka-etigi": "AI Ethics",
  "etik-guvenlik-ve-regulasyon": "Ethics, Security and Regulation",
  "yapay-zeka-araclari": "AI Tools",
  "yapay-zeka-araclari-ve-urunler": "AI Tools and Products",
  "sektor-haberleri": "Industry News",
  "sektor-ve-is-dunyasi": "Industry and Business",
  arastirma: "Research",
  "bilim-ve-arastirma": "Science and Research",
  "yapay-zeka-ve-toplum": "AI and Society",
};

const EN_CATEGORY_NAME_TRANSLATIONS: Record<string, string> = {
  "Yapay Zeka": "Artificial Intelligence",
  "Yapay Zeka Modelleri": "AI Models",
  "Sektör ve İş Dünyası": "Industry and Business",
  "Yapay Zeka Araçları ve Ürünler": "AI Tools and Products",
  "Robotik ve Otonom Sistemler": "Robotics and Autonomous Systems",
  "Etik, Güvenlik ve Regülasyon": "Ethics, Security and Regulation",
  "Bilim ve Araştırma": "Science and Research",
  "Yapay Zeka ve Toplum": "AI and Society",
};

function getEnglishCategoryLabel(category: { name: string; slug: string }) {
  return (
    EN_CATEGORY_SLUG_TRANSLATIONS[category.slug] ||
    EN_CATEGORY_NAME_TRANSLATIONS[category.name] ||
    category.name
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "week";
    const limit = parseInt(searchParams.get("limit") || "5");
    const sortBy = searchParams.get("sort") || "views"; // "views" | "trend"
    const locale = searchParams.get("locale"); // "tr" | "en" — optional

    // Calculate date limit based on period
    const dateLimit = new Date();
    const dateWhere: Record<string, unknown> = {};

    if (period === "today") {
      dateLimit.setHours(0, 0, 0, 0);
      dateWhere.publishedAt = { gte: dateLimit };
    } else if (period === "week") {
      dateLimit.setDate(dateLimit.getDate() - 7);
      dateWhere.publishedAt = { gte: dateLimit };
    } else if (period === "month") {
      dateLimit.setDate(dateLimit.getDate() - 30);
      dateWhere.publishedAt = { gte: dateLimit };
    }
    // "all" — no date filter

    if (locale === "en") {
      const whereTranslation: any = {
        locale: "en",
        article: {
          status: "PUBLISHED",
          ...dateWhere,
        },
      };

      // For "all" and "month" periods, prioritize views (popularity)
      // For "week" and "today", prioritize trendScore (momentum)
      const useViewsSortEn =
        sortBy === "views" || period === "all" || period === "month";
      const orderByTranslation: any = useViewsSortEn
        ? [{ article: { views: "desc" } }, { article: { trendScore: "desc" } }]
        : [{ article: { trendScore: "desc" } }, { article: { views: "desc" } }];

      const translations = await db.articleTranslation.findMany({
        where: whereTranslation,
        orderBy: orderByTranslation,
        take: limit,
        include: {
          article: {
            select: {
              id: true,
              imageUrl: true,
              views: true,
              publishedAt: true,
              trendScore: true,
              isTrending: true,
              category: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      const articles = translations.map((translation) => ({
        id: translation.article.id,
        title: translation.title,
        slug: translation.slug,
        excerpt: translation.excerpt,
        imageUrl: translation.article.imageUrl,
        views: translation.article.views,
        publishedAt: translation.article.publishedAt,
        trendScore: translation.article.trendScore,
        isTrending: translation.article.isTrending,
        category: {
          ...translation.article.category,
          name: getEnglishCategoryLabel(translation.article.category),
        },
      }));

      return NextResponse.json({
        articles,
        period,
        sortBy,
        count: articles.length,
      });
    }

    const whereClause: any = {
      status: "PUBLISHED",
      ...(locale ? { language: locale } : {}),
      ...dateWhere,
    };

    // Sort by trend score or views
    // For "all" and "month" periods, prioritize views (all-time/monthly popularity)
    // For "week" and "today", prioritize trendScore (current momentum)
    const useViewsSort =
      sortBy === "views" || period === "all" || period === "month";
    const orderBy = useViewsSort
      ? [{ views: "desc" as const }, { trendScore: "desc" as const }]
      : [{ trendScore: "desc" as const }, { views: "desc" as const }];

    const articles = await db.article.findMany({
      where: whereClause,
      orderBy,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        views: true,
        publishedAt: true,
        trendScore: true,
        isTrending: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      articles,
      period,
      sortBy,
      count: articles.length,
    });
  } catch (error) {
    console.error("Most read API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch most read articles", articles: [] },
      { status: 500 },
    );
  }
}
