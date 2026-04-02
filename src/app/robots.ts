import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          // Search pages → duplicate content risk
          "/search",
          "/en/search",
          "/arama",
        ],
      },
      {
        // Bing full crawl allowed (no search restriction needed for Bing)
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      {
        // Google News bot — allow all content pages for news indexing
        userAgent: "Googlebot-News",
        allow: "/",
        disallow: ["/admin/", "/api/", "/search", "/en/search"],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/news-sitemap.xml`],
  };
}
