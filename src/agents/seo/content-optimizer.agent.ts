/**
 * Content Optimizer Agent
 *
 * SORUMLULUKLAR:
 * 1. Title optimization (50-60 char, sayı ekle, yıl ekle)
 * 2. Meta description optimization (150-160 char, CTA, keywords)
 * 3. Content restructuring (H2/H3, paragraflar)
 * 4. Keyword integration (natural placement)
 *
 * MODEL: DeepSeek (derin analiz ve yaratıcı yazım için)
 */

import { callDeepSeek } from "@/lib/deepseek";
import { BaseSEOAgent } from "./base-seo.agent";
import type { SEOAnalysis } from "./analyzer.agent";

export interface ContentOptimizationChanges {
  title: {
    original: string;
    optimized: string;
    improvements: string[];
    score: number;
  };
  metaDescription: {
    original: string;
    optimized: string;
    improvements: string[];
    score: number;
  };
  content: {
    structure: {
      h2Added: number;
      h3Added: number;
      paragraphsRestructured: boolean;
    };
    optimizedContent: string;
    improvements: string[];
    score: number;
  };
  keywords: {
    primary: string[];
    lsi: string[];
    density: number;
  };
  estimatedScore: number;
}

export class ContentOptimizerAgent extends BaseSEOAgent {
  constructor() {
    super("Content Optimizer Agent");
  }

  /**
   * İçeriği optimize et
   */
  async optimize(
    article: {
      title: string;
      content: string;
      metaDescription?: string;
      keywords?: string[];
    },
    analysis: SEOAnalysis,
    language: "tr" | "en" = "tr",
  ): Promise<ContentOptimizationChanges> {
    this.start();

    return this.executeWithErrorHandling(async () => {
      console.log(
        `✍️ Content Optimizer [${language.toUpperCase()}]: "${article.title.substring(0, 50)}..." için çalışıyor`,
      );

      // Get current date for accurate year references
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();

      const prompt =
        language === "en"
          ? this.buildEnglishOptimizePrompt(
              article,
              analysis,
              currentYear,
              currentDate,
            )
          : this.buildTurkishOptimizePrompt(
              article,
              analysis,
              currentYear,
              currentDate,
            );

      const systemMessage =
        language === "en"
          ? "You are an expert content writer and SEO specialist. You optimize articles and increase SEO scores. Always respond with valid JSON only."
          : "Sen uzman bir content writer ve SEO uzmanısın. Makaleleri optimize eder ve SEO skorunu artırırsın. Her zaman sadece geçerli JSON yanıtı ver.";

      this.incrementApiCalls();

      const response = await this.retryWithBackoff(async () => {
        return await callDeepSeek(
          [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
          {
            model: "deepseek-chat",
            maxTokens: 4000,
            temperature: 0.8,
          },
        );
      });

      // JSON parse et
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to get valid JSON response from LLM");
      }

      const changes: ContentOptimizationChanges = JSON.parse(jsonMatch[0]);

      // Validasyon - evaluator ile tutarlı limitler (30-60 title, 120-160 meta)
      if (
        changes.title.optimized.length < 30 ||
        changes.title.optimized.length > 60
      ) {
        console.warn(
          `⚠️ Title length not optimal: ${changes.title.optimized.length} chars (target: 30-60)`,
        );
        // Hard-enforce: truncate if too long
        if (changes.title.optimized.length > 60) {
          const truncated = changes.title.optimized.substring(0, 57) + "...";
          console.warn(`   ✂️ Title truncated: "${truncated}"`);
          changes.title.optimized = truncated;
        }
      }

      if (
        changes.metaDescription.optimized.length < 120 ||
        changes.metaDescription.optimized.length > 160
      ) {
        console.warn(
          `⚠️ Meta description length not optimal: ${changes.metaDescription.optimized.length} chars (target: 120-160)`,
        );
        // Hard-enforce: truncate if too long
        if (changes.metaDescription.optimized.length > 160) {
          const truncated =
            changes.metaDescription.optimized.substring(0, 157) + "...";
          console.warn(
            `   ✂️ Meta description truncated: "${truncated.substring(0, 50)}..."`,
          );
          changes.metaDescription.optimized = truncated;
        }
      }

      this.complete(true);

      console.log(
        `✅ Content Optimizer [${language.toUpperCase()}] done: Score ${changes.estimatedScore}`,
      );
      console.log(`   Title: ${changes.title.optimized}`);
      console.log(
        `   Meta: ${changes.metaDescription.optimized.substring(0, 50)}...`,
      );

      return changes;
    };, "Content optimization failed");
  }

  /**
   * Turkish optimization prompt
   */
  private buildTurkishOptimizePrompt(
    article: {
      title: string;
      content: string;
      metaDescription?: string;
      keywords?: string[];
    },
    analysis: SEOAnalysis,
    currentYear: number,
    currentDate: Date,
  ): string {
    const formattedDate = currentDate.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `Sen dünya çapında ödüllü bir content writer ve SEO uzmanısın.

⚠️ KRİTİK TARİH BİLGİSİ:
- BUGÜNÜN TARİHİ: ${formattedDate}
- MEVCUT YIL: ${currentYear}
- Başlık veya içerikte yıl kullanıyorsan MUTLAKA ${currentYear} yaz!

Görevin: Bu makaleyi SEO açısından optimize et.

MAKALE:
Başlık: ${article.title}
Meta Açıklama: ${article.metaDescription || "(eksik)"}
Anahtar Kelimeler: ${article.keywords?.join(", ") || "(eksik)"}
İçerik: ${article.content}

SEO ANALİZİ:
Mevcut Skor: ${analysis.score}/100
Sorunlar: ${analysis.issues.map((i) => `- ${i.problem}`).join("\n")}
Fırsatlar: ${analysis.opportunities.map((o) => `- ${o.suggestion}`).join("\n")}

OPTİMİZASYON KURALLARI:
1. BAŞLIK: 50-60 karakter. Sayı/Yıl ekle. Keyword başta.
2. META AÇIKLAMA: 150-160 karakter. CTA ekle. Keywords doğal entegre.
3. İÇERİK: H2/H3 başlıklar. Kısa paragraflar. Bullet points. Keyword ilk 100 kelimede.
4. KEYWORDS: Yoğunluk %1-2. LSI keywords ekle. Doğal akış.
5. HEDEF SKOR: 80+ (mevcut: ${analysis.score})

JSON formatında yanıt ver:
{
  "title": {"original": "${article.title}", "optimized": "...", "improvements": ["..."], "score": 85},
  "metaDescription": {"original": "${article.metaDescription || ""}", "optimized": "...", "improvements": ["..."], "score": 90},
  "content": {"structure": {"h2Added": 3, "h3Added": 5, "paragraphsRestructured": true}, "optimizedContent": "HTML formatında...", "improvements": ["..."], "score": 80},
  "keywords": {"primary": ["..."], "lsi": ["..."], "density": 1.5},
  "estimatedScore": 85
}

ÖNEMLİ: Doğal dil kullan, keyword stuffing yapma. Mevcut içeriği tamamen değiştirme, optimize et.
SADECE GEÇERLİ JSON YANIT VER.`;
  }

  /**
   * English optimization prompt
   */
  private buildEnglishOptimizePrompt(
    article: {
      title: string;
      content: string;
      metaDescription?: string;
      keywords?: string[];
    },
    analysis: SEOAnalysis,
    currentYear: number,
    currentDate: Date,
  ): string {
    const formattedDate = currentDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `You are a world-class award-winning content writer and SEO specialist.

⚠️ CRITICAL DATE INFO:
- TODAY'S DATE: ${formattedDate}
- CURRENT YEAR: ${currentYear}
- If using a year in title or content, ALWAYS use ${currentYear}!

Your task: Optimize this article for SEO.

ARTICLE:
Title: ${article.title}
Meta Description: ${article.metaDescription || "(missing)"}
Keywords: ${article.keywords?.join(", ") || "(missing)"}
Content: ${article.content}

SEO ANALYSIS:
Current Score: ${analysis.score}/100
Issues: ${analysis.issues.map((i) => `- ${i.problem}`).join("\n")}
Opportunities: ${analysis.opportunities.map((o) => `- ${o.suggestion}`).join("\n")}

OPTIMIZATION RULES:
1. TITLE: 50-60 chars. Add numbers/year. Primary keyword first.
2. META DESCRIPTION: 150-160 chars. Add CTA ("Discover", "Learn", "Explore"). Keywords naturally integrated.
3. CONTENT: H2/H3 headings. Short paragraphs (3-4 sentences). Bullet points. Keyword in first 100 words.
4. KEYWORDS: Density 1-2%. Add LSI keywords. Natural flow.
5. TARGET SCORE: 80+ (current: ${analysis.score})

Respond in valid JSON:
{
  "title": {"original": "${article.title}", "optimized": "...", "improvements": ["..."], "score": 85},
  "metaDescription": {"original": "${article.metaDescription || ""}", "optimized": "...", "improvements": ["..."], "score": 90},
  "content": {"structure": {"h2Added": 3, "h3Added": 5, "paragraphsRestructured": true}, "optimizedContent": "HTML format...", "improvements": ["..."], "score": 80},
  "keywords": {"primary": ["..."], "lsi": ["..."], "density": 1.5},
  "estimatedScore": 85
}

IMPORTANT: Use natural language, no keyword stuffing. Don't completely rewrite, just optimize.
RESPOND WITH VALID JSON ONLY.`;
  }

  /**
   * Sadece başlık optimize et (hızlı)
   */
  async optimizeTitle(
    currentTitle: string,
    keywords?: string[],
  ): Promise<string> {
    const prompt = `Mevcut başlık: "${currentTitle}"
Anahtar kelimeler: ${keywords?.join(", ") || "Yok"}

SEO-friendly başlık oluştur:
- 50-60 karakter
- Sayı ekle (mümkünse)
- Yıl ekle (2026)
- Keyword başta
- Clickbait dengesi

Sadece başlığı yanıtla, açıklama yok.`;

    try {
      this.incrementApiCalls();

      const response = await callDeepSeek(
        [
          {
            role: "system",
            content: "Sen bir SEO başlık uzmanısın. Kısa ve öz yanıt ver.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: "deepseek-chat",
          maxTokens: 100,
          temperature: 0.9,
        },
      );

      return response.trim().substring(0, 70);
    } catch (error) {
      console.error("❌ Title optimization hatası:", error);
      return currentTitle;
    }
  }

  /**
   * Sadece meta açıklama optimize et (hızlı)
   */
  async optimizeMetaDescription(
    title: string,
    content: string,
    keywords?: string[],
  ): Promise<string> {
    const prompt = `Başlık: "${title}"
İçerik özeti: ${content.substring(0, 300)}
Anahtar kelimeler: ${keywords?.join(", ") || "Yok"}

SEO-friendly meta açıklama oluştur:
- 150-160 karakter
- CTA ekle
- Keywords entegre et
- Merak uyandır

Sadece meta açıklamayı yanıtla, açıklama yok.`;

    try {
      this.incrementApiCalls();

      const response = await callDeepSeek(
        [
          {
            role: "system",
            content:
              "Sen bir SEO meta açıklama uzmanısın. Kısa ve öz yanıt ver.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: "deepseek-chat",
          maxTokens: 200,
          temperature: 0.8,
        },
      );

      return response.trim().substring(0, 170);
    } catch (error) {
      console.error("❌ Meta description optimization hatası:", error);
      return title.substring(0, 160);
    }
  }
}

export default ContentOptimizerAgent;
