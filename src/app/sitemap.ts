import { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Force dynamic rendering (skip at build time)
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

// Type for article with translation
interface ArticleWithTranslation {
  slug: string;
  updatedAt: Date;
  enSlug: string | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Skip database queries during build
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "hourly",
        priority: 1,
      },
    ];
  }

  try {
    // Get all published articles with their English translations using raw query
    const articles = await db.$queryRaw<ArticleWithTranslation[]>`
      SELECT 
        a.slug,
        a."updatedAt",
        at.slug as "enSlug"
      FROM "Article" a
      LEFT JOIN "ArticleTranslation" at ON a.id = at."articleId" AND at.locale = 'en'
      WHERE a.status = 'PUBLISHED' AND a."publishedAt" IS NOT NULL
      ORDER BY a."publishedAt" DESC
    `;

    // Get all categories
    const categories = await db.category.findMany({
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    type CategoryItem = (typeof categories)[0];

    // Static pages with alternates
    const staticPages: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "hourly",
        priority: 1,
        alternates: {
          languages: {
            tr: baseUrl,
            en: `${baseUrl}/en`,
          },
        },
      },
      {
        url: `${baseUrl}/en`,
        lastModified: new Date(),
        changeFrequency: "hourly",
        priority: 1,
        alternates: {
          languages: {
            tr: baseUrl,
            en: `${baseUrl}/en`,
          },
        },
      },
      {
        url: `${baseUrl}/about`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
        alternates: {
          languages: {
            tr: `${baseUrl}/about`,
            en: `${baseUrl}/en/about`,
          },
        },
      },
    ];

    // Turkish article pages
    const turkishArticlePages: MetadataRoute.Sitemap = articles.map(
      (article) => ({
        url: `${baseUrl}/news/${article.slug}`,
        lastModified: article.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
        alternates: article.enSlug
          ? {
              languages: {
                tr: `${baseUrl}/news/${article.slug}`,
                en: `${baseUrl}/en/news/${article.enSlug}`,
              },
            }
          : undefined,
      }),
    );

    // English article pages (only for articles with translations)
    const englishArticlePages: MetadataRoute.Sitemap = articles
      .filter((article) => article.enSlug)
      .map((article) => ({
        url: `${baseUrl}/en/news/${article.enSlug}`,
        lastModified: article.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
        alternates: {
          languages: {
            tr: `${baseUrl}/news/${article.slug}`,
            en: `${baseUrl}/en/news/${article.enSlug}`,
          },
        },
      }));

    // Category pages (Turkish)
    const categoryPages: MetadataRoute.Sitemap = categories.map(
      (category: CategoryItem) => ({
        url: `${baseUrl}/category/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
        alternates: {
          languages: {
            tr: `${baseUrl}/category/${category.slug}`,
            en: `${baseUrl}/en/category/${category.slug}`,
          },
        },
      }),
    );

    // Category pages (English)
    const englishCategoryPages: MetadataRoute.Sitemap = categories.map(
      (category: CategoryItem) => ({
        url: `${baseUrl}/en/category/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
        alternates: {
          languages: {
            tr: `${baseUrl}/category/${category.slug}`,
            en: `${baseUrl}/en/category/${category.slug}`,
          },
        },
      }),
    );

    return [
      ...staticPages,
      ...categoryPages,
      ...englishCategoryPages,
      ...turkishArticlePages,
      ...englishArticlePages,
    ];
  } catch (error) {
    console.error("Sitemap generation error:", error);
    // Return minimal sitemap on error
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "hourly",
        priority: 1,
      },
    ];
  }
}
