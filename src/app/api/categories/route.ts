import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

// GET - List all categories
export async function GET() {
  try {
    // 🚀 CACHE: Try to get from cache (30 min TTL)
    const cacheKey = "categories:list";
    const cache = getCache();
    const cached = await cache.get<any>(cacheKey, {
      tags: ["categories"],
    });

    if (cached) {
      const response = NextResponse.json(cached);
      response.headers.set("X-Cache", "HIT");
      return response;
    }

    const categories = await db.category.findMany({
      orderBy: { order: "asc" },
    });

    const responseData = {
      success: true,
      data: categories,
    };

    // 🚀 CACHE: Store in cache (30 min TTL - categories change rarely)
    await cache.set(cacheKey, responseData, {
      ttl: 1800, // 30 minutes
      tags: ["categories"],
    });

    const response = NextResponse.json(responseData);
    response.headers.set("X-Cache", "MISS");
    return response;
  } catch (error) {
    console.error("Kategori listesi hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
