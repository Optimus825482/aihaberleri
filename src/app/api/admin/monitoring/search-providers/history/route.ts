import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/monitoring/search-providers/history?range=24h
 *
 * Historical search provider metriklerini döndürür
 *
 * Query Parameters:
 * - range: "1h" | "6h" | "24h" | "7d" | "30d" (default: "24h")
 *
 * Response:
 * {
 *   history: Array<{
 *     timestamp: string,
 *     brave: number,
 *     tavily: number,
 *     searxng: number
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add auth check when NextAuth is configured
    // const session = await getServerSession(authOptions);
    // if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    //   return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "24h";

    // Time range hesaplama
    const now = new Date();
    let startTime = new Date();
    let bucketSize = 5 * 60 * 1000; // 5 minutes default

    switch (range) {
      case "1h":
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        bucketSize = 5 * 60 * 1000; // 5 minutes
        break;
      case "6h":
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        bucketSize = 15 * 60 * 1000; // 15 minutes
        break;
      case "24h":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        bucketSize = 60 * 60 * 1000; // 1 hour
        break;
      case "7d":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        bucketSize = 6 * 60 * 60 * 1000; // 6 hours
        break;
      case "30d":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        bucketSize = 24 * 60 * 60 * 1000; // 1 day
        break;
    }

    // Database'den metrics çek
    const metrics = await db.searchProviderMetric.findMany({
      where: {
        timestamp: {
          gte: startTime,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // Bucket'lara göre grupla
    const buckets = new Map<
      string,
      { brave: number; tavily: number; searxng: number; count: number }
    >();

    metrics.forEach((metric) => {
      const bucketTime = Math.floor(metric.timestamp.getTime() / bucketSize);
      const bucketKey = new Date(bucketTime * bucketSize).toISOString();

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          brave: 0,
          tavily: 0,
          searxng: 0,
          count: 0,
        });
      }

      const bucket = buckets.get(bucketKey)!;

      // Request sayılarını topla
      if (metric.provider === "brave") {
        bucket.brave += metric.requests;
      } else if (metric.provider === "tavily") {
        bucket.tavily += metric.requests;
      } else if (metric.provider === "searxng") {
        bucket.searxng += metric.requests;
      }

      bucket.count++;
    });

    // Array'e çevir ve sırala
    const history = Array.from(buckets.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        brave: data.brave,
        tavily: data.tavily,
        searxng: data.searxng,
      }))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    // Eğer veri yoksa, boş bucket'lar oluştur
    if (history.length === 0) {
      const emptyBuckets = [];
      const bucketCount = Math.ceil(
        (now.getTime() - startTime.getTime()) / bucketSize,
      );

      for (let i = 0; i < Math.min(bucketCount, 100); i++) {
        const bucketTime = new Date(startTime.getTime() + i * bucketSize);
        emptyBuckets.push({
          timestamp: bucketTime.toISOString(),
          brave: 0,
          tavily: 0,
          searxng: 0,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          history: emptyBuckets,
          range,
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        history,
        range,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Search provider history error:", error);
    return NextResponse.json(
      { error: "Search provider geçmişi alınamadı" },
      { status: 500 },
    );
  }
}
