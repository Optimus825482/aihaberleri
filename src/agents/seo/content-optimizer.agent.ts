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
  ): Promise<ContentOptimizationChanges> {
    this.start();

    return this.executeWithErrorHandling(async () => {
      console.log(
        `✍️ Content Optimizer: "${article.title.substring(0, 50)}..." için çalışıyor`,
      );

      const prompt = `Sen dünya çapında ödüllü bir content writer ve SEO uzmanısın.

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

1. **BAŞLIK (Title Tag):**
   - Uzunluk: 50-60 karakter (optimal)
   - Sayı ekle: "5 Yeni Gelişme", "10 İpucu" (CTR artar)
   - Yıl ekle: "2026 Rehberi" (freshness)
   - Keyword başta: Ana keyword ilk 5 kelimede
   - Clickbait dengesi: Merak uyandır ama dürüst ol
   - Örnekler:
     * KÖTÜ: "AI Haberleri" (çok kısa, generic)
     * İYİ: "AI Teknolojisinde Çığır Açan 5 Yeni Gelişme: 2026 Rehberi" (58 char)

2. **META AÇIKLAMA (Meta Description):**
   - Uzunluk: 150-160 karakter (optimal)
   - CTA ekle: "Keşfedin", "Öğrenin", "İnceleyin", "Okuyun"
   - Keywords: Doğal şekilde entegre et
   - Özet: Makaleyi özetle, merak uyandır
   - Örnekler:
     * KÖTÜ: "Bu makalede AI hakkında bilgi var." (çok kısa)
     * İYİ: "2026'da yapay zeka dünyasını değiştirecek 5 yeni gelişmeyi keşfedin. OpenAI, Google ve daha fazlası. Detaylı analiz." (155 char)

3. **İÇERİK YAPISI:**
   - H2 başlıklar: Minimum 2-3 tane (ana bölümler)
   - H3 alt başlıklar: H2'lerin altında detaylar
   - Paragraflar: Kısa ve öz (max 3-4 cümle)
   - Bullet points: Listelerde kullan
   - İlk paragraf: Ana keyword ilk 100 kelimede
   - Son paragraf: Özet ve CTA

4. **KEYWORD ENTEGRASYONU:**
   - Yoğunluk: %1-2 optimal
   - Yerleşim: Başlık, ilk paragraf, H2'ler, son paragraf
   - LSI Keywords: İlgili terimler ekle
   - Doğallık: Zorla ekleme, doğal akış

5. **SKOR TAHMİNİ:**
   - Mevcut skor: ${analysis.score}
   - Hedef skor: 80+
   - Beklenen artış: +${Math.max(80 - analysis.score, 0)} puan

JSON formatında yanıt ver:
{
  "title": {
    "original": "${article.title}",
    "optimized": "Optimize edilmiş başlık buraya (50-60 char)",
    "improvements": ["Sayı eklendi", "Yıl eklendi", "Keyword başa alındı"],
    "score": 85
  },
  "metaDescription": {
    "original": "${article.metaDescription || "(eksik)"}",
    "optimized": "Optimize edilmiş meta açıklama buraya (150-160 char)",
    "improvements": ["CTA eklendi", "Keywords entegre edildi", "Uzunluk optimize edildi"],
    "score": 90
  },
  "content": {
    "structure": {
      "h2Added": 3,
      "h3Added": 5,
      "paragraphsRestructured": true
    },
    "optimizedContent": "Optimize edilmiş içerik buraya (HTML formatında, <h2>, <h3>, <p>, <ul> kullan)",
    "improvements": ["H2 başlıklar eklendi", "Paragraflar yeniden yapılandırıldı", "Bullet points eklendi"],
    "score": 80
  },
  "keywords": {
    "primary": ["yapay zeka", "ai teknolojisi", "machine learning"],
    "lsi": ["derin öğrenme", "neural network", "ai modelleri"],
    "density": 1.5
  },
  "estimatedScore": 85
}

**ÖNEMLİ:**
- Başlık 50-60 karakter arasında olmalı
- Meta açıklama 150-160 karakter arasında olmalı
- İçerik HTML formatında olmalı (<h2>, <h3>, <p>, <ul>, <li>)
- Doğal dil kullan, keyword stuffing yapma
- Mevcut içeriği tamamen değiştirme, sadece optimize et

SADECE GEÇERLİ JSON YANIT VER.`;

      this.incrementApiCalls();

      const response = await this.retryWithBackoff(async () => {
        return await callDeepSeek(
          [
            {
              role: "system",
              content:
                "Sen uzman bir content writer ve SEO uzmanısın. Makaleleri optimize eder ve SEO skorunu artırırsın. Her zaman sadece geçerli JSON yanıtı ver.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          {
            model: "deepseek-chat",
            maxTokens: 4000,
            temperature: 0.8, // Yaratıcı yazım için
          },
        );
      });

      // JSON parse et
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("DeepSeek'ten geçerli JSON yanıtı alınamadı");
      }

      const changes: ContentOptimizationChanges = JSON.parse(jsonMatch[0]);

      // Validasyon
      if (
        changes.title.optimized.length < 30 ||
        changes.title.optimized.length > 70
      ) {
        console.warn(
          `⚠️ Başlık uzunluğu optimal değil: ${changes.title.optimized.length} karakter`,
        );
      }

      if (
        changes.metaDescription.optimized.length < 140 ||
        changes.metaDescription.optimized.length > 170
      ) {
        console.warn(
          `⚠️ Meta açıklama uzunluğu optimal değil: ${changes.metaDescription.optimized.length} karakter`,
        );
      }

      this.complete(true);

      console.log(
        `✅ Content Optimizer tamamlandı: Skor ${changes.estimatedScore}`,
      );
      console.log(`   Başlık: ${changes.title.optimized}`);
      console.log(
        `   Meta: ${changes.metaDescription.optimized.substring(0, 50)}...`,
      );

      return changes;
    }, "Content optimization failed");
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
