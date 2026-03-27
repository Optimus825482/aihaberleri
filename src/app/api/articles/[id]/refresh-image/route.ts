import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { generateImagePrompt } from "@/lib/deepseek";
import { fetchPollinationsImage, isFallbackImageUrl } from "@/lib/pollinations";
import { optimizeAndGenerateSizes } from "@/lib/image-optimizer";

export const maxDuration = 120;

const IMAGE_GENERATION_STRATEGIES = [
  {
    model: "flux" as const,
    width: 1200,
    height: 630,
    requestTimeoutMs: 45000,
    label: "primary",
  },
  {
    model: "zimage" as const,
    width: 1200,
    height: 630,
    requestTimeoutMs: 30000,
    label: "fallback-model",
  },
];

// POST - Refresh article image
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication - support both NextAuth and admin-session JWT
    const [session, adminSession] = await Promise.all([
      auth(),
      getAdminSession(),
    ]);
    if (!session && !adminSession) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = params;

    // Get article
    const article = await db.article.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Haber bulunamadı" }, { status: 404 });
    }

    console.log("🎨 Yeni görsel oluşturuluyor:", article.title);

    // Generate AI image prompt using DeepSeek
    const imagePrompt = await generateImagePrompt(
      article.title,
      article.content,
      article.category.name,
    );
    console.log("📝 Görsel prompt:", imagePrompt);

    let newImageUrl: string | null = null;

    for (const strategy of IMAGE_GENERATION_STRATEGIES) {
      let candidateImageUrl: string;

      try {
        candidateImageUrl = await fetchPollinationsImage(
          imagePrompt,
          {
            width: strategy.width,
            height: strategy.height,
            model: strategy.model,
            enhance: true,
            nologo: true,
            allowBackupFallback: false,
          },
          1,
          strategy.requestTimeoutMs,
        );
      } catch (error) {
        console.warn(
          `⚠️ Pollinations ${strategy.model} (${strategy.label}) isteği başarısız oldu`,
          error,
        );
        continue;
      }

      if (isFallbackImageUrl(candidateImageUrl)) {
        console.warn(
          `⚠️ Pollinations ${strategy.model} (${strategy.label}) gerçek görsel üretemedi`,
        );
        continue;
      }

      newImageUrl = candidateImageUrl;
      const logUrl = newImageUrl.startsWith("data:")
        ? `data:image/... (${Math.round((newImageUrl.length * 0.75) / 1024)}KB base64)`
        : newImageUrl;
      console.log(`✅ Yeni görsel URL (${strategy.model}):`, logUrl);
      break;
    }

    if (!newImageUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Görsel servisi şu anda gerçek görsel üretemedi. Lütfen daha sonra tekrar deneyin.",
        },
        { status: 502 },
      );
    }

    let imageSizes = {
      large: newImageUrl,
      medium: newImageUrl,
      small: newImageUrl,
      thumb: newImageUrl,
    };

    try {
      imageSizes = await optimizeAndGenerateSizes(newImageUrl, article.slug);
    } catch (optimizeError) {
      console.warn(
        "⚠️ Görsel optimizasyonu başarısız, orijinal URL kullanılacak",
        optimizeError,
      );
    }

    // Update article
    const updatedArticle = await db.article.update({
      where: { id },
      data: {
        imageUrl: imageSizes.large,
        imageUrlMedium: imageSizes.medium,
        imageUrlSmall: imageSizes.small,
        imageUrlThumb: imageSizes.thumb,
      },
    });

    return NextResponse.json({
      success: true,
      usedFallback: false,
      message: "Görsel başarıyla güncellendi",
      data: updatedArticle,
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
