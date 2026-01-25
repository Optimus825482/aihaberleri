/**
 * Google News Sitemap
 * https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 *
 * Google News için özel sitemap - Son 48 saatteki haberler
 */

import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Force dynamic rendering (skip at build time)
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "AI Haberleri";

    // Skip database queries during build
    if (process.env.SKIP_ENV_VALIDATION === "1") {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
</urlset>`;

      return new NextResponse(emptyXml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      });
    }

    // Son 48 saatteki published article'ları al
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const articles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          not: null,
          gte: twoDaysAgo,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    // XML oluştur
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles
  .map((article) => {
    const articleUrl = `${baseUrl}/news/${article.slug}`;
    const publishDate = article.publishedAt
      ? new Date(article.publishedAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    return `  <url>
    <loc>${escapeXml(articleUrl)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(siteName)}</news:name>
        <news:language>tr</news:language>
      </news:publication>
      <news:publication_date>${publishDate}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
      <news:keywords>${escapeXml(article.keywords.join(", "))}</news:keywords>
    </news:news>
  </url>`;
  })
  .join("\n")}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600", // 1 saat cache
      },
    });
  } catch (error) {
    console.error("❌ Error generating news sitemap:", error);
    return new NextResponse("Error generating news sitemap", { status: 500 });
  }
}

/**
 * XML special characters'ı escape et
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
