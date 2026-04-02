/**
 * English RSS Feed
 * Route: /en/feed.xml
 * For Google News, RSS readers, and content aggregators (EN audience)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

  try {
    // Get EN translations for published articles
    const translations = await db.articleTranslation.findMany({
      where: {
        locale: "en",
        article: {
          status: "PUBLISHED",
          publishedAt: { not: null },
        },
      },
      include: {
        article: {
          select: {
            slug: true,
            imageUrl: true,
            publishedAt: true,
            updatedAt: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: {
        article: { publishedAt: "desc" },
      },
      take: 50,
    });

    const items = translations
      .map((t) => {
        const pubDate = t.article.publishedAt?.toUTCString() ?? "";
        const imageTag = t.article.imageUrl
          ? `<media:content url="${escapeXml(t.article.imageUrl)}" medium="image" />`
          : "";

        return `    <item>
      <title><![CDATA[${t.title}]]></title>
      <link>${baseUrl}/en/news/${t.slug}</link>
      <guid isPermaLink="true">${baseUrl}/en/news/${t.slug}</guid>
      <description><![CDATA[${t.excerpt || ""}]]></description>
      <pubDate>${pubDate}</pubDate>
      <category><![CDATA[${t.article.category?.name ?? "AI"}]]></category>
      ${imageTag}
    </item>`;
      })
      .join("\n");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>AI News - Latest Artificial Intelligence Updates</title>
    <link>${baseUrl}/en</link>
    <description>Stay up to date with the latest artificial intelligence news, machine learning breakthroughs, and AI industry updates.</description>
    <language>en</language>
    <copyright>Copyright ${new Date().getFullYear()} AI Haberleri</copyright>
    <managingEditor>info@aihaberleri.org (AI Haberleri)</managingEditor>
    <webMaster>info@aihaberleri.org (AI Haberleri)</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    <atom:link href="${baseUrl}/en/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${baseUrl}/logos/brand/ai-logo-dark.webp</url>
      <title>AI News</title>
      <link>${baseUrl}/en</link>
    </image>
${items}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("EN RSS feed error:", error);
    return new NextResponse("Feed generation failed", { status: 500 });
  }
}
