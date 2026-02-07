import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { rewriteArticleWithNote } from "@/lib/deepseek";
import { generateImagePrompt } from "@/lib/deepseek";
import { fetchPollinationsImage } from "@/lib/pollinations";
import { optimizeAndGenerateSizes } from "@/lib/image-optimizer";

/**
 * POST /api/admin/articles/[id]/re-evaluate
 * Makaleyi admin notu ile yeniden değerlendirir/yazar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const startTime = Date.now();
  
  try {
    // Auth kontrolü - support both NextAuth and admin-session JWT
    const session = await auth();
    const adminSession = await getAdminSession();
    if (!session && !adminSession) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim" },
        { status: 401 },
      );
    }

    const articleId = params.id;
    const body = await request.json();
    const { note, regenerateImage = false } = body;

    if (!note || typeof note !== "string" || note.trim().length < 10) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Not en az 10 karakter olmalıdır" 
        },
        { status: 400 },
      );
    }

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

    console.log(`🔄 Makale yeniden değerlendiriliyor: ${article.title.substring(0, 50)}...`);
    console.log(`📝 Admin notu: ${note}`);

    // Get recent articles for context (avoid repetition)
    const recentArticles = await db.article.findMany({
      where: {
        id: { not: article.id },
        status: "PUBLISHED",
        createdAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Last 48 hours
        },
      },
      select: {
        title: true,
        excerpt: true,
        keywords: true,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    // Call DeepSeek to rewrite with the note
    const rewritten = await rewriteArticleWithNote(
      article.title,
      article.content,
      article.category.name,
      note,
      recentArticles,
    );

    if (!rewritten || !rewritten.content) {
      return NextResponse.json(
        { 
          success: false, 
          error: "DeepSeek ile yeniden yazma başarısız oldu" 
        },
        { status: 500 },
      );
    }

    // Prepare update data
    const updateData: any = {
      title: rewritten.title,
      content: rewritten.content,
      excerpt: rewritten.excerpt,
      metaTitle: rewritten.metaTitle || rewritten.title,
      metaDescription: rewritten.metaDescription || rewritten.excerpt,
      keywords: rewritten.keywords || article.keywords,
      updatedAt: new Date(),
    };

    // If score provided, update it
    if (rewritten.score) {
      updateData.score = rewritten.score;
    }

    // Regenerate image if requested
    if (regenerateImage) {
      console.log("🎨 Görsel yeniden oluşturuluyor...");
      
      const imagePrompt = await generateImagePrompt(
        rewritten.title,
        rewritten.content,
        article.category.name,
      );

      const imageUrl = await fetchPollinationsImage(imagePrompt, {
        width: 1200,
        height: 630,
        model: "flux",
        enhance: true,
        nologo: true,
      });

      if (imageUrl) {
        try {
          const imageSizes = await optimizeAndGenerateSizes(imageUrl, article.slug);
          updateData.imageUrl = imageSizes.large;
          updateData.imageUrlMedium = imageSizes.medium;
          updateData.imageUrlSmall = imageSizes.small;
          updateData.imageUrlThumb = imageSizes.thumb;
          console.log("✅ Görsel güncellendi");
        } catch (imageError) {
          console.error("⚠️ Görsel optimizasyon hatası:", imageError);
          updateData.imageUrl = imageUrl;
        }
      }
    }

    // Update the article
    const updatedArticle = await db.article.update({
      where: { id: articleId },
      data: updateData,
    });

    // Log the re-evaluation
    await db.agentLog.create({
      data: {
        status: "SUCCESS",
        articlesCreated: 0,
        articlesScraped: 0,
        duration: Math.round((Date.now() - startTime) / 1000),
        errors: [],
        metadata: {
          type: "re-evaluate",
          articleId: article.id,
          category: article.category.slug,
          note: note.substring(0, 100),
        },
      },
    });

    console.log(`✅ Makale başarıyla güncellendi: ${updatedArticle.title}`);

    return NextResponse.json({
      success: true,
      message: "Makale başarıyla yeniden değerlendirildi",
      article: {
        id: updatedArticle.id,
        title: updatedArticle.title,
        excerpt: updatedArticle.excerpt,
        score: updatedArticle.score,
      },
      duration: Math.round((Date.now() - startTime) / 1000),
    });

  } catch (error) {
    console.error("❌ Yeniden değerlendirme hatası:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Beklenmeyen hata oluştu" 
      },
      { status: 500 },
    );
  }
}
