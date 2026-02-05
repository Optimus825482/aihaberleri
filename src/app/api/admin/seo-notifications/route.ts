/**
 * SEO & Social Media Notifications API
 * Admin panel için bildirim durumlarını yönetir
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyNewsToGoogle } from "@/lib/seo/google-indexing-api";
import { submitArticleToIndexNow } from "@/lib/seo/indexnow";
import { postToFacebook } from "@/lib/social/facebook";

/**
 * GET - Tüm haberlerin bildirim durumlarını getir
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status"); // "all", "pending", "sent"
    const platform = searchParams.get("platform"); // "all", "indexnow", "google", "facebook"
    const search = searchParams.get("search") || ""; // Search query

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      status: "PUBLISHED",
      publishedAt: { not: null },
    };

    // Search filter
    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Status filter
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

    // Platform-specific filter
    if (platform && platform !== "all") {
      if (platform === "indexnow") {
        where.OR = [
          { indexNowStatus: "PENDING" },
          { indexNowStatus: "FAILED" },
        ];
      } else if (platform === "google") {
        // For now, we use same status as IndexNow for Google
        where.OR = [
          { indexNowStatus: "PENDING" },
          { indexNowStatus: "FAILED" },
        ];
      } else if (platform === "facebook") {
        where.facebookShared = false;
      }
    }

    // Get articles with notification status
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

    // Format response
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
    const { action, articleIds } = body;

    if (!action || !articleIds || !Array.isArray(articleIds)) {
      return NextResponse.json(
        {
          success: false,
          error: "action ve articleIds gerekli",
        },
        { status: 400 },
      );
    }

    // Get articles
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

    // Process based on action
    if (action === "resend_all" || action === "send_pending") {
      // Send to all platforms
      for (const article of articles) {
        // IndexNow
        try {
          await submitArticleToIndexNow(article.slug, article.id);
          results.indexNow.success++;
        } catch (error) {
          console.error(`IndexNow failed for ${article.slug}:`, error);
          results.indexNow.failed++;
        }

        // Google Indexing API
        try {
          await notifyNewsToGoogle(article.slug);
          results.google.success++;

          // Update Google status in database
          await db.article.update({
            where: { id: article.id },
            data: {
              googleIndexStatus: "SUBMITTED",
              googleIndexedAt: new Date(),
            },
          });
        } catch (error) {
          console.error(`Google Indexing failed for ${article.slug}:`, error);
          results.google.failed++;

          // Mark as failed
          await db.article.update({
            where: { id: article.id },
            data: { googleIndexStatus: "FAILED" },
          });
        }

        // Facebook
        try {
          await postToFacebook({
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
            imageUrl: article.imageUrl,
            categoryName: article.category.name,
          });
          results.facebook.success++;

          // Update facebookShared status
          await db.article.update({
            where: { id: article.id },
            data: { facebookShared: true },
          });
        } catch (error) {
          console.error(`Facebook post failed for ${article.slug}:`, error);
          results.facebook.failed++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } else if (action === "resend_indexnow") {
      // Only IndexNow
      for (const article of articles) {
        try {
          await submitArticleToIndexNow(article.slug, article.id);
          results.indexNow.success++;
        } catch (error) {
          results.indexNow.failed++;
        }
      }
    } else if (action === "resend_google") {
      // Only Google
      for (const article of articles) {
        try {
          await notifyNewsToGoogle(article.slug);
          results.google.success++;

          // Update Google status
          await db.article.update({
            where: { id: article.id },
            data: {
              googleIndexStatus: "SUBMITTED",
              googleIndexedAt: new Date(),
            },
          });
        } catch (error) {
          results.google.failed++;

          // Mark as failed
          await db.article.update({
            where: { id: article.id },
            data: { googleIndexStatus: "FAILED" },
          });
        }
      }
    } else if (action === "resend_facebook") {
      // Only Facebook
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
