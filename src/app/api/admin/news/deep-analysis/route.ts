/**
 * Deep Analysis API
 * Performs comprehensive research and creates a news article
 * Uses streaming for real-time progress updates
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  callDeepSeek,
  rewriteArticle,
  generateImagePrompt,
} from "@/lib/deepseek";
import { braveSearch } from "@/lib/brave";
import { db } from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import { fetchPollinationsImage } from "@/lib/pollinations";
import { optimizeAndGenerateSizes } from "@/lib/image-optimizer";
import { translateAndSaveArticle } from "@/lib/translation";
import { submitArticleToIndexNow } from "@/lib/seo/indexnow";
import axios from "axios";
import * as cheerio from "cheerio";

export const maxDuration = 300; // 5 minutes max
export const dynamic = "force-dynamic";

interface TopicAnalysis {
  topic: string;
  summary: string;
  language: string;
  sourceTitle: string;
  sourceDescription: string;
}

interface DeepSource {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

// Helper to send SSE message
function sendSSE(controller: ReadableStreamDefaultController, data: object) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

// Fetch article content from URL
async function fetchArticleContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      timeout: 10000,
      maxRedirects: 3,
    });

    const $ = cheerio.load(response.data);
    $("script, style, noscript, iframe, nav, footer").remove();

    let content = "";
    const selectors = [
      "article",
      ".article-content",
      ".post-content",
      "main",
      ".content",
    ];
    for (const selector of selectors) {
      const el = $(selector);
      if (el.length > 0) {
        content = el.text().trim();
        if (content.length > 200) break;
      }
    }

    if (!content || content.length < 200) {
      content = $("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .join("\n\n");
    }

    return content.replace(/\s+/g, " ").trim().slice(0, 5000);
  } catch {
    return "";
  }
}

// Search for additional sources using Brave
async function searchBraveSources(query: string): Promise<DeepSource[]> {
  try {
    const results = await braveSearch(query, { count: 10, freshness: "week" });
    return results.slice(0, 6).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      source: "Brave",
    }));
  } catch (error) {
    console.error("Brave search error:", error);
    return [];
  }
}

// Try Tavily as fallback
async function searchTavilySources(query: string): Promise<DeepSource[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: apiKey,
        query,
        max_results: 6,
        search_depth: "advanced",
      },
      { timeout: 15000 },
    );

    return (response.data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 300) || "",
      source: "Tavily",
    }));
  } catch {
    return [];
  }
}

// Determine best category based on topic
async function determineCategory(
  topic: string,
): Promise<{ name: string; slug: string }> {
  const topicLower = topic.toLowerCase();

  // Category mapping
  const categoryMap: Record<string, { name: string; slug: string }> = {
    openai: { name: "OpenAI", slug: "openai" },
    gpt: { name: "OpenAI", slug: "openai" },
    chatgpt: { name: "OpenAI", slug: "openai" },
    google: { name: "Google AI", slug: "google-ai" },
    gemini: { name: "Google AI", slug: "google-ai" },
    deepmind: { name: "Google AI", slug: "google-ai" },
    microsoft: { name: "Microsoft", slug: "microsoft" },
    copilot: { name: "Microsoft", slug: "microsoft" },
    anthropic: { name: "Anthropic", slug: "anthropic" },
    claude: { name: "Anthropic", slug: "anthropic" },
    nvidia: { name: "Donanım", slug: "donanim" },
    meta: { name: "Meta AI", slug: "meta-ai" },
    llama: { name: "Meta AI", slug: "meta-ai" },
    robot: { name: "Robotik", slug: "robotik" },
    otonom: { name: "Otonom Sistemler", slug: "otonom-sistemler" },
  };

  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (topicLower.includes(keyword)) {
      // Ensure category exists in database
      await db.category.upsert({
        where: { slug: category.slug },
        update: {},
        create: {
          name: category.name,
          slug: category.slug,
          description: `${category.name} ile ilgili haberler`,
        },
      });
      return category;
    }
  }

  // Default category
  const defaultCategory = { name: "Yapay Zeka", slug: "yapay-zeka" };
  await db.category.upsert({
    where: { slug: defaultCategory.slug },
    update: {},
    create: {
      name: defaultCategory.name,
      slug: defaultCategory.slug,
      description: "Yapay zeka ile ilgili genel haberler",
    },
  });

  return defaultCategory;
}

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { url, topic, forceNew } = body as {
      url: string;
      topic: TopicAnalysis;
      forceNew: boolean;
    };

    if (!url || !topic) {
      return new Response(JSON.stringify({ error: "URL ve konu gerekli" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Fetch original article content
          sendSSE(controller, {
            type: "progress",
            step: "fetch",
            message: "📄 Kaynak haber içeriği alınıyor...",
          });

          const originalContent = await fetchArticleContent(url);

          sendSSE(controller, {
            type: "progress",
            step: "fetch-done",
            message: `✅ Kaynak içerik alındı (${originalContent.length} karakter)`,
          });

          // Step 2: Search for additional sources globally
          sendSSE(controller, {
            type: "progress",
            step: "search",
            message: "🌍 Global kaynak araştırması yapılıyor (Brave Search)...",
          });

          // Create search query from topic
          const searchQuery = `${topic.topic} AI news ${new Date().getFullYear()}`;

          let allSources: DeepSource[] = [];

          // Try Brave first
          const braveSources = await searchBraveSources(searchQuery);
          if (braveSources.length > 0) {
            allSources = braveSources;
            sendSSE(controller, {
              type: "progress",
              step: "brave-done",
              message: `✅ Brave: ${braveSources.length} kaynak bulundu`,
              sources: braveSources.slice(0, 4),
            });
          }

          // Try Tavily as additional source
          sendSSE(controller, {
            type: "progress",
            step: "tavily",
            message: "🔍 Tavily ile ek kaynak araştırması...",
          });

          const tavilySources = await searchTavilySources(searchQuery);
          if (tavilySources.length > 0) {
            // Merge unique sources
            const existingUrls = new Set(allSources.map((s) => s.url));
            const newSources = tavilySources.filter(
              (s) => !existingUrls.has(s.url),
            );
            allSources = [...allSources, ...newSources].slice(0, 10);

            sendSSE(controller, {
              type: "progress",
              step: "tavily-done",
              message: `✅ Tavily: ${tavilySources.length} ek kaynak bulundu`,
              sources: newSources.slice(0, 3),
            });
          }

          // Step 3: Fetch content from top sources
          sendSSE(controller, {
            type: "progress",
            step: "gather",
            message: "📚 Ek kaynaklardan içerik toplanıyor...",
          });

          const sourceContents: Array<{
            title: string;
            content: string;
            url: string;
          }> = [{ title: topic.sourceTitle, content: originalContent, url }];

          // Fetch up to 3 additional sources
          for (const source of allSources.slice(0, 3)) {
            try {
              const content = await fetchArticleContent(source.url);
              if (content.length > 200) {
                sourceContents.push({
                  title: source.title,
                  content,
                  url: source.url,
                });
              }
            } catch {
              // Skip failed sources
            }
          }

          sendSSE(controller, {
            type: "progress",
            step: "gather-done",
            message: `✅ ${sourceContents.length} kaynaktan içerik toplandı`,
          });

          // Step 4: Deep Analysis with DeepSeek
          sendSSE(controller, {
            type: "progress",
            step: "analyze",
            message: "🧠 DeepSeek ile derin analiz yapılıyor...",
          });

          // Combine all sources for analysis
          const combinedContent = sourceContents
            .map((s) => `=== ${s.title} ===\n${s.content}`)
            .join("\n\n---\n\n")
            .slice(0, 12000);

          // Generate comprehensive article using rewriteArticle
          const category = await determineCategory(topic.topic);

          const rewritten = await rewriteArticle(
            topic.sourceTitle,
            combinedContent,
            category.name,
          );

          sendSSE(controller, {
            type: "progress",
            step: "analyze-done",
            message: `✅ Makale hazırlandı: "${rewritten.title.slice(0, 50)}..."`,
          });

          // Step 5: Generate AI image
          sendSSE(controller, {
            type: "progress",
            step: "image",
            message: "🎨 AI görsel oluşturuluyor (Pollinations)...",
          });

          const imagePrompt = await generateImagePrompt(
            rewritten.title,
            rewritten.content,
            category.name,
          );
          const imageUrl = await fetchPollinationsImage(imagePrompt, {
            width: 1200,
            height: 630,
            model: "flux",
            enhance: true,
          });

          // Optimize image sizes
          const slug = generateSlug(rewritten.title);
          let imageSizes = {
            large: imageUrl,
            medium: imageUrl,
            small: imageUrl,
            thumb: imageUrl,
          };

          try {
            imageSizes = await optimizeAndGenerateSizes(imageUrl, slug);
          } catch {
            console.warn("Image optimization failed, using original");
          }

          sendSSE(controller, {
            type: "progress",
            step: "image-done",
            message: "✅ Görsel oluşturuldu ve optimize edildi",
          });

          // Step 6: Create source references
          const sourcesHtml =
            sourceContents.length > 1
              ? `<div class="sources-box" style="margin-top: 2rem; padding: 1rem; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <h3 style="margin-bottom: 0.5rem; font-size: 1rem; font-weight: 600;">📚 Kaynaklar</h3>
                <ul style="margin: 0; padding-left: 1.5rem; list-style-type: disc;">
                  ${sourceContents.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title}</a></li>`).join("\n")}
                </ul>
              </div>`
              : "";

          const finalContent = rewritten.content + sourcesHtml;

          // Step 7: Save to database
          sendSSE(controller, {
            type: "progress",
            step: "save",
            message: "💾 Haber veritabanına kaydediliyor...",
          });

          const article = await db.article.create({
            data: {
              title: rewritten.title,
              slug,
              excerpt: rewritten.excerpt,
              content: finalContent,
              imageUrl: imageSizes.large,
              imageUrlMedium: imageSizes.medium,
              imageUrlSmall: imageSizes.small,
              imageUrlThumb: imageSizes.thumb,
              sourceUrl: url,
              metaTitle: rewritten.title,
              metaDescription: rewritten.metaDescription,
              keywords: rewritten.keywords,
              status: "PUBLISHED",
              publishedAt: new Date(),
              category: {
                connect: { slug: category.slug },
              },
            },
          });

          sendSSE(controller, {
            type: "progress",
            step: "save-done",
            message: "✅ Haber veritabanına kaydedildi",
          });

          // Step 8: Create English version
          sendSSE(controller, {
            type: "progress",
            step: "translate",
            message: "🌐 İngilizce versiyon oluşturuluyor...",
          });

          try {
            await translateAndSaveArticle(article.id);
            sendSSE(controller, {
              type: "progress",
              step: "translate-done",
              message: "✅ İngilizce versiyon oluşturuldu",
            });
          } catch (transError) {
            console.error("Translation error:", transError);
            sendSSE(controller, {
              type: "progress",
              step: "translate-error",
              message: "⚠️ İngilizce versiyon oluşturulamadı (devam ediliyor)",
            });
          }

          // Step 9: Submit to search engines
          sendSSE(controller, {
            type: "progress",
            step: "index",
            message: "🔍 Arama motorlarına gönderiliyor...",
          });

          try {
            await submitArticleToIndexNow(slug);
            sendSSE(controller, {
              type: "progress",
              step: "index-done",
              message: "✅ IndexNow'a gönderildi",
            });
          } catch {
            // Non-critical, continue
          }

          // Complete!
          sendSSE(controller, {
            type: "complete",
            title: rewritten.title,
            slug,
            articleId: article.id,
          });

          controller.close();
        } catch (error) {
          console.error("Deep analysis error:", error);
          sendSSE(controller, {
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Haber oluşturma başarısız",
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
  } catch (error) {
    console.error("Deep analysis endpoint error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
