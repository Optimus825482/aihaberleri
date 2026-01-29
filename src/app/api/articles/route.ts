import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import { submitArticleToIndexNow } from "@/lib/seo/indexnow";

// GET - List all articles with server-side pagination, search, and filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50"); // Default 50 to maintain backward compat
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    // Build where clause
    const where: any = {};

    // Search filter (title contains)
    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Category filter
    if (category) {
      const categoryRecord = await db.category.findUnique({
        where: { slug: category },
      });

      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      }
    }

    // Get total count for pagination metadata
    const total = await db.article.count({ where });

    const articles = await db.article.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        status: true,
        views: true,
        publishedAt: true,
        score: true,
        createdAt: true,
        facebookShared: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: articles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Haber listesi hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

// POST - Create new article
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { title, excerpt, content, category, imageUrl, keywords } = body;

    // Find or create category
    const categorySlug = generateSlug(category);
    let categoryRecord = await db.category.findUnique({
      where: { slug: categorySlug },
    });

    if (!categoryRecord) {
      categoryRecord = await db.category.create({
        data: {
          name: category,
          slug: categorySlug,
          description: `${category} ile ilgili haberler`,
        },
      });
    }

    // Create article
    const slug = generateSlug(title);
    const article = await db.article.create({
      data: {
        title,
        slug: `${slug}-${Date.now()}`,
        excerpt,
        content,
        imageUrl: imageUrl || null,
        categoryId: categoryRecord.id,
        status: "PUBLISHED",
        publishedAt: new Date(),
        keywords: keywords || [],
        metaTitle: title,
        metaDescription: excerpt,
      },
    });

    // Auto-submit to IndexNow
    if (article.status === "PUBLISHED") {
      submitArticleToIndexNow(article.slug).catch((err) =>
        console.error("IndexNow manual auto-submit error:", err),
      );
    }

    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error("Haber oluşturma hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
