/**
 * SEO Analyzer Agent
 *
 * SORUMLULUKLAR:
 * 1. Makale SEO analizi (DeepSeek ile)
 * 2. SEO sorunlarını tespit etme
 * 3. Detaylı öneriler oluşturma
 * 4. Önceliklendirme yapma
 *
 * KULLANIM:
 * const analyzer = new SEOAnalyzerAgent();
 * const analysis = await analyzer.analyze(article);
 */

import { callDeepSeek } from "@/lib/deepseek";

export interface SEOIssue {
  type:
    | "title"
    | "meta_description"
    | "content"
    | "keywords"
    | "images"
    | "links"
    | "technical";
  severity: "critical" | "high" | "medium" | "low";
  current: string;
  problem: string;
  impact: string;
  priority: number;
}

export interface SEOOpportunity {
  type: string;
  suggestion: string;
  expectedImpact: string;
}

export interface SEOAnalysis {
  score: number;
  issues: SEOIssue[];
  opportunities: SEOOpportunity[];
  recommendations?: string[]; // Opsiyonel öneriler listesi
  summary: string;
}

export class SEOAnalyzerAgent {
  private metrics = {
    startTime: 0,
    endTime: 0,
    duration: 0,
    apiCalls: 0,
    success: false,
  };

  /**
   * Get metrics
   */
  public getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Makaleyi detaylı analiz et ve SEO sorunlarını tespit et
   * @param language - 'tr' for Turkish analysis, 'en' for English analysis
   */
  async analyze(
    article: {
      title: string;
      content: string;
      metaDescription?: string;
      slug: string;
      keywords?: string[];
      imageUrl?: string;
    },
    language: "tr" | "en" = "tr",
  ): Promise<SEOAnalysis> {
    this.metrics.startTime = Date.now();
    this.metrics.apiCalls++;

    console.log(
      `🔍 SEO Analyzer [${language.toUpperCase()}]: Analyzing article "${article.title}"...`,
    );

    const prompt =
      language === "en"
        ? this.buildEnglishPrompt(article)
        : this.buildTurkishPrompt(article);

    const systemMessage =
      language === "en"
        ? "You are an expert SEO analyst. You analyze articles in detail and provide actionable recommendations. Always respond with valid JSON only."
        : "Sen uzman bir SEO analistisin. Makaleleri detaylı analiz eder ve actionable öneriler sunarsın. Her zaman sadece geçerli JSON yanıtı ver.";

    try {
      const response = await callDeepSeek(
        [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt },
        ],
        {
          model: "deepseek-chat",
          maxTokens: 3000,
          temperature: 0.7,
        },
      );

      // JSON'u extract et
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse SEO analysis response");
      }

      const analysis: SEOAnalysis = JSON.parse(jsonMatch[0]);

      this.metrics.endTime = Date.now();
      this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
      this.metrics.success = true;

      console.log(
        `✅ SEO Analyzer [${language.toUpperCase()}]: Analysis complete`,
      );
      console.log(`   Score: ${analysis.score}/100`);
      console.log(`   Issues: ${analysis.issues.length}`);
      console.log(`   Opportunities: ${analysis.opportunities.length}`);

      return analysis;
    } catch (error) {
      this.metrics.endTime = Date.now();
      this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
      this.metrics.success = false;

      console.error(
        `❌ SEO Analyzer [${language.toUpperCase()}]: Analysis failed:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Turkish SEO analysis prompt
   */
  private buildTurkishPrompt(article: {
    title: string;
    content: string;
    metaDescription?: string;
    slug: string;
    keywords?: string[];
    imageUrl?: string;
  }): string {
    return `Sen dünya çapında ödüllü bir SEO uzmanısın.

Görevin: Bu makaleyi detaylı analiz et ve SEO sorunlarını tespit et.

MAKALE:
Başlık: ${article.title}
Slug: ${article.slug}
Meta Açıklama: ${article.metaDescription || "(eksik)"}
Anahtar Kelimeler: ${article.keywords?.join(", ") || "(eksik)"}
Görsel: ${article.imageUrl ? "Var" : "Yok"}
İçerik Uzunluğu: ${article.content.length} karakter
İçerik Önizleme: ${article.content.substring(0, 500)}...

ANALİZ KRİTERLERİ:

1. **BAŞLIK (Title Tag):** Uzunluk: 50-60 karakter optimal. Anahtar kelime ilk 5 kelimede. Sayı/Yıl varsa CTR artar.
2. **META AÇIKLAMA:** Uzunluk: 150-160 karakter. CTA ekle. Anahtar kelime doğal entegre.
3. **İÇERİK:** Min 300 kelime. H2/H3 başlıklar (min 2 H2). Kısa paragraflar.
4. **ANAHTAR KELİMELER:** Yoğunluk %1-2. Başlık, ilk paragraf, H2'ler, son paragrafta.
5. **TEKNİK SEO:** Slug max 75 karakter. Görsel alt text. İç/dış linkler.
6. **SKOR:** 0-40: Kötü, 41-60: Orta, 61-80: İyi, 81-100: Mükemmel.

JSON formatında yanıt ver:
{
  "score": 45,
  "issues": [{"type": "title", "severity": "critical", "current": "...", "problem": "...", "impact": "...", "priority": 1}],
  "opportunities": [{"type": "content", "suggestion": "...", "expectedImpact": "..."}],
  "summary": "Özet..."
}

ÖNEMLİ: Her issue için priority belirle (1=en önemli). Severity doğru belirle. Gerçekçi impact tahminleri yap.`;
  }

  /**
   * English SEO analysis prompt
   */
  private buildEnglishPrompt(article: {
    title: string;
    content: string;
    metaDescription?: string;
    slug: string;
    keywords?: string[];
    imageUrl?: string;
  }): string {
    return `You are a world-class award-winning SEO expert.

Your task: Analyze this article in detail and identify SEO issues.

ARTICLE:
Title: ${article.title}
Slug: ${article.slug}
Meta Description: ${article.metaDescription || "(missing)"}
Keywords: ${article.keywords?.join(", ") || "(missing)"}
Image: ${article.imageUrl ? "Yes" : "No"}
Content Length: ${article.content.length} characters
Content Preview: ${article.content.substring(0, 500)}...

ANALYSIS CRITERIA:

1. **TITLE TAG:** Length: 50-60 chars optimal. Primary keyword in first 5 words. Numbers/Year boost CTR.
2. **META DESCRIPTION:** Length: 150-160 chars. Include CTA like "Discover", "Learn", "Explore". Keywords naturally integrated.
3. **CONTENT:** Min 300 words. H2/H3 headings (min 2 H2). Short paragraphs (3-4 sentences max).
4. **KEYWORDS:** Density 1-2%. Placement: title, first paragraph, H2s, last paragraph. Include LSI keywords.
5. **TECHNICAL SEO:** Slug max 75 chars, lowercase, hyphenated. Image alt text. Internal/external links.
6. **SCORING:** 0-40: Poor, 41-60: Fair, 61-80: Good, 81-100: Excellent.

Respond in JSON format:
{
  "score": 45,
  "issues": [{"type": "title", "severity": "critical", "current": "...", "problem": "...", "impact": "...", "priority": 1}],
  "opportunities": [{"type": "content", "suggestion": "...", "expectedImpact": "..."}],
  "summary": "Summary..."
}

IMPORTANT: Set priority for each issue (1=most important). Set severity correctly. Make realistic impact estimates.`;
  }

  /**
   * Birden fazla makaleyi batch olarak analiz et
   */
  async analyzeBatch(
    articles: Array<{
      id: string;
      title: string;
      content: string;
      metaDescription?: string;
      slug: string;
      keywords?: string[];
      imageUrl?: string;
    }>,
    language: "tr" | "en" = "tr",
  ): Promise<Map<string, SEOAnalysis>> {
    console.log(
      `🔍 SEO Analyzer: Batch analyzing ${articles.length} articles [${language.toUpperCase()}]...`,
    );

    const results = new Map<string, SEOAnalysis>();

    // Paralel analiz (max 3 aynı anda)
    const concurrency = 3;
    for (let i = 0; i < articles.length; i += concurrency) {
      const batch = articles.slice(i, i + concurrency);

      const analyses = await Promise.all(
        batch.map(async (article) => {
          try {
            const analysis = await this.analyze(article, language);
            return { id: article.id, analysis };
          } catch (error) {
            console.error(`❌ Failed to analyze article ${article.id}:`, error);
            return null;
          }
        }),
      );

      // Sonuçları map'e ekle
      analyses.forEach((result) => {
        if (result) {
          results.set(result.id, result.analysis);
        }
      });

      // Rate limiting
      if (i + concurrency < articles.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(
      `✅ SEO Analyzer: Batch analysis complete (${results.size}/${articles.length} successful)`,
    );

    return results;
  }
}
