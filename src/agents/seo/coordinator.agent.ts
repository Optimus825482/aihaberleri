/**
 * Coordinator Agent
 *
 * SORUMLULUKLAR:
 * 1. Tüm agent'ların değişikliklerini birleştir
 * 2. Çakışmaları çöz (örn: title uzunluğu vs keywords)
 * 3. Final review yap
 * 4. Tutarlılık kontrolü
 *
 * MODEL: DeepSeek-chat
 */

import { callDeepSeek } from "@/lib/deepseek";
import { BaseSEOAgent } from "./base-seo.agent";
import type { ContentOptimizationChanges } from "./content-optimizer.agent";
import type { TechnicalSEOChanges } from "./technical-seo.agent";

export interface ConflictResolution {
  issue: string;
  resolution: string;
  reasoning: string;
}

export interface FinalSEOChanges {
  title: string;
  metaDescription: string;
  content: string;
  slug: string;
  imageAltText: string;
  internalLinks: Array<{
    anchor: string;
    url: string;
    placement: string;
  }>;
  schema: {
    type: string;
    markup: string;
  };
  keywords: {
    primary: string[];
    lsi: string[];
  };
  estimatedScore: number;
  confidence: number;
  conflicts: ConflictResolution[];
  improvements: string[];
}

export class CoordinatorAgent extends BaseSEOAgent {
  constructor() {
    super("Coordinator Agent");
  }

  /**
   * Tüm değişiklikleri koordine et ve birleştir
   */
  async coordinate(
    contentChanges: ContentOptimizationChanges,
    technicalChanges: TechnicalSEOChanges,
    originalArticle: {
      title: string;
      content: string;
      metaDescription?: string;
      slug: string;
    },
  ): Promise<FinalSEOChanges> {
    this.start();

    return this.executeWithErrorHandling(async () => {
      console.log(`🤝 Coordinator: Değişiklikler birleştiriliyor...`);

      const prompt = `Sen bir koordinasyon uzmanısın.

Görevin: Bu SEO değişikliklerini birleştir ve çakışmaları çöz.

ORİJİNAL MAKALE:
Başlık: ${originalArticle.title}
Meta: ${originalArticle.metaDescription || "(eksik)"}
Slug: ${originalArticle.slug}

CONTENT OPTIMIZER DEĞİŞİKLİKLERİ:
Başlık: ${contentChanges.title.optimized}
Meta: ${contentChanges.metaDescription.optimized}
İçerik: ${contentChanges.content.optimizedContent.substring(0, 500)}...
Tahmini Skor: ${contentChanges.estimatedScore}

TECHNICAL SEO DEĞİŞİKLİKLERİ:
Slug: ${technicalChanges.slug.optimized}
Image Alt: ${technicalChanges.images.altText}
Internal Links: ${technicalChanges.internalLinks.length} link
Schema: ${technicalChanges.schema.type}
Tahmini Skor: ${technicalChanges.estimatedScore}

JSON formatında yanıt ver:
{
  "title": "Final başlık",
  "metaDescription": "Final meta",
  "content": "Final içerik",
  "slug": "final-slug",
  "imageAltText": "Final alt text",
  "internalLinks": [],
  "schema": {"type": "Article", "markup": "{}"},
  "keywords": {"primary": [], "lsi": []},
  "estimatedScore": 85,
  "confidence": 0.95,
  "conflicts": [],
  "improvements": []
}`;

      this.incrementApiCalls();

      const response = await this.retryWithBackoff(async () => {
        return await callDeepSeek(
          [{ role: "user", content: prompt }],
          {
            model: "deepseek-v4-flash",
            temperature: 0.3,
            maxTokens: 3000,
          }
        );
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("JSON parse hatası");
      }

      const finalChanges: FinalSEOChanges = JSON.parse(jsonMatch[0]);

      this.complete(true);

      console.log(
        `✅ Coordinator tamamlandı: Skor ${finalChanges.estimatedScore}`,
      );

      return finalChanges;
    }, "Coordination failed");
  }
}

export default CoordinatorAgent;
