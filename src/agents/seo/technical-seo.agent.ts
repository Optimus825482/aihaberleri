/**
 * Technical SEO Agent
 *
 * SORUMLULUKLAR:
 * 1. Slug optimizasyonu (lowercase, hyphens, keywords)
 * 2. Image alt text (descriptive, keywords)
 * 3. Internal linking (2-3 relevant links)
 * 4. Schema markup (Article schema)
 *
 * MODEL: DeepSeek-chat
 */

import { callDeepSeek } from "@/lib/deepseek";

export interface TechnicalSEOChanges {
  slug: {
    original: string;
    optimized: string;
    improvements: string[];
    score: number;
  };
  images: {
    altText: string;
    improvements: string[];
  };
  internalLinks: Array<{
    anchor: string;
    url: string;
    placement: string;
    reasoning: string;
  }>;
  schema: {
    type: string;
    markup: string;
  };
  estimatedScore: number;
}

export class TechnicalSEOAgent {
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
   * Technical SEO optimizasyonu yap
   */
  async optimize(
    article: {
      id: string;
      title: string;
      slug: string;
      content: string | null;
      imageUrl: string | null;
      category?: { name: string } | null;
    },
    relatedArticles?: Array<{ id: string; title: string; slug: string }>,
  ): Promise<TechnicalSEOChanges> {
    this.metrics.startTime = Date.now();
    this.metrics.apiCalls++;

    console.log(
      `🔧 Technical SEO Agent: ${article.title.substring(0, 50)}... için çalışıyor`,
    );

    const relatedArticlesText = relatedArticles
      ? relatedArticles
          .map(
            (a, i) => `${i + 1}. "${a.title}" - /haber/${a.slug} (ID: ${a.id})`,
          )
          .join("\n")
      : "İlgili makale bulunamadı";

    const prompt = `Sen bir technical SEO uzmanısın.

Görevin: Bu makalenin technical SEO yönlerini optimize et.

MAKALE:
Başlık: ${article.title}
Slug: ${article.slug}
İçerik Özeti: ${article.content?.substring(0, 500) || "İçerik yok"}
Görsel URL: ${article.imageUrl || "Görsel yok"}
Kategori: ${article.category?.name || "Bilinmiyor"}

İLGİLİ MAKALELER (Internal linking için):
${relatedArticlesText}

OPTİMİZASYON KURALLARI:

1. **SLUG:**
   - Küçük harf (lowercase)
   - Tire ile ayrılmış (hyphens)
   - Ana keyword başta
   - Max 75 karakter
   - Türkçe karakter yok (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u)
   - Gereksiz kelimeler çıkar (ve, veya, için, ile, bir, bu)

2. **IMAGE ALT TEXT:**
   - Açıklayıcı (descriptive)
   - Ana keyword içermeli
   - Max 125 karakter
   - Doğal dil (keyword stuffing yok)
   - Accessibility için optimize

3. **INTERNAL LINKS:**
   - 2-3 ilgili makale linki
   - Doğal anchor text (keyword-rich ama natural)
   - İçeriğin hangi paragrafına ekleneceğini belirt
   - Neden bu linkin alakalı olduğunu açıkla

4. **SCHEMA MARKUP:**
   - Article schema (JSON-LD)
   - headline, description, author, datePublished, dateModified
   - image, publisher bilgileri

JSON formatında yanıt ver:
{
  "slug": {
    "original": "${article.slug}",
    "optimized": "optimized-slug-here",
    "improvements": ["Keyword başa alındı", "Gereksiz kelimeler çıkarıldı"],
    "score": 85
  },
  "images": {
    "altText": "Açıklayıcı alt text buraya",
    "improvements": ["Alt text eklendi", "Keyword entegre edildi"]
  },
  "internalLinks": [
    {
      "anchor": "doğal anchor text",
      "url": "/haber/related-article-slug",
      "placement": "2. paragraf sonunda",
      "reasoning": "Bu makale X konusunu detaylandırıyor"
    }
  ],
  "schema": {
    "type": "Article",
    "markup": "{\\"@context\\": \\"https://schema.org\\", ...}"
  },
  "estimatedScore": 85
}

SADECE GEÇERLİ JSON YANIT VER. AÇIKLAMA YOK.`;

    try {
      const response = await callDeepSeek(
        [
          {
            role: "system",
            content: "Sen bir technical SEO uzmanısın. Sadece geçerli JSON yanıtı ver.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: "deepseek-chat",
          temperature: 0.3,
          maxTokens: 2000,
        }
      );

      // JSON parse et
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("DeepSeek'ten geçerli JSON yanıtı alınamadı");
      }

      const changes: TechnicalSEOChanges = JSON.parse(jsonMatch[0]);

      this.metrics.endTime = Date.now();
      this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
      this.metrics.success = true;

      console.log(
        `✅ Technical SEO Agent tamamlandı: Skor ${changes.estimatedScore}`,
      );

      return changes;
    } catch (error) {
      this.metrics.endTime = Date.now();
      this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
      this.metrics.success = false;

      console.error("❌ Technical SEO Agent hatası:", error);
      throw new Error(
        `Technical SEO optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Sadece slug optimizasyonu (hızlı)
   */
  async optimizeSlug(title: string, currentSlug: string): Promise<string> {
    const prompt = `Başlık: "${title}"
Mevcut slug: "${currentSlug}"

SEO-friendly slug oluştur:
- Küçük harf
- Tire ile ayrılmış
- Ana keyword başta
- Max 75 karakter
- Türkçe karakter yok
- Gereksiz kelimeler çıkar

Sadece slug'ı yanıtla, açıklama yok.`;

    try {
      const response = await callDeepSeek(
        [{ role: "user", content: prompt }],
        {
          model: "deepseek-chat",
          temperature: 0.2,
          maxTokens: 100,
        }
      );

      return response.trim().toLowerCase();
    } catch (error) {
      console.error("❌ Slug optimization hatası:", error);
      // Fallback: basit slug oluştur
      return this.createFallbackSlug(title);
    }
  }

  /**
   * Fallback slug oluştur (AI başarısız olursa)
   */
  private createFallbackSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ş/g, "s")
      .replace(/ü/g, "u")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 75);
  }

  /**
   * Image alt text oluştur
   */
  async generateAltText(
    title: string,
    content: string,
    category: string,
  ): Promise<string> {
    const prompt = `Başlık: "${title}"
Kategori: ${category}
İçerik: ${content.substring(0, 300)}

Bu haber için SEO-friendly image alt text oluştur:
- Max 125 karakter
- Açıklayıcı
- Ana keyword içermeli
- Doğal dil

Sadece alt text'i yanıtla, açıklama yok.`;

    try {
      const response = await callDeepSeek(
        [{ role: "user", content: prompt }],
        {
          model: "deepseek-chat",
          temperature: 0.5,
          maxTokens: 150,
        }
      );

      return response.trim().substring(0, 125);
    } catch (error) {
      console.error("❌ Alt text generation hatası:", error);
      // Fallback: başlık kullan
      return title.substring(0, 125);
    }
  }
}

export default TechnicalSEOAgent;
