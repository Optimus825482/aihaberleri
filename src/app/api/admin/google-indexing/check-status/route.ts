import { NextRequest, NextResponse } from "next/server";
import { getNotificationMetadata } from "@/lib/seo/google-indexing-api";
import { prisma } from "@/lib/prisma";

/**
 * Google Indexing Durumunu Kontrol Et
 *
 * GET /api/admin/google-indexing/check-status?articleId=xxx
 *
 * Bir haberin Google'daki gerçek indexing durumunu kontrol eder
 * ve database'i günceller.
 *
 * @updated Prisma client regenerated with new fields
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const articleId = searchParams.get("articleId");

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
      await prisma.article.update({
        where: { id: articleId },
        data: {
          googleIndexed: false,
          googleIndexStatus: "PENDING",
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

    // Maksimum 50 haber
    const limitedIds = articleIds.slice(0, 50);

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

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    const results = [];

    // Her article için kontrol et
    for (const article of articles) {
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
          // Bildirilmemiş
          await prisma.article.update({
            where: { id: article.id },
            data: {
              googleIndexed: false,
              googleIndexStatus: "PENDING",
            },
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

    const indexedCount = results.filter((r) => r.indexed).length;
    const notIndexedCount = results.filter((r) => !r.indexed).length;

    return NextResponse.json({
      success: true,
      total: results.length,
      indexed: indexedCount,
      notIndexed: notIndexedCount,
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
