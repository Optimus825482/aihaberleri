import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Arama sorgusu en az 2 karakter olmalıdır" },
        { status: 400 }
      );
    }

    const searchTerm = query.trim();
    const skip = (page - 1) * limit;

    // Search in title, excerpt, and content
    const articles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" } },
          { excerpt: { contains: searchTerm, mode: "insensitive" } },
          { content: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        publishedAt: true,
        views: true,
        trendScore: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [
        { trendScore: "desc" },
        { publishedAt: "desc" },
      ],
      skip,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await db.article.count({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" } },
          { excerpt: { contains: searchTerm, mode: "insensitive" } },
          { content: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
    });

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + articles.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Arama sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
