/**
 * Google News Sitemap
 * News-specific sitemap for Google News indexing
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 */

import { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

interface NewsArticle {
  slug: string;
  title: string;
  publishedAt: Date;
  enSlug: string | null;
  enTitle: string | null;
}

export default async function newsSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

  // Skip database queries during build
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return [];
  }

  try {
    // Get articles published in last 48 hours (Google News requirement)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const articles = await db.$queryRaw<NewsArticle[]>`
      SELECT 
        a.slug,
        a.title,
        a."publishedAt",
        at.slug as "enSlug",
        at.title as "enTitle"
      FROM "Article" a
      LEFT JOIN "ArticleTranslation" at ON a.id = at."articleId" AND at.locale = 'en'
      WHERE a.status = 'PUBLISHED' 
        AND a."publishedAt" IS NOT NULL
        AND a."publishedAt" >= ${twoDaysAgo}
      ORDER BY a."publishedAt" DESC
      LIMIT 1000
    `;

    const sitemapEntries: MetadataRoute.Sitemap = [];

    // Turkish articles
    for (const article of articles) {
      sitemapEntries.push({
        url: `${baseUrl}/news/${article.slug}`,
        lastModified: article.publishedAt,
        changeFrequency: "hourly",
        priority: 0.9,
        // @ts-ignore - news extension
        news: {
          publication: {
            name: "AI Haberleri",
            language: "tr",
          },
          publication_date: article.publishedAt.toISOString(),
          title: article.title,
        },
      });

      // English translation if exists
      if (article.enSlug && article.enTitle) {
        sitemapEntries.push({
          url: `${baseUrl}/en/news/${article.enSlug}`,
          lastModified: article.publishedAt,
          changeFrequency: "hourly",
          priority: 0.9,
          // @ts-ignore - news extension
          news: {
            publication: {
              name: "AI News",
              language: "en",
            },
            publication_date: article.publishedAt.toISOString(),
            title: article.enTitle,
          },
        });
      }
    }

    return sitemapEntries;
  } catch (error) {
    console.error("News sitemap generation error:", error);
    return [];
  }
}
