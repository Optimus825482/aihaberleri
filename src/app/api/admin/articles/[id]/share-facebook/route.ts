import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/admin/articles/[id]/share-facebook
 * Facebook'ta haber paylaşımı yapar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Auth kontrolü
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const articleId = params.id;

    // Article'ı bul
    const article = await db.article.findUnique({
      where: { id: articleId },
      include: {
        category: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Haber bulunamadı" },
        { status: 404 },
      );
    }

    // Sadece yayında olan haberler paylaşılabilir
    if (article.status !== "PUBLISHED") {
      return NextResponse.json(
        {
          success: false,
          error: "Sadece yayında olan haberler paylaşılabilir",
        },
        { status: 400 },
      );
    }

    // Zaten paylaşılmış mı kontrol et
    if (article.facebookShared) {
      return NextResponse.json(
        { success: false, error: "Bu haber zaten Facebook'ta paylaşıldı" },
        { status: 400 },
      );
    }

    // Facebook Page Access Token
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;

    if (!pageAccessToken || !pageId) {
      return NextResponse.json(
        {
          success: false,
          error: "Facebook API yapılandırması eksik",
        },
        { status: 500 },
      );
    }

    // Haber URL'i
    const articleUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/news/${article.slug}`;

    // Facebook'ta paylaş
    const facebookResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `${article.title}\n\n${article.excerpt}`,
          link: articleUrl,
          access_token: pageAccessToken,
        }),
      },
    );

    const facebookData = await facebookResponse.json();

    if (!facebookResponse.ok) {
      console.error("Facebook API Error:", facebookData);
      return NextResponse.json(
        {
          success: false,
          error: facebookData.error?.message || "Facebook paylaşımı başarısız",
        },
        { status: 500 },
      );
    }

    // Article'ı güncelle
    await db.article.update({
      where: { id: articleId },
      data: {
        facebookShared: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        postId: facebookData.id,
        articleId: article.id,
        articleUrl,
      },
    });
  } catch (error) {
    console.error("Share Facebook Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
