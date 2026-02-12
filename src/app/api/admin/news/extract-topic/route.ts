import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { callDeepSeek, DeepSeekMessage } from "@/lib/deepseek";

/**
 * POST /api/admin/news/extract-topic
 * URL'den konu/topic çıkarma
 * 
 * Request: { url: string }
 * Response: { topic, summary, language, sourceTitle, sourceDescription }
 */
export async function POST(request: NextRequest) {
  try {
    // JWT Authentication
    const token = request.cookies.get("admin-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-this",
    );

    try {
      await jwtVerify(token, secret);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    console.log(`📰 Extracting topic from URL: ${url}`);

    // Step 1: Fetch content from URL
    let pageContent = "";
    let sourceTitle = "";
    let sourceDescription = "";

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          Referer: "https://www.google.com/",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "cross-site",
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      // Extract title from HTML
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      sourceTitle = titleMatch ? titleMatch[1].trim() : "";

      // Extract meta description
      const descMatch =
        html.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
        ) ||
        html.match(
          /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i,
        );
      sourceDescription = descMatch ? descMatch[1].trim() : "";

      // Extract og:title if title is empty
      if (!sourceTitle) {
        const ogTitleMatch = html.match(
          /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
        );
        sourceTitle = ogTitleMatch ? ogTitleMatch[1].trim() : "";
      }

      // Extract og:description if description is empty
      if (!sourceDescription) {
        const ogDescMatch = html.match(
          /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
        );
        sourceDescription = ogDescMatch ? ogDescMatch[1].trim() : "";
      }

      // Extract main content (strip scripts, styles, etc.)
      pageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 5000); // First 5000 chars
    } catch (fetchError) {
      console.warn(
        `⚠️ Direct fetch başarısız (${fetchError}), Jina Reader deneniyor...`,
      );

      // 🔄 Fallback: Jina Reader API
      if (process.env.JINA_READER_API_KEY) {
        try {
          const jinaUrl = `https://r.jina.ai/${url}`;
          const jinaResponse = await fetch(jinaUrl, {
            headers: {
              Authorization: `Bearer ${process.env.JINA_READER_API_KEY}`,
              "X-Return-Format": "text",
            },
            signal: AbortSignal.timeout(20000),
          });

          if (jinaResponse.ok) {
            const jinaText = await jinaResponse.text();
            if (jinaText.length > 100) {
              // Jina returns markdown — extract title from first heading
              const headingMatch = jinaText.match(/^#\s+(.+)$/m);
              if (headingMatch) {
                sourceTitle = headingMatch[1].trim();
              }
              // Extract first paragraph as description
              const lines = jinaText
                .split("\n")
                .filter(
                  (l: string) => l.trim().length > 30 && !l.startsWith("#"),
                );
              if (lines.length > 0) {
                sourceDescription = lines[0].trim().substring(0, 300);
              }
              pageContent = jinaText.substring(0, 5000);
              console.log(
                `✅ Jina Reader ile extract-topic içeriği alındı: ${pageContent.length} karakter`,
              );
            }
          }
        } catch (jinaError) {
          console.warn(`⚠️ Jina Reader da başarısız: ${jinaError}`);
        }
      }

      // Son çare: URL'den anlamlı bilgi çıkar
      if (!sourceTitle && !pageContent) {
        const pathParts = new URL(url).pathname.split("/").filter(Boolean);
        // URL slug'ını başlık olarak kullan ("/copilot-ai-productivity" -> "Copilot AI Productivity")
        const lastSlug = pathParts[pathParts.length - 1] || "";
        sourceTitle = lastSlug
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
          .trim();
        console.log(`⚠️ URL'den başlık çıkarıldı: "${sourceTitle}"`);
      }
    }

    // Detect language
    const language = detectLanguage(sourceTitle + " " + sourceDescription + " " + pageContent);

    // Step 2: Use DeepSeek to analyze topic
    let topic = "";
    let summary = "";

    try {
      const systemPrompt = `You are a news topic extraction specialist. Analyze news articles and extract concise topics.

Rules for topic:
- Use lowercase
- Use underscores instead of spaces
- Keep it short (3-5 words max)
- Be specific but not too narrow
- Examples: "openai_gpt5_release", "nvidia_ai_chip_shortage", "google_gemini_update"

Return ONLY valid JSON without any markdown formatting.`;

      const userPrompt = `Analyze this news article and extract the main topic.

Title: ${sourceTitle || "Unknown"}
Description: ${sourceDescription || "Unknown"}
URL: ${url}
Content Preview: ${pageContent.substring(0, 2000)}

Return ONLY a JSON object with these exact fields:
{
  "topic": "short topic phrase (3-5 words, lowercase, underscores for spaces)",
  "summary": "2-3 sentence summary in ${language === "tr" ? "Turkish" : "English"}"
}`;

      const messages: DeepSeekMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      const response = await callDeepSeek(messages, {
        maxTokens: 500,
        temperature: 0.3,
      });

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        topic = parsed.topic || "";
        summary = parsed.summary || "";
      }
    } catch (aiError) {
      console.error(`⚠️ DeepSeek analysis failed: ${aiError}`);
      // Fallback: generate topic from title
      topic = generateFallbackTopic(sourceTitle || url);
      summary = sourceDescription || "Özet oluşturulamadı.";
    }

    // Ensure we have a topic
    if (!topic) {
      topic = generateFallbackTopic(sourceTitle || url);
    }

    console.log(`✅ Topic extracted: ${topic}`);

    return NextResponse.json({
      topic,
      summary,
      language,
      sourceTitle: sourceTitle || "Başlık bulunamadı",
      sourceDescription: sourceDescription || "Açıklama bulunamadı",
    });

  } catch (error) {
    console.error("❌ Extract topic error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Topic extraction failed" },
      { status: 500 }
    );
  }
}

/**
 * Detect content language
 */
function detectLanguage(text: string): string {
  const turkishChars = /[çğıöşüÇĞİÖŞÜ]/g;
  const turkishWords = /\b(ve|bir|bu|için|ile|de|da|olan|olarak|gibi|daha)\b/gi;

  const turkishCharCount = (text.match(turkishChars) || []).length;
  const turkishWordCount = (text.match(turkishWords) || []).length;

  // If significant Turkish presence, return "tr"
  if (turkishCharCount > 5 || turkishWordCount > 3) {
    return "tr";
  }

  return "en";
}

/**
 * Generate fallback topic from title
 */
function generateFallbackTopic(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);

  return words.join("_") || "unknown_topic";
}
