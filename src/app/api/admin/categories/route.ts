import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const categories = await db.category.findMany({
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Categories fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, order = 0 } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "İsim ve slug gerekli" },
        { status: 400 },
      );
    }

    // Check if slug already exists
    const existing = await db.category.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Bu slug zaten kullanılıyor" },
        { status: 400 },
      );
    }

    const category = await db.category.create({
      data: {
        name,
        slug,
        description,
        order,
      },
    });

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Category create error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, slug, description, order } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Kategori ID gerekli" },
        { status: 400 },
      );
    }

    // If slug is being updated, check if it's already in use
    if (slug) {
      const existing = await db.category.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Bu slug zaten kullanılıyor" },
          { status: 400 },
        );
      }
    }

    const category = await db.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Category update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Kategori ID gerekli" },
        { status: 400 },
      );
    }

    // Check if category has articles
    const articleCount = await db.article.count({
      where: { categoryId: id },
    });

    if (articleCount > 0) {
      return NextResponse.json(
        {
          error: `Bu kategoride ${articleCount} haber var. Önce haberleri başka kategoriye taşıyın.`,
        },
        { status: 400 },
      );
    }

    await db.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Kategori silindi",
    });
  } catch (error) {
    console.error("Category delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
