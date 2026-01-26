import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import slugify from "slugify";
import { submitArticleToIndexNow } from "@/lib/seo/indexnow";

// GET - Get single article
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;

    const article = await db.article.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Haber bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error("Haber getirme hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

// PUT - Update article
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const {
      title,
      excerpt,
      content,
      imageUrl,
      categoryId,
      status,
      keywords,
      metaTitle,
      metaDescription,
    } = body;

    // Validate required fields
    if (!title || !excerpt || !content || !categoryId) {
      return NextResponse.json(
        { success: false, error: "Zorunlu alanlar eksik" },
        { status: 400 },
      );
    }

    // Generate slug from title
    const slug = slugify(title, {
      lower: true,
      strict: true,
      locale: "tr",
    });

    // Update article
    const article = await db.article.update({
      where: { id },
      data: {
        title,
        slug,
        excerpt,
        content,
        imageUrl: imageUrl || null,
        categoryId,
        status,
        keywords: keywords || [],
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

    // Auto-submit to IndexNow if published
    if (article.status === "PUBLISHED") {
      submitArticleToIndexNow(article.slug).catch((err) =>
        console.error("IndexNow update auto-submit error:", err),
      );
    }

    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error("Haber güncelleme hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete article
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Check if article exists
    const existingArticle = await db.article.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      return NextResponse.json(
        { success: false, error: "Haber bulunamadı" },
        { status: 404 },
      );
    }

    // Delete article
    await db.article.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Haber başarıyla silindi",
    });
  } catch (error) {
    console.error("Haber silme hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
