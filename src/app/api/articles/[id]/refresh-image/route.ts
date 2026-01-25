import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateImagePrompt } from "@/lib/deepseek";
import { fetchPollinationsImage } from "@/lib/pollinations";

// POST - Refresh article image
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;

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

    // Get new image from Pollinations.ai
    const newImageUrl = await fetchPollinationsImage(imagePrompt, {
      width: 1200,
      height: 630,
      model: "flux-realism",
      enhance: true,
      nologo: true,
    });
    console.log("✅ Yeni görsel URL:", newImageUrl);

    // Update article
    const updatedArticle = await db.article.update({
      where: { id },
      data: { imageUrl: newImageUrl },
    });

    return NextResponse.json({
      success: true,
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
