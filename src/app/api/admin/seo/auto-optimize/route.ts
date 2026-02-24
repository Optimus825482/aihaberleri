import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateSEOScore } from "@/lib/seo-calculator";
import { SEOPipelineService } from "@/services/seo-pipeline.service";
import { BulkJobStore } from "@/lib/bulk-job-store";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/seo/auto-optimize
 *
 * Arka planda toplu SEO optimizasyonu başlatır.
 * Sayfa kapansa bile server'da çalışmaya devam eder.
 *
 * Body: { maxScore?: number, limit?: number }
 * Returns: { jobId: string } (202 Accepted)
 */
export async function POST(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  // Zaten çalışan bir job var mı?
  if (BulkJobStore.hasActiveJob()) {
    const active = BulkJobStore.getActive()!;
    return NextResponse.json(
      { error: "Zaten çalışan bir optimizasyon var", jobId: active.id },
      { status: 409 },
    );
  }

  // Parse body
  let maxScore = 80;
  let limit = 50;
  try {
    const body = await request.json();
    if (body.maxScore) maxScore = body.maxScore;
    if (body.limit) limit = body.limit;
  } catch {
    // defaults
  }

  // Düşük skorlu (veya skoru hiç hesaplanmamış) makaleleri getir
  const rawArticles = await db.article.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ seoScore: { lt: maxScore } }, { seoScore: null }],
    },
    orderBy: { seoScore: "asc" },
    take: limit * 2, // Fazla çek, ön-ölçümden sonra filtrele
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      metaDescription: true,
      slug: true,
      keywords: true,
      imageUrl: true,
      seoScore: true,
    },
  });

  // ÖN-ÖLÇÜM: seoScore null/0 olan makalelerin gerçek skorunu hesapla
  // ve DB'ye yaz. Böylece "0 → 95" yerine gerçek beforeScore raporlanır.
  const articles: typeof rawArticles = [];
  for (const article of rawArticles) {
    if (article.seoScore === null || article.seoScore === 0) {
      const realScore = calculateSEOScore({
        title: article.title,
        content: article.content || "",
        excerpt: article.excerpt || "",
        metaDescription: article.metaDescription,
        slug: article.slug,
        keywords: article.keywords,
        imageUrl: article.imageUrl,
      });

      // DB'ye gerçek skoru yaz
      await db.article.update({
        where: { id: article.id },
        data: { seoScore: realScore.score },
      });

      article.seoScore = realScore.score;
    }

    // Gerçek skor hala maxScore altındaysa listeye ekle
    if (article.seoScore < maxScore) {
      articles.push(article);
    }

    // Limit'e ulaştıysa dur
    if (articles.length >= limit) break;
  }

  if (articles.length === 0) {
    return NextResponse.json(
      {
        error: `Ön-ölçüm sonrası ${maxScore} altında skorlu makale bulunamadı. Tüm skorlar güncellendi.`,
      },
      { status: 404 },
    );
  }

  // Job oluştur
  const jobId = `seo-bulk-${Date.now()}`;
  BulkJobStore.create(jobId, articles.length);

  // 🔥 Fire-and-forget: işlemi arka planda başlat, response'u bekleme
  runBulkOptimize(jobId, articles).catch((err) => {
    console.error("[Bulk Optimize] Unhandled error:", err);
    BulkJobStore.fail(
      jobId,
      err instanceof Error ? err.message : "Bilinmeyen hata",
    );
  });

  // Hemen jobId döndür
  return NextResponse.json({ jobId }, { status: 202 });
}

/**
 * GET /api/admin/seo/auto-optimize?jobId=xxx(&since=N)
 *
 * Job durumunu ve incremental progress döner.
 * jobId yoksa aktif job varsa onu döner.
 */
export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  let jobId = searchParams.get("jobId");
  const sinceStr = searchParams.get("since");
  const sinceIndex = sinceStr ? parseInt(sinceStr, 10) : 0;

  // jobId yoksa aktif job'a bak
  if (!jobId) {
    const active = BulkJobStore.getActive();
    if (active) {
      jobId = active.id;
    } else {
      return NextResponse.json({ active: false }, { status: 200 });
    }
  }

  const job = BulkJobStore.get(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
  }

  const newProgress = BulkJobStore.getProgressSince(jobId, sinceIndex);

  return NextResponse.json({
    active: job.status === "running",
    jobId: job.id,
    status: job.status,
    total: job.total,
    current: job.current,
    succeeded: job.succeeded,
    failed: job.failed,
    skipped: job.skipped,
    avgImprovement:
      job.succeeded > 0 ? Math.round(job.totalImprovement / job.succeeded) : 0,
    progress: newProgress,
    error: job.error,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    processingTitle: job.processingTitle,
    processingIndex: job.processingIndex,
  });
}

// ─── Background Worker ───────────────────────────────────────────────

interface ArticleForOptimize {
  id: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  metaDescription: string | null;
  slug: string;
  keywords: string[];
  imageUrl: string | null;
  seoScore: number | null;
}

async function runBulkOptimize(
  jobId: string,
  articles: ArticleForOptimize[],
): Promise<void> {
  console.log(
    `[Bulk Optimize] Job başlıyor: ${jobId} — ${articles.length} makale`,
  );

  const pipeline = new SEOPipelineService();

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    // Gerçek beforeScore: DB'deki güncel skor (ön-ölçümde hesaplandı)
    const beforeScore = article.seoScore || 0;

    // Zaten maxScore üstündeyse atla (ön-ölçümde kaçmış olabilir)
    if (beforeScore >= 80) {
      BulkJobStore.addProgress(jobId, {
        index: i + 1,
        total: articles.length,
        articleId: article.id,
        title: article.title,
        status: "skipped",
        beforeScore,
        afterScore: beforeScore,
        scoreDelta: 0,
        message: `Skor zaten yeterli: ${beforeScore}`,
      });
      continue;
    }

    try {
      // 🔄 İşlenmeye başlandığını kaydet (polling'de göstermek için)
      BulkJobStore.setProcessing(jobId, i + 1, article.title);

      const result = await pipeline.run({
        title: article.title,
        content: article.content || "",
        excerpt: article.excerpt,
        metaDescription: article.metaDescription,
        slug: article.slug,
        keywords: article.keywords,
        imageUrl: article.imageUrl,
      });

      if (!result.success || result.diffs.length === 0) {
        const isSkip = result.diffs.length === 0 && result.success;
        BulkJobStore.addProgress(jobId, {
          index: i + 1,
          total: articles.length,
          articleId: article.id,
          title: article.title,
          status: isSkip ? "skipped" : "failed",
          beforeScore,
          afterScore: beforeScore,
          scoreDelta: 0,
          message: result.message,
        });
        continue;
      }

      // Guardrail geçen tüm diff'leri otomatik uygula
      const allFields = result.diffs
        .filter(
          (d) =>
            d.field !== "seoScore" &&
            d.guardrailPassed !== false &&
            d.before !== d.after,
        )
        .map((d) => d.field);

      if (allFields.length === 0) {
        BulkJobStore.addProgress(jobId, {
          index: i + 1,
          total: articles.length,
          articleId: article.id,
          title: article.title,
          status: "skipped",
          beforeScore: result.beforeScore,
          afterScore: result.afterScore,
          scoreDelta: 0,
          message: "Uygulanacak değişiklik bulunamadı.",
        });
        continue;
      }

      // DB'ye uygula
      const updateData = pipeline.buildUpdateData(result.diffs, allFields);
      await db.article.update({
        where: { id: article.id },
        data: updateData,
      });

      // Deterministik skor yeniden hesapla
      const updatedArticle = await db.article.findUnique({
        where: { id: article.id },
      });

      let finalScore = result.afterScore;
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
        finalScore = seoResult.score;
        await db.article.update({
          where: { id: article.id },
          data: { seoScore: seoResult.score },
        });
      }

      const scoreDelta = finalScore - beforeScore;
      BulkJobStore.addProgress(jobId, {
        index: i + 1,
        total: articles.length,
        articleId: article.id,
        title: article.title,
        status: "success",
        beforeScore,
        afterScore: finalScore,
        scoreDelta,
        message: `${beforeScore} → ${finalScore} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta})`,
      });
    } catch (err) {
      console.error(
        `[Bulk Optimize] Hata: ${article.id} - ${article.title}`,
        err,
      );
      BulkJobStore.addProgress(jobId, {
        index: i + 1,
        total: articles.length,
        articleId: article.id,
        title: article.title,
        status: "error",
        beforeScore,
        afterScore: beforeScore,
        scoreDelta: 0,
        message: err instanceof Error ? err.message : "Bilinmeyen hata oluştu",
      });
    }
  }

  BulkJobStore.complete(jobId);
  BulkJobStore.cleanup();

  const job = BulkJobStore.get(jobId)!;
  console.log(
    `[Bulk Optimize] Job tamamlandı: ${jobId} — ` +
      `${job.succeeded} başarılı, ${job.failed} hatalı, ${job.skipped} atlandı`,
  );
}
