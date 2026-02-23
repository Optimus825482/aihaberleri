import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEOPipelineService } from "@/services/seo-pipeline.service";

/**
 * POST /api/admin/articles/[id]/optimize
 *
 * YENİ PIPELINE: Evaluate → Optimize → Re-Evaluate → Validate
 * - Agent seçimi YOK — pipeline her şeyi otomatik yapar
 * - Mode seçimi YOK — her zaman review (kullanıcı onaylar)
 * - Skor ASLA düşmez — validation gate ile garanti
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Get article
    const article = await db.article.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json({ error: "Makale bulunamadı" }, { status: 404 });
    }

    // Pipeline'ı çalıştır
    const pipeline = new SEOPipelineService();
    const result = await pipeline.run({
      title: article.title,
      content: article.content || "",
      excerpt: article.excerpt || null,
      metaDescription: article.metaDescription || null,
      slug: article.slug,
      keywords: article.keywords || null,
      imageUrl: article.imageUrl || null,
    });

    return NextResponse.json({
      success: result.success,
      mode: "review",
      beforeScore: result.beforeScore,
      afterScore: result.afterScore,
      scoreDelta: result.scoreDelta,
      diffs: result.diffs,
      retries: result.retries,
      validationPassed: result.validationPassed,
      message: result.message,
      evaluatorReport: {
        score: result.evaluatorReport.score,
        issues: result.evaluatorReport.issues.length,
        summary: result.evaluatorReport.summary,
        fieldScores: result.evaluatorReport.fieldScores,
      },
      skippedFields: result.skippedFields,
      failedFields: result.failedFields,
    });
  } catch (error) {
    console.error("SEO optimization error:", error);
    return NextResponse.json(
      {
        error: "Optimizasyon başarısız oldu",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
