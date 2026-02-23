import { NextRequest, NextResponse } from "next/server";
import { processArticle } from "@/services/content.service";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  enrichArticleWithTrends,
  updateArticleTrendData,
  type ArticleForMatching,
} from "@/services/trend-matcher.service";

/**
 * POST /api/admin/news/deep-analysis
 * Deep analysis ile haber oluşturma - streaming response
 *
 * Request: { url: string, topic: TopicAnalysis, forceNew: boolean }
 * Response: Server-Sent Events stream
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    // Parse request body
    const body = await request.json();
    const { url, topic, forceNew = false } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!topic) {
      return NextResponse.json(
        { error: "Topic analysis is required" },
        { status: 400 },
      );
    }

    console.log(`🚀 Deep analysis starting for: ${url}`);

    // Create SSE stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Helper to send SSE messages
    const sendEvent = async (data: any) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    // Start processing in background
    (async () => {
      try {
        // Step 1: Progress - Starting
        await sendEvent({
          type: "progress",
          step: "fetch",
          message: "📰 Kaynak haber içeriği getiriliyor...",
        });

        // Get default category (AI & Technology)
        const defaultCategory = await prisma.category.findFirst({
          where: {
            OR: [
              { slug: "yapay-zeka" },
              { slug: "teknoloji" },
              { name: { contains: "AI", mode: "insensitive" } },
            ],
          },
        });

        const categoryName = defaultCategory?.name || "Yapay Zeka";

        // Step 2: Process article
        await sendEvent({
          type: "progress",
          step: "research",
          message: "🔬 Deep research yapılıyor, ek kaynaklar aranıyor...",
        });

        // Create article object for processing
        const newsArticle = {
          title: topic.sourceTitle || "Başlık",
          description: topic.sourceDescription || "",
          url: url,
          source: new URL(url).hostname,
          pubDate: new Date(),
        };

        // Process article with content service
        const processed = await processArticle(newsArticle, categoryName);

        // Step 3: Progress - Saving
        await sendEvent({
          type: "progress",
          step: "save",
          message: "💾 Haber veritabanına kaydediliyor...",
        });

        // Save to database
        const slug = generateSlug(processed.title);

        // Check if slug exists
        const existingSlug = await prisma.article.findUnique({
          where: { slug },
        });

        const finalSlug = existingSlug
          ? `${slug}-${Date.now().toString(36)}`
          : slug;

        const article = await prisma.article.create({
          data: {
            title: processed.title,
            slug: finalSlug,
            excerpt: processed.excerpt,
            content: processed.content,
            imageUrl: processed.imageUrl || undefined,
            sourceUrl: url,
            status: "PUBLISHED",
            publishedAt: new Date(),
            categoryId: defaultCategory?.id || "",
            metaTitle: processed.title,
            metaDescription: processed.metaDescription,
            keywords: processed.keywords,
            topic: topic.topic,
            language: topic.language || "tr",
          },
        });

        // Step 3.5: Trend score calculation
        await sendEvent({
          type: "progress",
          step: "trend",
          message: "📊 Trend puanı hesaplanıyor...",
        });

        try {
          const articleForMatching: ArticleForMatching = {
            id: article.id,
            title: article.title,
            content: processed.content,
            keywords: processed.keywords || [],
            language: topic.language || "tr",
          };

          const enrichment = await enrichArticleWithTrends(articleForMatching);
          await updateArticleTrendData(article.id, enrichment);

          if (enrichment.trendScore > 0) {
            await sendEvent({
              type: "progress",
              step: "trend-done",
              message: `📊 Trend puanı: ${enrichment.trendScore} ${enrichment.isTrending ? "🔥 Trending!" : ""}`,
            });
          } else {
            await sendEvent({
              type: "progress",
              step: "trend-done",
              message: "📊 Trend verisi hesaplandı (aktif trend eşleşmesi yok)",
            });
          }
        } catch (trendError) {
          console.warn(
            "⚠️ Trend enrichment failed (non-blocking):",
            trendError,
          );
          await sendEvent({
            type: "progress",
            step: "trend-skip",
            message: "⚠️ Trend hesaplaması atlandı (bloke etmiyor)",
          });
        }

        // Step 4: Complete
        await sendEvent({
          type: "progress",
          step: "complete",
          message: "✅ Haber başarıyla oluşturuldu ve yayınlandı!",
        });

        await sendEvent({
          type: "complete",
          title: article.title,
          slug: article.slug,
          id: article.id,
        });
      } catch (error) {
        console.error("❌ Deep analysis error:", error);
        await sendEvent({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "İşlem sırasında hata oluştu",
        });
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("❌ Deep analysis error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Deep analysis failed",
      },
      { status: 500 },
    );
  }
}

/**
 * Generate URL-safe slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[çç]/g, "c")
    .replace(/[ğğ]/g, "g")
    .replace(/[ıi̇]/g, "i")
    .replace(/[öö]/g, "o")
    .replace(/[şş]/g, "s")
    .replace(/[üü]/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}
