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
   */
  async analyze(article: {
    title: string;
    content: string;
    metaDescription?: string;
    slug: string;
    keywords?: string[];
    imageUrl?: string;
  }): Promise<SEOAnalysis> {
    this.metrics.startTime = Date.now();
    this.metrics.apiCalls++;

    console.log(`🔍 SEO Analyzer: Analyzing article "${article.title}"...`);

    const prompt = `Sen dünya çapında ödüllü bir SEO uzmanısın.

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

1. **BAŞLIK (Title Tag):**
   - Uzunluk: 50-60 karakter optimal (30-60 kabul edilebilir)
   - Anahtar kelime: İlk 5 kelimede olmalı
   - Clickbait dengesi: Merak uyandırmalı ama dürüst
   - Sayı/Yıl: Varsa CTR artar
   - Örnekler:
     * KÖTÜ: "AI Haberleri" (çok kısa, generic)
     * İYİ: "AI Teknolojisinde Çığır Açan 5 Yeni Gelişme: 2026 Rehberi" (58 char, sayı, yıl)

2. **META AÇIKLAMA (Meta Description):**
   - Uzunluk: 150-160 karakter optimal
   - CTA (Call-to-Action): "Keşfedin", "Öğrenin", "İnceleyin"
   - Anahtar kelime: Doğal şekilde entegre
   - Özet: Makaleyi özetlemeli
   - Örnekler:
     * KÖTÜ: "Bu makalede AI hakkında bilgi var." (çok kısa, generic)
     * İYİ: "2026'da yapay zeka dünyasını değiştirecek 5 yeni gelişmeyi keşfedin. OpenAI, Google ve daha fazlası." (155 char, CTA, keywords)

3. **İÇERİK (Content):**
   - Uzunluk: Minimum 300 kelime (optimal 500-1000)
   - Yapı: H2/H3 başlıklar (minimum 2 H2)
   - Paragraflar: Kısa ve öz (max 3-4 cümle)
   - Okunabilirlik: Basit dil, kısa cümleler
   - Bullet points: Listelerde kullan
   - İlk paragraf: Anahtar kelime ilk 100 kelimede

4. **ANAHTAR KELİMELER (Keywords):**
   - Yoğunluk: %1-2 optimal
   - Yerleşim: Başlık, ilk paragraf, H2'ler, son paragraf
   - LSI Keywords: İlgili terimler (örn: "AI" → "yapay zeka", "machine learning")
   - Doğallık: Zorla ekleme, doğal akış

5. **TEKNİK SEO:**
   - Slug: Küçük harf, tire ile ayrılmış, max 75 karakter
   - Görsel: Alt text olmalı
   - İç linkler: 2-3 ilgili makale linki
   - Dış linkler: Güvenilir kaynaklara

6. **SKOR HESAPLAMA:**
   - 0-40: Kötü (critical issues)
   - 41-60: Orta (high issues)
   - 61-80: İyi (medium issues)
   - 81-100: Mükemmel (low/no issues)

JSON formatında yanıt ver:
{
  "score": 45,
  "issues": [
    {
      "type": "title",
      "severity": "critical",
      "current": "AI Haberleri",
      "problem": "Başlık çok kısa (12 karakter, optimal 50-60)",
      "impact": "CTR düşük olacak, arama motorlarında görünürlük azalacak",
      "priority": 1
    },
    {
      "type": "meta_description",
      "severity": "critical",
      "current": "(eksik)",
      "problem": "Meta açıklama eksik",
      "impact": "Google otomatik snippet oluşturacak, CTR düşük olacak",
      "priority": 2
    }
  ],
  "opportunities": [
    {
      "type": "content",
      "suggestion": "H2 başlıkları ekle (minimum 2-3 tane)",
      "expectedImpact": "+10 skor, okunabilirlik artacak"
    },
    {
      "type": "keywords",
      "suggestion": "LSI keywords ekle (yapay zeka, machine learning, deep learning)",
      "expectedImpact": "+5 skor, semantic SEO güçlenecek"
    }
  ],
  "summary": "Makale ciddi SEO sorunları içeriyor. Başlık ve meta açıklama eksik/yetersiz. İçerik yapısı zayıf. Öncelikle başlık ve meta açıklama optimize edilmeli."
}

**ÖNEMLİ:** 
- Her issue için priority belirle (1 = en önemli)
- Severity'yi doğru belirle (critical = skor 0-40, high = 41-60, medium = 61-80, low = 81-100)
- Opportunities'de gerçekçi impact tahminleri yap
- Summary'de en kritik sorunları vurgula`;

    try {
      const response = await callDeepSeek(
        [
          {
            role: "system",
            content:
              "Sen uzman bir SEO analistisin. Makaleleri detaylı analiz eder ve actionable öneriler sunarsın. Her zaman sadece geçerli JSON yanıtı ver.",
          },
          {
            role: "user",
            content: prompt,
          },
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

      console.log(`✅ SEO Analyzer: Analysis complete`);
      console.log(`   Score: ${analysis.score}/100`);
      console.log(`   Issues: ${analysis.issues.length}`);
      console.log(`   Opportunities: ${analysis.opportunities.length}`);

      return analysis;
    } catch (error) {
      this.metrics.endTime = Date.now();
      this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
      this.metrics.success = false;

      console.error("❌ SEO Analyzer: Analysis failed:", error);
      throw error;
    }
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
  ): Promise<Map<string, SEOAnalysis>> {
    console.log(
      `🔍 SEO Analyzer: Batch analyzing ${articles.length} articles...`,
    );

    const results = new Map<string, SEOAnalysis>();

    // Paralel analiz (max 3 aynı anda)
    const concurrency = 3;
    for (let i = 0; i < articles.length; i += concurrency) {
      const batch = articles.slice(i, i + concurrency);

      const analyses = await Promise.all(
        batch.map(async (article) => {
          try {
            const analysis = await this.analyze(article);
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
