/**
 * SEO & Social Media Notifications API
 * Admin panel için bildirim durumlarını yönetir
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  notifyNewsToGoogle,
  notifyMultipleNewsToGoogle,
} from "@/lib/seo/google-indexing-api";
import { submitArticleToIndexNow } from "@/lib/seo/indexnow";
import { postToFacebook } from "@/lib/social/facebook";

/**
 * Bulk Google Submit with Streaming Logs and Batch Processing
 *
 * Google Indexing API Limits:
 * - 200 URLs per day
 * - Batch size: 100 URLs per request (for speed)
 * - Rate limiting: Small delay between batches
 */
async function handleBulkGoogleSubmitWithStreaming(articleIds: string[]) {
  const encoder = new TextEncoder();

  // Configuration
  const DAILY_LIMIT = 200; // Google's daily quota
  const BATCH_SIZE = 100; // Process 100 URLs per batch
  const BATCH_DELAY_MS = 2000; // 2 seconds between batches

  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (log: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(log)}\n\n`));
      };

      try {
        // Limit to daily quota
        const limitedArticleIds = articleIds.slice(0, DAILY_LIMIT);

        if (articleIds.length > DAILY_LIMIT) {
          sendLog({
            type: "warning",
            message: `⚠️ Günlük limit: ${DAILY_LIMIT} URL. ${articleIds.length} haber var, ilk ${DAILY_LIMIT} tanesi işlenecek.`,
            timestamp: new Date().toISOString(),
          });
        }

        sendLog({
          type: "start",
          message: `🚀 ${limitedArticleIds.length} haber için SADECE Google Indexing API'ye gönderim başlatılıyor...`,
          timestamp: new Date().toISOString(),
        });

        sendLog({
          type: "info",
          message: `📦 Batch İşleme: ${BATCH_SIZE} URL/batch (çok daha hızlı!)`,
          timestamp: new Date().toISOString(),
        });

        // Get articles
        const articles = await db.article.findMany({
          where: {
            id: { in: limitedArticleIds },
            status: "PUBLISHED",
          },
          select: {
            id: true,
            slug: true,
            title: true,
          },
        });

        sendLog({
          type: "info",
          message: `📊 ${articles.length} haber bulundu`,
          timestamp: new Date().toISOString(),
        });

        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || "https://aihaberleri.org";
        let totalSuccess = 0;
        let totalFailed = 0;
        let quotaExceeded = false;

        // Process in batches
        const batches = [];
        for (let i = 0; i < articles.length; i += BATCH_SIZE) {
          batches.push(articles.slice(i, i + BATCH_SIZE));
        }

        sendLog({
          type: "info",
          message: `📦 ${batches.length} batch oluşturuldu (her batch ${BATCH_SIZE} URL'ye kadar)`,
          timestamp: new Date().toISOString(),
        });

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];

          if (quotaExceeded) {
            sendLog({
              type: "warning",
              message: `⚠️ Günlük quota doldu, kalan ${batches.length - batchIndex} batch yarın işlenecek`,
              timestamp: new Date().toISOString(),
            });
            break;
          }

          sendLog({
            type: "progress",
            message: `📦 Batch ${batchIndex + 1}/${batches.length} işleniyor (${batch.length} URL)...`,
            current: batchIndex + 1,
            total: batches.length,
            timestamp: new Date().toISOString(),
          });

          try {
            // Send batch to Google
            const batchResult = await notifyMultipleNewsToGoogle(
              batch.map((a) => a.slug),
            );

            if (batchResult.success) {
              // Update successful articles
              const successfulArticleIds = batchResult.results
                .filter((r: any) => r.success)
                .map((r: any) => {
                  const article = batch.find(
                    (a) => `${baseUrl}/${a.slug}` === r.url,
                  );
                  return article?.id;
                })
                .filter(Boolean);

              if (successfulArticleIds.length > 0) {
                await db.article.updateMany({
                  where: { id: { in: successfulArticleIds } },
                  data: {
                    googleIndexStatus: "SUBMITTED",
                    googleIndexedAt: new Date(),
                  },
                });
              }

              // Update failed articles
              const failedArticleIds = batchResult.results
                .filter((r: any) => !r.success)
                .map((r: any) => {
                  const article = batch.find(
                    (a) => `${baseUrl}/${a.slug}` === r.url,
                  );
                  return article?.id;
                })
                .filter(Boolean);

              if (failedArticleIds.length > 0) {
                await db.article.updateMany({
                  where: { id: { in: failedArticleIds } },
                  data: { googleIndexStatus: "FAILED" },
                });
              }

              totalSuccess += batchResult.successCount;
              totalFailed += batchResult.failCount;

              sendLog({
                type: "success",
                message: `✅ Batch ${batchIndex + 1}/${batches.length} tamamlandı: ${batchResult.successCount} başarılı, ${batchResult.failCount} başarısız`,
                timestamp: new Date().toISOString(),
              });

              // Check if quota exceeded in batch
              const quotaError = batchResult.results.find(
                (r: any) => r.error === "QUOTA_EXCEEDED",
              );
              if (quotaError) {
                quotaExceeded = true;
                sendLog({
                  type: "warning",
                  message: `⚠️ Günlük quota doldu! Bugün ${totalSuccess} haber gönderildi. Kalan haberler yarın otomatik gönderilecek.`,
                  timestamp: new Date().toISOString(),
                });
                break;
              }
            } else {
              totalFailed += batch.length;

              // Mark all as failed
              await db.article.updateMany({
                where: { id: { in: batch.map((a) => a.id) } },
                data: { googleIndexStatus: "FAILED" },
              });

              sendLog({
                type: "error",
                message: `❌ Batch ${batchIndex + 1}/${batches.length} başarısız: ${batchResult.error}`,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error: any) {
            totalFailed += batch.length;

            sendLog({
              type: "error",
              message: `❌ Batch ${batchIndex + 1}/${batches.length} hatası: ${error.message}`,
              timestamp: new Date().toISOString(),
            });

            // Mark batch as failed
            await db.article.updateMany({
              where: { id: { in: batch.map((a) => a.id) } },
              data: { googleIndexStatus: "FAILED" },
            });
          }

          // Wait between batches (except last one)
          if (batchIndex < batches.length - 1 && !quotaExceeded) {
            sendLog({
              type: "info",
              message: `⏳ Sonraki batch için ${BATCH_DELAY_MS / 1000} saniye bekleniyor...`,
              timestamp: new Date().toISOString(),
            });
            await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }

        const remainingCount = articleIds.length - totalSuccess - totalFailed;

        sendLog({
          type: "complete",
          message: `🎉 İşlem tamamlandı!\n✅ Başarılı: ${totalSuccess}\n❌ Başarısız: ${totalFailed}\n⏳ Kalan: ${remainingCount > 0 ? remainingCount + " (yarın işlenecek)" : "0"}`,
          successCount: totalSuccess,
          failedCount: totalFailed,
          remainingCount,
          total: articles.length,
          timestamp: new Date().toISOString(),
        });

        if (remainingCount > 0) {
          sendLog({
            type: "info",
            message: `💡 İpucu: Kalan ${remainingCount} haber için yarın tekrar "Hepsini Google'a Gönder" butonuna basın.`,
            timestamp: new Date().toISOString(),
          });
        }

        sendLog({
          type: "info",
          message: `⚡ Batch işleme sayesinde ${batches.length} batch ile ${articles.length} haber işlendi!`,
          timestamp: new Date().toISOString(),
        });

        controller.close();
      } catch (error: any) {
        sendLog({
          type: "fatal",
          message: `💥 Kritik hata: ${error.message}`,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
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

/**
 * GET - Tüm haberlerin bildirim durumlarını getir
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const where: any = {
      status: "PUBLISHED",
      publishedAt: { not: null },
    };

    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (status === "pending") {
      where.OR = [
        { indexNowStatus: "PENDING" },
        { indexNowStatus: "FAILED" },
        { facebookShared: false },
      ];
    } else if (status === "sent") {
      where.indexNowStatus = "SUBMITTED";
      where.facebookShared = true;
    }

    if (platform && platform !== "all") {
      if (platform === "indexnow") {
        where.OR = [
          { indexNowStatus: "PENDING" },
          { indexNowStatus: "FAILED" },
        ];
      } else if (platform === "google") {
        where.OR = [
          { indexNowStatus: "PENDING" },
          { indexNowStatus: "FAILED" },
        ];
      } else if (platform === "facebook") {
        where.facebookShared = false;
      }
    }

    const [articles, total] = await Promise.all([
      db.article.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
          indexNowStatus: true,
          indexedAt: true,
          googleIndexStatus: true,
          googleIndexedAt: true,
          facebookShared: true,
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          publishedAt: "desc",
        },
        skip,
        take: limit,
      }),
      db.article.count({ where }),
    ]);

    const formattedArticles = articles.map((article) => {
      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        publishedAt: article.publishedAt,
        category: article.category.name,
        notifications: {
          indexNow: {
            status: article.indexNowStatus,
            sentAt: article.indexedAt,
          },
          google: {
            status: article.googleIndexStatus || "PENDING",
            sentAt: article.googleIndexedAt,
          },
          facebook: {
            status: article.facebookShared ? "SUBMITTED" : "PENDING",
            sentAt: article.facebookShared ? article.publishedAt : null,
          },
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedArticles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("SEO notifications GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST - Tekrar bildirim gönder veya toplu gönder
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, articleIds, streamLogs } = body;

    if (!action || !articleIds || !Array.isArray(articleIds)) {
      return NextResponse.json(
        {
          success: false,
          error: "action ve articleIds gerekli",
        },
        { status: 400 },
      );
    }

    // Eğer streamLogs true ise, Server-Sent Events kullan
    if (streamLogs && action === "bulk_google_submit") {
      return handleBulkGoogleSubmitWithStreaming(articleIds);
    }

    const articles = await db.article.findMany({
      where: {
        id: { in: articleIds },
        status: "PUBLISHED",
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        imageUrl: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    if (articles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Haber bulunamadı",
        },
        { status: 404 },
      );
    }

    const results = {
      indexNow: { success: 0, failed: 0 },
      google: { success: 0, failed: 0 },
      facebook: { success: 0, failed: 0 },
    };

    if (action === "resend_indexnow") {
      for (const article of articles) {
        try {
          await submitArticleToIndexNow(article.slug, article.id);
          results.indexNow.success++;
        } catch (error) {
          results.indexNow.failed++;
        }
      }
    } else if (action === "resend_google") {
      for (const article of articles) {
        try {
          await notifyNewsToGoogle(article.slug);
          results.google.success++;
          await db.article.update({
            where: { id: article.id },
            data: {
              googleIndexStatus: "SUBMITTED",
              googleIndexedAt: new Date(),
            },
          });
        } catch (error) {
          results.google.failed++;
          await db.article.update({
            where: { id: article.id },
            data: { googleIndexStatus: "FAILED" },
          });
        }
      }
    } else if (action === "resend_facebook") {
      for (const article of articles) {
        try {
          await postToFacebook({
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
            imageUrl: article.imageUrl,
            categoryName: article.category.name,
          });
          results.facebook.success++;
          await db.article.update({
            where: { id: article.id },
            data: { facebookShared: true },
          });
        } catch (error) {
          results.facebook.failed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${articles.length} haber için bildirim gönderildi`,
      results,
    });
  } catch (error: any) {
    console.error("SEO notifications POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
