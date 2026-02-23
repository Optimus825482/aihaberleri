import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateSEOScore } from "@/lib/seo-calculator";
import { requireAdminAuth } from "@/lib/admin-auth";

/**
 * POST /api/admin/articles/[id]/apply-seo
 * Apply selected SEO optimizations
 *
 * DEĞİŞİKLİK: LLM-based SEOAnalyzerAgent kaldırıldı.
 * Skor artık %100 deterministik calculateSEOScore ile hesaplanıyor.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }
    const { id } = await params;
    const body = await request.json();
    const { fields = [], diffs = [] } = body;

    // Validate input
    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: "En az bir alan seçilmelidir" },
        { status: 400 },
      );
    }

    // Get article
    const article = await db.article.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json({ error: "Makale bulunamadı" }, { status: 404 });
    }

    // Build update data from selected diffs
    const updateData: any = {};

    for (const field of fields) {
      const diff = diffs.find((d: any) => d.field === field);
      if (diff) {
        if (field === "keywords") {
          // Parse keywords from comma-separated string
          updateData.keywords = diff.after
            .split(",")
            .map((k: string) => k.trim())
            .filter(Boolean);
        } else {
          updateData[field] = diff.after;
        }
      }
    }

    // Apply updates
    await db.article.update({
      where: { id },
      data: updateData,
    });

    // Deterministik SEO skoru hesapla (LLM kullanmıyoruz!)
    const updatedArticle = await db.article.findUnique({ where: { id } });
    let newScore: number | null = null;

    if (updatedArticle) {
      const seoResult = calculateSEOScore({
        title: updatedArticle.title,
        content: updatedArticle.content || "",
        excerpt: updatedArticle.excerpt || "",
        metaDescription: updatedArticle.metaDescription,
        slug: updatedArticle.slug,
        keywords: updatedArticle.keywords,
        imageUrl: updatedArticle.imageUrl,
      });

      newScore = seoResult.score;

      await db.article.update({
        where: { id },
        data: { seoScore: seoResult.score },
      });

      // Clear resolved recommendations
      await db.sEORecommendation.updateMany({
        where: {
          articleId: id,
          isResolved: false,
        },
        data: {
          isResolved: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      fieldsApplied: fields.length,
      newScore,
    });
  } catch (error) {
    console.error("Apply SEO error:", error);
    return NextResponse.json(
      { error: "Değişiklikler uygulanamadı" },
      { status: 500 },
    );
  }
}
