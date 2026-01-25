import { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Force dynamic rendering (skip at build time)
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

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
    // Get all published articles
    const articles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    type ArticleItem = (typeof articles)[0];

    // Get all categories
    const categories = await db.category.findMany({
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    type CategoryItem = (typeof categories)[0];

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "hourly",
        priority: 1,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      },
    ];

    // Article pages
    const articlePages: MetadataRoute.Sitemap = articles.map(
      (article: ArticleItem) => ({
        url: `${baseUrl}/news/${article.slug}`,
        lastModified: article.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      }),
    );

    // Category pages
    const categoryPages: MetadataRoute.Sitemap = categories.map(
      (category: CategoryItem) => ({
        url: `${baseUrl}/category/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
      }),
    );

    return [...staticPages, ...categoryPages, ...articlePages];
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
