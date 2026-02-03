import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEOAnalyzerAgent } from "@/agents/seo/analyzer.agent";

/**
 * POST /api/admin/articles/[id]/apply-seo
 * Apply selected SEO optimizations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    // Recalculate SEO score
    const analyzer = new SEOAnalyzerAgent();
    const updatedArticle = await db.article.findUnique({ where: { id } });

    if (updatedArticle) {
      const analysis = await analyzer.analyze({
        title: updatedArticle.title,
        content: updatedArticle.content,
        excerpt: updatedArticle.excerpt,
        metaTitle: updatedArticle.metaTitle,
        metaDescription: updatedArticle.metaDescription,
        keywords: updatedArticle.keywords,
        slug: updatedArticle.slug,
      });

      await db.article.update({
        where: { id },
        data: { seoScore: analysis.score },
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
      newScore: updatedArticle ? analysis.score : null,
    });
  } catch (error) {
    console.error("Apply SEO error:", error);
    return NextResponse.json(
      { error: "Değişiklikler uygulanamadı" },
      { status: 500 },
    );
  }
}
