import { NextRequest, NextResponse } from "next/server";
import { getNotificationMetadata } from "@/lib/seo/google-indexing-api";
import { prisma } from "@/lib/prisma";

/**
 * Google Indexing API Quota Yönetimi
 *
 * ⚠️ ÖNEMLİ: Google Indexing API günlük 200 istek limiti vardır.
 * Bu limit hem URL bildirimi hem de status check için geçerlidir!
 *
 * Status check için günlük maksimum 50 istek ayrılmıştır.
 */
const DAILY_STATUS_CHECK_LIMIT = 50; // Günlük status check limiti
const STATUS_CHECK_CACHE_HOURS = 6; // Aynı URL için tekrar kontrol süresi (saat)

/**
 * Bugün kaç status check yapıldığını kontrol et
 */
async function getTodayStatusCheckCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Son 24 saatte güncellenen ve googleIndexedAt değişen makaleleri say
  const count = await prisma.article.count({
    where: {
      googleIndexedAt: {
        gte: today,
      },
    },
  });

  return count;
}

/**
 * Google Indexing Durumunu Kontrol Et
 *
 * GET /api/admin/google-indexing/check-status?articleId=xxx
 *
 * Bir haberin Google'daki gerçek indexing durumunu kontrol eder
 * ve database'i günceller.
 *
 * ⚠️ Günlük status check limiti: 50 istek
 * @updated Prisma client regenerated with new fields + quota management
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const articleId = searchParams.get("articleId");

    // Günlük limit kontrolü
    const todayCount = await getTodayStatusCheckCount();
    if (todayCount >= DAILY_STATUS_CHECK_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          error: `Günlük status check limiti doldu (${DAILY_STATUS_CHECK_LIMIT}). Yarın tekrar deneyin.`,
          quotaExceeded: true,
          todayUsed: todayCount,
          limit: DAILY_STATUS_CHECK_LIMIT,
        },
        { status: 429 },
      );
    }

    if (!articleId) {
      return NextResponse.json(
        {
          success: false,
          error: "articleId parametresi gerekli",
        },
        { status: 400 },
      );
    }

    // Article'ı bul
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        slug: true,
        title: true,
        language: true,
        googleIndexed: true,
        googleIndexStatus: true,
        googleIndexedAt: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        {
          success: false,
          error: "Haber bulunamadı",
        },
        { status: 404 },
      );
    }

    // Cache kontrolü - son 6 saat içinde kontrol edilmişse Google'a gitme
    const cacheThreshold = new Date();
    cacheThreshold.setHours(
      cacheThreshold.getHours() - STATUS_CHECK_CACHE_HOURS,
    );

    if (
      article.googleIndexedAt &&
      new Date(article.googleIndexedAt) > cacheThreshold
    ) {
      return NextResponse.json({
        success: true,
        cached: true,
        article: {
          id: article.id,
          title: article.title,
          slug: article.slug,
        },
        googleStatus: {
          indexed: article.googleIndexed,
          status: article.googleIndexStatus,
          notifyTime: article.googleIndexedAt,
        },
        message: `Son ${STATUS_CHECK_CACHE_HOURS} saat içinde kontrol edilmiş. Cache'den döndürüldü.`,
      });
    }

    // Full URL oluştur
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    const languagePrefix = article.language === "en" ? "en/" : "";
    const fullUrl = `${baseUrl}/${languagePrefix}${article.slug}`;

    // Google'dan durumu sorgula
    const result = await getNotificationMetadata(fullUrl);

    if (result.success && result.data) {
      // Google'dan gelen veri var - bildirim yapılmış
      const latestUpdate = result.data.latestUpdate;
      const notifyTime = latestUpdate?.notifyTime;

      // Database'i güncelle
      await prisma.article.update({
        where: { id: articleId },
        data: {
          googleIndexed: true,
          googleIndexStatus: "SUBMITTED",
          googleIndexedAt: notifyTime ? new Date(notifyTime) : new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        article: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          url: fullUrl,
        },
        googleStatus: {
          indexed: true,
          status: "SUBMITTED",
          notifyTime: notifyTime || null,
          metadata: result.data,
        },
        updated: true,
        message: "Haber Google'a bildirilmiş ve database güncellendi",
      });
    } else {
      // Google'dan veri yok - henüz bildirilmemiş
      // Ama mevcut googleIndexedAt'ı koruyalım (tutarsızlık önleme)
      const updateData: Record<string, unknown> = {
        googleIndexStatus: "PENDING",
      };

      // Sadece daha önce hiç indexed olmamışsa false yap
      if (!article.googleIndexedAt) {
        updateData.googleIndexed = false;
      }

      await prisma.article.update({
        where: { id: articleId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        article: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          url: fullUrl,
        },
        googleStatus: {
          indexed: false,
          status: "PENDING",
          notifyTime: null,
          metadata: null,
        },
        updated: true,
        message: "Haber henüz Google'a bildirilmemiş",
      });
    }
  } catch (error) {
    console.error("Google indexing status check failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

/**
 * Toplu Kontrol - Birden fazla haberin durumunu kontrol et
 *
 * POST /api/admin/google-indexing/check-status
 * Body: { articleIds: string[] }
 *
 * ⚠️ Günlük limit: 50 status check
 * ⚠️ Son 6 saat içinde kontrol edilmiş makaleler atlanır
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleIds } = body;

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "articleIds array gerekli",
        },
        { status: 400 },
      );
    }

    // Günlük limit kontrolü
    const todayCount = await getTodayStatusCheckCount();
    const remainingQuota = Math.max(0, DAILY_STATUS_CHECK_LIMIT - todayCount);

    if (remainingQuota === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Günlük status check limiti doldu (${DAILY_STATUS_CHECK_LIMIT}). Yarın tekrar deneyin.`,
          quotaExceeded: true,
          todayUsed: todayCount,
          limit: DAILY_STATUS_CHECK_LIMIT,
        },
        { status: 429 },
      );
    }

    // Maksimum kalan quota kadar haber al
    const maxArticles = Math.min(articleIds.length, remainingQuota, 50);
    const limitedIds = articleIds.slice(0, maxArticles);

    // Article'ları bul
    const articles = await prisma.article.findMany({
      where: { id: { in: limitedIds } },
      select: {
        id: true,
        slug: true,
        title: true,
        language: true,
        googleIndexed: true,
        googleIndexStatus: true,
        googleIndexedAt: true,
      },
    });

    // Son 6 saat içinde kontrol edilmişleri filtrele (cache)
    const cacheThreshold = new Date();
    cacheThreshold.setHours(
      cacheThreshold.getHours() - STATUS_CHECK_CACHE_HOURS,
    );

    const articlesToCheck = articles.filter((article) => {
      // Daha önce hiç kontrol edilmemişse kontrol et
      if (!article.googleIndexedAt) return true;
      // Son 6 saatten önce kontrol edilmişse tekrar kontrol et
      return new Date(article.googleIndexedAt) < cacheThreshold;
    });

    const skippedCount = articles.length - articlesToCheck.length;

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    const results = [];

    // Quota uyarısı
    if (articleIds.length > maxArticles) {
      results.push({
        type: "warning",
        message: `⚠️ Kalan günlük quota: ${remainingQuota}. ${articleIds.length} makaleden sadece ${maxArticles} tanesi kontrol edilecek.`,
      });
    }

    if (skippedCount > 0) {
      results.push({
        type: "info",
        message: `ℹ️ ${skippedCount} makale son ${STATUS_CHECK_CACHE_HOURS} saat içinde kontrol edilmiş, atlandı.`,
      });
    }

    // Her article için kontrol et
    for (const article of articlesToCheck) {
      try {
        const languagePrefix = article.language === "en" ? "en/" : "";
        const fullUrl = `${baseUrl}/${languagePrefix}${article.slug}`;

        // Google'dan durumu sorgula
        const result = await getNotificationMetadata(fullUrl);

        if (result.success && result.data) {
          // Bildirilmiş
          const latestUpdate = result.data.latestUpdate;
          const notifyTime = latestUpdate?.notifyTime;

          await prisma.article.update({
            where: { id: article.id },
            data: {
              googleIndexed: true,
              googleIndexStatus: "SUBMITTED",
              googleIndexedAt: notifyTime ? new Date(notifyTime) : new Date(),
            },
          });

          results.push({
            articleId: article.id,
            title: article.title,
            url: fullUrl,
            indexed: true,
            notifyTime: notifyTime || null,
            updated: true,
          });
        } else {
          // Bildirilmemiş - ama mevcut googleIndexedAt'ı koruyalım
          // Sadece daha önce hiç bildirilmemişse false yap
          const updateData: Record<string, unknown> = {
            googleIndexStatus: "PENDING",
          };

          // Sadece daha önce hiç indexed olmamışsa false yap
          if (!article.googleIndexedAt) {
            updateData.googleIndexed = false;
          }

          await prisma.article.update({
            where: { id: article.id },
            data: updateData,
          });

          results.push({
            articleId: article.id,
            title: article.title,
            url: fullUrl,
            indexed: false,
            notifyTime: null,
            updated: true,
          });
        }

        // Rate limiting - 1 saniye bekle
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          articleId: article.id,
          title: article.title,
          indexed: false,
          error: error instanceof Error ? error.message : "Bilinmeyen hata",
          updated: false,
        });
      }
    }

    const articleResults = results.filter((r: any) => r.articleId);
    const indexedCount = articleResults.filter((r: any) => r.indexed).length;
    const notIndexedCount = articleResults.filter(
      (r: any) => !r.indexed && !r.error,
    ).length;
    const errorCount = articleResults.filter((r: any) => r.error).length;

    return NextResponse.json({
      success: true,
      total: articleResults.length,
      indexed: indexedCount,
      notIndexed: notIndexedCount,
      errors: errorCount,
      skipped: skippedCount,
      quotaRemaining: remainingQuota - articlesToCheck.length,
      results,
    });
  } catch (error) {
    console.error("Bulk Google indexing status check failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
