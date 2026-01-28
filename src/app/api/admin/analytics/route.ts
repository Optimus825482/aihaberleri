import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. General Stats
    const totalVisits = await db.articleAnalytics.count();

    const avgDurationResult = await db.articleAnalytics.aggregate({
      _avg: {
        duration: true,
      },
    });
    const avgDuration = Math.round(avgDurationResult._avg.duration || 0);

    // 2. Top Articles by Average Duration (Engagement)
    // Prisma doesn't support complex group by with relation fetching easily,
    // so we might need raw query or post-processing.
    // Let's use raw query for performance.

    const topArticles = await db.$queryRaw`
      SELECT 
        a.id, 
        a.title, 
        a.slug,
        COUNT(aa.id) as visits, 
        AVG(aa.duration) as avg_duration 
      FROM "Article" a
      JOIN "ArticleAnalytics" aa ON a.id = aa."articleId"
      GROUP BY a.id, a.title, a.slug
      ORDER BY avg_duration DESC
      LIMIT 10
    `;

    // 3. Recent Visits
    const recentVisits = await db.articleAnalytics.findMany({
      take: 20,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        article: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
    });

    // 4. Device & Browser Stats aggregation
    const analyticsData = await db.articleAnalytics.findMany({
      select: {
        userAgent: true,
        ipAddress: true,
      },
      take: 1000,
      orderBy: { createdAt: "desc" },
    });

    const browserStats: Record<string, number> = {};
    const deviceStats: Record<string, number> = {};
    const osStats: Record<string, number> = {};

    analyticsData.forEach((item) => {
      const ua = item.userAgent || "";

      // Browser Detection
      let browser = "Diğer";
      if (ua.includes("Edg/")) browser = "Edge";
      else if (ua.includes("Chrome/") && !ua.includes("Edg/"))
        browser = "Chrome";
      else if (ua.includes("Safari/") && !ua.includes("Chrome/"))
        browser = "Safari";
      else if (ua.includes("Firefox/")) browser = "Firefox";

      browserStats[browser] = (browserStats[browser] || 0) + 1;

      // Device Detection
      let device = "Masaüstü";
      if (/Mobile|Android|iPhone/i.test(ua)) device = "Mobil";
      else if (/Tablet|iPad/i.test(ua)) device = "Tablet";

      deviceStats[device] = (deviceStats[device] || 0) + 1;

      // OS Detection
      let os = "Diğer";
      if (ua.includes("Win")) os = "Windows";
      else if (ua.includes("Mac")) os = "macOS";
      else if (ua.includes("Linux")) os = "Linux";
      else if (ua.includes("Android")) os = "Android";
      else if (ua.includes("iOS") || ua.includes("iPhone")) os = "iOS";

      osStats[os] = (osStats[os] || 0) + 1;
    });

    // 5. Geo Location (Via IP-API Batch)
    const uniqueIps = Array.from(
      new Set(
        analyticsData
          .map((a) => a.ipAddress)
          .filter((ip) => ip && ip !== "::1" && ip !== "127.0.0.1"),
      ),
    ).slice(0, 50); // Limit 50 IPs

    const countryStats: Record<string, number> = {};

    if (uniqueIps.length > 0) {
      try {
        const geoResponse = await fetch("http://ip-api.com/batch", {
          method: "POST",
          body: JSON.stringify(
            uniqueIps.map((ip) => ({ query: ip, fields: "country" })),
          ),
        });
        const geoData = await geoResponse.json();

        if (Array.isArray(geoData)) {
          geoData.forEach((geo: any) => {
            if (geo && geo.country) {
              // Normalize country names if needed, or translate
              const country =
                geo.country === "Turkey" ? "Türkiye" : geo.country;
              countryStats[country] = (countryStats[country] || 0) + 1;
            }
          });
        }
      } catch (error) {
        console.error("GeoIP Error:", error);
      }
    }

    const totalCount = analyticsData.length;
    const formatStats = (stats: Record<string, number>) => {
      return Object.entries(stats)
        .map(([name, value]) => ({
          name,
          value,
          percentage:
            totalCount > 0 ? Math.round((value / totalCount) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value);
    };

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalVisits,
          avgDuration,
        },
        topArticles: JSON.parse(
          JSON.stringify(topArticles, (key, value) =>
            typeof value === "bigint" ? value.toString() : value,
          ),
        ),
        recentVisits,
        stats: {
          browser: formatStats(browserStats),
          device: formatStats(deviceStats),
          os: formatStats(osStats),
          country: formatStats(countryStats),
        },
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
