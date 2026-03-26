import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { analyzeArticleSEO, saveSEORecommendations } from "@/lib/seo-analyzer";

export async function POST(request: Request) {
  // Auth check
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    // Makaleleri getir
    const articles = await prisma.article.findMany({
      where:
        category && category !== "all"
          ? {
              category: {
                slug: category,
              },
            }
          : undefined,
      select: {
        id: true,
        title: true,
        content: true,
        excerpt: true,
        slug: true,
        imageUrl: true,
        metaDescription: true,
        keywords: true, // Changed from metaKeywords to keywords
      },
    });

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Her makale için SEO skorunu hesapla
    for (const article of articles) {
      try {
        const result = await analyzeArticleSEO(article.id);

        // Öneriler zaten analyzeArticleSEO içinde kaydediliyor
        processed++;
      } catch (error) {
        failed++;
        errors.push(
          `${article.title}: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        );
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        success: true,
        processed,
        failed,
        duration,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Bulk recalculate error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Toplu hesaplama başarısız",
      },
      { status: 500 },
    );
  }
}
