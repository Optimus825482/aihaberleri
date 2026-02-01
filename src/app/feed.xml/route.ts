/**
 * RSS Feed Route
 * Generates RSS 2.0 feed with WebSub/PubSubHubbub support for faster Google indexing
 * 
 * WebSub enables real-time content notifications to search engines
 * Reference: https://www.w3.org/TR/websub/
 */

import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
const SITE_NAME = "AI Haberleri";
const SITE_DESCRIPTION = "Yapay Zeka ve Teknoloji Haberleri";

// WebSub hubs for real-time content distribution
const WEBSUB_HUBS = [
  "https://pubsubhubbub.appspot.com/",
  "https://pubsubhubbub.superfeedr.com/",
];

export async function GET() {
  try {
    // Fetch latest 50 published articles
    const articles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        imageUrl: true,
        publishedAt: true,
        updatedAt: true,
        category: {
          select: { name: true },
        },
        keywords: true,
      },
    });

    // Build RSS XML
    const lastBuildDate = articles[0]?.publishedAt?.toUTCString() || new Date().toUTCString();
    
    const rssItems = articles.map((article) => {
      const pubDate = article.publishedAt?.toUTCString() || new Date().toUTCString();
      const articleUrl = `${SITE_URL}/news/${article.slug}`;
      
      // Clean HTML from content for description
      const description = article.excerpt || 
        article.content?.replace(/<[^>]*>/g, "").substring(0, 300) + "...";
      
      // Escape XML special characters
      const escapeXml = (str: string) => 
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

      return `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
      <category>${escapeXml(article.category?.name || "Yapay Zeka")}</category>
      ${article.imageUrl ? `<enclosure url="${article.imageUrl}" type="image/jpeg" length="0"/>` : ""}
      <source url="${SITE_URL}/feed.xml">${SITE_NAME}</source>
    </item>`;
    }).join("");

    // WebSub hub links for real-time notifications
    const hubLinks = WEBSUB_HUBS.map(hub => 
      `<atom:link rel="hub" href="${hub}"/>`
    ).join("\n    ");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>tr</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>AI Haberleri RSS Generator</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <ttl>60</ttl>
    
    <!-- WebSub/PubSubHubbub for real-time indexing -->
    ${hubLinks}
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    
    <!-- Site branding -->
    <image>
      <url>${SITE_URL}/logo.png</url>
      <title>${SITE_NAME}</title>
      <link>${SITE_URL}</link>
    </image>
    ${rssItems}
  </channel>
</rss>`;

    // Return RSS with appropriate headers
    return new NextResponse(rss, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        // WebSub discovery headers
        "Link": WEBSUB_HUBS.map(hub => `<${hub}>; rel="hub"`).join(", ") + 
                `, <${SITE_URL}/feed.xml>; rel="self"`,
      },
    });
  } catch (error) {
    console.error("RSS feed generation error:", error);
    return new NextResponse("Error generating RSS feed", { status: 500 });
  }
}
