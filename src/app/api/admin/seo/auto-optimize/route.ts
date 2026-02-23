import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/db";
import { calculateSEOScore } from "@/lib/seo-calculator";
import { SEOPipelineService } from "@/services/seo-pipeline.service";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-this",
);

/**
 * POST /api/admin/seo/auto-optimize
 *
 * Düşük skorlu makaleleri sırayla pipeline'dan geçirip otomatik uygular.
 * SSE (Server-Sent Events) ile gerçek zamanlı progress döner.
 *
 * Body: { maxScore?: number, limit?: number }
 * - maxScore: Bu skorun altındaki makaleleri optimize et (default: 80)
 * - limit: Maksimum kaç makale işlensin (default: 50)
 *
 * SSE Events:
 * - start: { total }
 * - progress: { index, total, articleId, title, status, beforeScore, afterScore, scoreDelta, message }
 * - complete: { processed, succeeded, failed, skipped, avgImprovement }
 * - error: { message }
 */
export async function POST(request: NextRequest) {
  // Auth check
  const token = request.cookies.get("admin-session")?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await jwtVerify(token, JWT_SECRET);
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
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

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        // Düşük skorlu makaleleri getir
        const articles = await db.article.findMany({
          where: {
            status: "PUBLISHED",
            OR: [{ seoScore: { lt: maxScore } }, { seoScore: null }],
          },
          orderBy: { seoScore: "asc" },
          take: limit,
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

        if (articles.length === 0) {
          send("complete", {
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            avgImprovement: 0,
            message: `${maxScore} altında skorlu makale bulunamadı.`,
          });
          controller.close();
          return;
        }

        send("start", { total: articles.length });

        const pipeline = new SEOPipelineService();
        let succeeded = 0;
        let failed = 0;
        let skipped = 0;
        let totalImprovement = 0;

        for (let i = 0; i < articles.length; i++) {
          const article = articles[i];

          try {
            // Pipeline'ı çalıştır
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
              if (isSkip) skipped++;
              else failed++;

              send("progress", {
                index: i + 1,
                total: articles.length,
                articleId: article.id,
                title: article.title,
                status: isSkip ? "skipped" : "failed",
                beforeScore: result.beforeScore,
                afterScore: result.afterScore,
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
              skipped++;
              send("progress", {
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
            const updateData = pipeline.buildUpdateData(
              result.diffs,
              allFields,
            );

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

            const scoreDelta = finalScore - (article.seoScore || 0);
            totalImprovement += scoreDelta;
            succeeded++;

            send("progress", {
              index: i + 1,
              total: articles.length,
              articleId: article.id,
              title: article.title,
              status: "success",
              beforeScore: article.seoScore || 0,
              afterScore: finalScore,
              scoreDelta,
              message: `${article.seoScore || 0} → ${finalScore} (+${scoreDelta})`,
            });
          } catch (err) {
            failed++;
            console.error(
              `[Bulk Optimize] Hata: ${article.id} - ${article.title}`,
              err,
            );
            send("progress", {
              index: i + 1,
              total: articles.length,
              articleId: article.id,
              title: article.title,
              status: "error",
              beforeScore: article.seoScore || 0,
              afterScore: article.seoScore || 0,
              scoreDelta: 0,
              message:
                err instanceof Error ? err.message : "Bilinmeyen hata oluştu",
            });
          }
        }

        // Özet
        send("complete", {
          processed: articles.length,
          succeeded,
          failed,
          skipped,
          avgImprovement:
            succeeded > 0 ? Math.round(totalImprovement / succeeded) : 0,
        });
      } catch (err) {
        console.error("[Bulk Optimize] Kritik hata:", err);
        send("error", {
          message:
            err instanceof Error ? err.message : "Bilinmeyen hata oluştu",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
