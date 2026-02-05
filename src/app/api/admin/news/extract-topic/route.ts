/**
 * Extract Topic API
 * Extracts the main topic/subject from a news article URL
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callDeepSeek } from "@/lib/deepseek";
import axios from "axios";
import * as cheerio from "cheerio";

export const maxDuration = 60;

// Fetch article content from URL
async function fetchArticleContent(
  url: string,
): Promise<{ title: string; description: string; content: string }> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5,tr;q=0.3",
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);

    // Remove scripts, styles, comments
    $("script, style, noscript, iframe, nav, footer, header, aside").remove();

    // Extract title
    let title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text() ||
      $("h1").first().text();

    // Extract description
    let description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      "";

    // Extract main content
    // Try common article selectors
    const articleSelectors = [
      "article",
      '[role="article"]',
      ".article-content",
      ".post-content",
      ".entry-content",
      ".content-body",
      ".story-body",
      "main",
      ".main-content",
    ];

    let content = "";
    for (const selector of articleSelectors) {
      const selected = $(selector);
      if (selected.length > 0) {
        content = selected.text().trim();
        if (content.length > 200) break;
      }
    }

    // Fallback: get all paragraphs
    if (!content || content.length < 200) {
      content = $("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .join("\n\n");
    }

    // Clean up content
    content = content
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 8000); // Limit to 8000 chars

    return {
      title: title?.trim() || "",
      description: description?.trim() || "",
      content: content || description,
    };
  } catch (error) {
    console.error("Error fetching article:", error);
    throw new Error("Haber içeriği alınamadı");
  }
}

// Detect language
function detectLanguage(text: string): "tr" | "en" {
  const turkishChars = /[çğıöşüÇĞİÖŞÜ]/g;
  const turkishWords =
    /(ve|ile|için|bu|bir|olan|olarak|gibi|daha|sonra|önce|kadar|ancak)/gi;

  const turkishCharCount = (text.match(turkishChars) || []).length;
  const turkishWordCount = (text.match(turkishWords) || []).length;

  if (turkishCharCount > 3 || turkishWordCount > 5) {
    return "tr";
  }
  return "en";
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL gerekli" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Geçersiz URL" }, { status: 400 });
    }

    // Fetch article content
    const article = await fetchArticleContent(url);

    if (!article.title && !article.content) {
      return NextResponse.json(
        { error: "Haber içeriği bulunamadı" },
        { status: 400 },
      );
    }

    // Detect language
    const language = detectLanguage(article.title + " " + article.content);

    // Use DeepSeek to extract topic
    const systemPrompt = `Sen bir haber analisti ve konu uzmanısın. Sana verilen haber başlığı ve içeriğinden ana konuyu çıkaracaksın.

GÖREV:
1. Haberin ana konusunu/temesini belirle (örn: "OpenAI GPT-5 Duyurusu", "NVIDIA AI Çip Satışları", "Google Gemini Güncellemesi")
2. Kısa bir özet yaz (2-3 cümle)

KURALLAR:
- Konu spesifik olmalı, genel değil
- Şirket adı varsa dahil et
- Türkçe yanıt ver

JSON formatında yanıt ver:
{
  "topic": "Ana konu (10-15 kelime max)",
  "summary": "Kısa özet (2-3 cümle)"
}`;

    const userPrompt = `Başlık: ${article.title}

İçerik:
${article.content.slice(0, 4000)}`;

    const response = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.3, maxTokens: 500 },
    );

    // Parse response
    let result;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("JSON not found");
      }
    } catch {
      // Fallback: use title as topic
      result = {
        topic: article.title,
        summary: article.description || article.content.slice(0, 200),
      };
    }

    return NextResponse.json({
      topic: result.topic,
      summary: result.summary,
      language,
      sourceTitle: article.title,
      sourceDescription: article.description,
    });
  } catch (error) {
    console.error("Extract topic error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Konu çıkarma başarısız",
      },
      { status: 500 },
    );
  }
}
