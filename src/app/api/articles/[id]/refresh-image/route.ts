import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { generateImagePrompt } from "@/lib/deepseek";
import { fetchPollinationsImage, isFallbackImageUrl } from "@/lib/pollinations";
import { optimizeAndGenerateSizes } from "@/lib/image-optimizer";

export const maxDuration = 120;

// POST - Refresh article image with improved prompt
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const [session, adminSession] = await Promise.all([
      auth(),
      getAdminSession(),
    ]);
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = params;

    const article = await db.article.findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Haber bulunamadı" }, { status: 404 });
    }

    console.log("🎨 Görsel yenileniyor:", article.title.substring(0, 60));

    // Generate a fresh, improved image prompt
    const imagePrompt = await generateImagePrompt(
      article.title,
      article.content,
      article.category.name,
    );
    console.log("📝 Yeni prompt:", imagePrompt.substring(0, 120));

    // Use the full provider chain: AI Horde → Pollinations → Gemini → Picsum
    const newImageUrl = await fetchPollinationsImage(imagePrompt, {
      width: 1200,
      height: 630,
      model: "flux",
      enhance: true,
      nologo: true,
    });

    if (!newImageUrl || isFallbackImageUrl(newImageUrl)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Görsel servisleri şu anda gerçek görsel üretemedi. Lütfen tekrar deneyin.",
        },
        { status: 502 },
      );
    }

    // Optimize and generate multiple sizes
    let imageSizes = {
      large: newImageUrl,
      medium: newImageUrl,
      small: newImageUrl,
      thumb: newImageUrl,
    };

    try {
      imageSizes = await optimizeAndGenerateSizes(newImageUrl, article.slug);
    } catch (optimizeError) {
      console.warn("⚠️ Görsel optimizasyonu başarısız:", optimizeError);
    }

    // Update article with new images and prompt
    const updatedArticle = await db.article.update({
      where: { id },
      data: {
        imageUrl: imageSizes.large,
        imageUrlMedium: imageSizes.medium,
        imageUrlSmall: imageSizes.small,
        imageUrlThumb: imageSizes.thumb,
      },
    });

    const logUrl = imageSizes.large.startsWith("data:")
      ? `data:image/... (base64)`
      : imageSizes.large.substring(0, 80);
    console.log(`✅ Görsel güncellendi: ${logUrl}`);

    return NextResponse.json({
      success: true,
      message: "Görsel başarıyla güncellendi",
      prompt: imagePrompt,
      data: {
        id: updatedArticle.id,
        imageUrl: updatedArticle.imageUrl,
      },
    });
  } catch (error) {
    console.error("Görsel güncelleme hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
