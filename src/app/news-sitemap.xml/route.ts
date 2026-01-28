import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ArticleWithTranslation {
  title: string;
  slug: string;
  publishedAt: Date | null;
  enTitle: string | null;
  enSlug: string | null;
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "AI Haberleri";

  try {
    // Get articles published in the last 48 hours (Google News requirement)
    // Include English translations
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const articles = await db.$queryRaw<ArticleWithTranslation[]>`
      SELECT 
        a.title,
        a.slug,
        a."publishedAt",
        at.title as "enTitle",
        at.slug as "enSlug"
      FROM "Article" a
      LEFT JOIN "ArticleTranslation" at ON a.id = at."articleId" AND at.locale = 'en'
      WHERE a.status = 'PUBLISHED' 
        AND a."publishedAt" IS NOT NULL
        AND a."publishedAt" >= ${twoDaysAgo}
      ORDER BY a."publishedAt" DESC
    `;

    // Build Turkish article entries
    const turkishEntries = articles
      .map(
        (article: ArticleWithTranslation) => `
  <url>
    <loc>${baseUrl}/news/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${siteName}</news:name>
        <news:language>tr</news:language>
      </news:publication>
      <news:publication_date>${article.publishedAt?.toISOString()}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>
  </url>`,
      )
      .join("");

    // Build English article entries (only for translated articles)
    const englishEntries = articles
      .filter(
        (article: ArticleWithTranslation) => article.enSlug && article.enTitle,
      )
      .map(
        (article: ArticleWithTranslation) => `
  <url>
    <loc>${baseUrl}/en/news/${article.enSlug}</loc>
    <news:news>
      <news:publication>
        <news:name>AI News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${article.publishedAt?.toISOString()}</news:publication_date>
      <news:title>${escapeXml(article.enTitle!)}</news:title>
    </news:news>
  </url>`,
      )
      .join("");

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${turkishEntries}
${englishEntries}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, s-maxage=1200, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("News Sitemap error:", error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      {
        headers: { "Content-Type": "application/xml" },
      },
    );
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
