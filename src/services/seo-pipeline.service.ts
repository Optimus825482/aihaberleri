/**
 * SEO Pipeline Service — Evaluate → Optimize → Validate Loop
 *
 * AKISx:
 * 1. Evaluator → mevcut skor + sorunlar
 * 2. Optimizer → sorunları hedefli düzelt
 * 3. Evaluator (tekrar) → yeni skor hesapla
 * 4. GATE: afterScore >= beforeScore? → Geç / Retry (max 2)
 * 5. Diffs oluştur → Kullanıcıya sun
 *
 * PRENSIP: Skor ASLA düşmez. Düşerse optimizer reddedilir.
 */

import { calculateSEOScore } from "@/lib/seo-calculator";
import {
  SEOEvaluatorAgent,
  type ArticleData,
  type EvaluatorReport,
} from "@/agents/seo/seo-evaluator.agent";
import {
  SEOOptimizerAgent,
  type OptimizedField,
  type OptimizationResult,
} from "@/agents/seo/seo-optimizer.agent";

// ─── Types ───────────────────────────────────────────────

export interface SEODiff {
  field: string;
  label: string;
  before: string;
  after: string;
  type: "text" | "content" | "info" | "keywords";
  improvements?: string[];
  guardrailPassed?: boolean;
  guardrailNote?: string;
}

export interface PipelineResult {
  success: boolean;
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  diffs: SEODiff[];
  retries: number;
  validationPassed: boolean;
  evaluatorReport: EvaluatorReport;
  skippedFields: string[];
  failedFields: { field: string; reason: string }[];
  message: string;
}

// ─── Field Label Mapping ─────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  title: "Başlık",
  metaDescription: "Meta Açıklama",
  slug: "URL Slug",
  content: "İçerik",
  keywords: "Anahtar Kelimeler",
  excerpt: "Özet",
  image: "Görsel",
};

const FIELD_DIFF_TYPE: Record<string, SEODiff["type"]> = {
  title: "text",
  metaDescription: "text",
  slug: "text",
  content: "content",
  keywords: "keywords",
  excerpt: "text",
};

// ─── Pipeline ────────────────────────────────────────────

export class SEOPipelineService {
  private evaluator = new SEOEvaluatorAgent();
  private optimizer = new SEOOptimizerAgent();
  private maxRetries = 2;

  /**
   * Full SEO pipeline çalıştır
   */
  async run(article: ArticleData): Promise<PipelineResult> {
    // ─── STEP 1: İlk değerlendirme ───
    const beforeReport = this.evaluator.evaluate(article);

    // Sorun yoksa düzeltmeye gerek yok — sessizce dön (log spam önle)
    if (beforeReport.issues.length === 0) {
      return {
        success: true,
        beforeScore: beforeReport.score,
        afterScore: beforeReport.score,
        scoreDelta: 0,
        diffs: [],
        retries: 0,
        validationPassed: true,
        evaluatorReport: beforeReport,
        skippedFields: [],
        failedFields: [],
        message: `SEO skoru zaten ${beforeReport.score}/100. Düzeltilecek sorun bulunamadı.`,
      };
    }

    // ─── STEP 2: Optimize et (retry loop ile) ───
    console.log(
      `[SEO Pipeline] Başlatılıyor: skor ${beforeReport.score}/100, ${beforeReport.issues.length} sorun`,
    );
    let bestResult: OptimizationResult | null = null;
    let bestAfterScore = 0;
    let retries = 0;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      console.log(
        `[SEO Pipeline] Optimizasyon denemesi ${attempt + 1}/${this.maxRetries + 1}`,
      );

      // Optimize et
      const optimResult = await this.optimizer.optimize(
        article,
        beforeReport.issues,
      );

      // Guardrail geçemeyen alanları filtrele
      const validFields = optimResult.optimizedFields.filter(
        (f) => f.guardrailPassed,
      );
      const failedGuardrails = optimResult.optimizedFields.filter(
        (f) => !f.guardrailPassed,
      );

      // Debug: hangi alanlar guardrail geçti/kaldı
      if (failedGuardrails.length > 0) {
        console.log(
          `[SEO Pipeline] Guardrail FAIL: ${failedGuardrails.map((f) => `${f.field}(${f.guardrailNote || "?"})`).join(", ")}`,
        );
      }
      if (validFields.length > 0) {
        console.log(
          `[SEO Pipeline] Guardrail OK: ${validFields.map((f) => f.field).join(", ")}`,
        );
      }

      if (validFields.length === 0) {
        console.log(
          `[SEO Pipeline] ⚠️ Hiçbir alan guardrail'i geçemedi (deneme ${attempt + 1}/${this.maxRetries + 1}), yeniden deniyor...`,
        );
        retries++;
        continue;
      }

      // Simüle edilmiş makaleyi oluştur (optimize alanlarla)
      const simulatedArticle = this.applyOptimizations(article, validFields);

      // ─── STEP 3: Re-evaluate ───
      const afterReport = this.evaluator.evaluate(simulatedArticle);
      console.log(
        `[SEO Pipeline] Yeni skor: ${afterReport.score}/100 (önceki: ${beforeReport.score})`,
      );

      // ─── STEP 4: Validation Gate ───
      if (afterReport.score >= beforeReport.score) {
        bestResult = { ...optimResult, optimizedFields: validFields };
        bestAfterScore = afterReport.score;
        console.log(
          `[SEO Pipeline] ✅ Validasyon geçti! ${beforeReport.score} → ${afterReport.score}`,
        );
        break;
      }

      console.log(
        `[SEO Pipeline] ❌ Skor düştü (${beforeReport.score} → ${afterReport.score}), retry ${attempt + 1}`,
      );
      retries++;
    }

    // Pipeline başarısız — hiçbir denemede skor artmadı
    if (!bestResult) {
      return {
        success: false,
        beforeScore: beforeReport.score,
        afterScore: beforeReport.score,
        scoreDelta: 0,
        diffs: [],
        retries,
        validationPassed: false,
        evaluatorReport: beforeReport,
        skippedFields: [],
        failedFields: [
          {
            field: "pipeline",
            reason: `${this.maxRetries + 1} denemede de skor iyileştirilemedi`,
          },
        ],
        message: `Optimizasyon ${this.maxRetries + 1} denemede başarısız oldu. Skor düşmemesi için değişiklikler uygulanmadı.`,
      };
    }

    // ─── STEP 5: Diff oluştur ───
    const diffs = this.buildDiffs(
      article,
      bestResult,
      beforeReport.score,
      bestAfterScore,
    );

    return {
      success: true,
      beforeScore: beforeReport.score,
      afterScore: bestAfterScore,
      scoreDelta: bestAfterScore - beforeReport.score,
      diffs,
      retries,
      validationPassed: true,
      evaluatorReport: beforeReport,
      skippedFields: bestResult.skippedFields,
      failedFields: bestResult.failedFields,
      message: `SEO skoru ${beforeReport.score} → ${bestAfterScore} (+${bestAfterScore - beforeReport.score}) olarak iyileştirildi.`,
    };
  }

  // ─── Helpers ───

  /**
   * Optimizasyonları makaleye uygula (simülasyon)
   */
  private applyOptimizations(
    article: ArticleData,
    optimizedFields: OptimizedField[],
  ): ArticleData {
    const result = { ...article };

    for (const field of optimizedFields) {
      switch (field.field) {
        case "title":
          result.title = field.after;
          break;
        case "metaDescription":
          result.metaDescription = field.after;
          break;
        case "slug":
          result.slug = field.after;
          break;
        case "content":
          result.content = field.after;
          break;
        case "keywords":
          result.keywords = field.after
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean);
          break;
        case "excerpt":
          result.excerpt = field.after;
          break;
      }
    }

    return result;
  }

  /**
   * Kullanıcıya sunulacak diff listesi oluştur
   */
  private buildDiffs(
    article: ArticleData,
    result: OptimizationResult,
    beforeScore: number,
    afterScore: number,
  ): SEODiff[] {
    const diffs: SEODiff[] = [];

    // Skor bilgisi diff'i (ilk sırada)
    diffs.push({
      field: "seoScore",
      label: "SEO Skoru",
      before: `${beforeScore}/100`,
      after: `${afterScore}/100 (+${afterScore - beforeScore})`,
      type: "info",
      improvements: [
        `SEO skoru ${beforeScore}'den ${afterScore}'e yükseltildi`,
      ],
    });

    // Her optimize edilen alan için diff
    for (const field of result.optimizedFields) {
      // Before ve after aynıysa diff ekleme
      if (field.before === field.after) continue;

      diffs.push({
        field: field.field,
        label: FIELD_LABELS[field.field] || field.field,
        before: field.before,
        after: field.after,
        type: FIELD_DIFF_TYPE[field.field] || "text",
        improvements: field.improvements,
        guardrailPassed: field.guardrailPassed,
        guardrailNote: field.guardrailNote,
      });
    }

    return diffs;
  }

  /**
   * Onaylanan diff'leri makaleye uygula (DB update için veri hazırla)
   */
  buildUpdateData(
    diffs: SEODiff[],
    selectedFields: string[],
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};

    for (const diff of diffs) {
      if (diff.field === "seoScore") continue; // Skor diff'i alan değil
      if (!selectedFields.includes(diff.field)) continue;

      if (diff.field === "keywords") {
        updateData.keywords = diff.after
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
      } else {
        updateData[diff.field] = diff.after;
      }
    }

    return updateData;
  }
}
