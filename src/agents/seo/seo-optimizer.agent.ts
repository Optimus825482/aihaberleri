/**
 * SEO Optimizer Agent — Hedefli, Guardrail'li Optimizasyon
 *
 * PRENSIP: LLM sadece METİN YAZAR, asla skor vermez.
 * Evaluator'ın bulduğu spesifik sorunları hedefli düzeltir.
 * Her çıktı guardrail'lerle validasyondan geçer.
 *
 * SORUMLULUKLAR:
 * 1. Evaluator'ın sorun listesine göre hedefli düzeltmeler yap
 * 2. Guardrail'lerle çıktıyı doğrula (karakter limitleri, format)
 * 3. Orijinal içeriğin tonunu ve stilini koru
 * 4. Sadece sorunlu alanları optimize et, çalışan alanlara dokunma
 */

import { callDeepSeek, type DeepSeekMessage } from "@/lib/deepseek";
import type { ArticleData, SEOIssueDetail } from "./seo-evaluator.agent";

// ─── Types ───────────────────────────────────────────────

export interface OptimizedField {
  field: string;
  before: string;
  after: string;
  improvements: string[];
  guardrailPassed: boolean;
  guardrailNote?: string;
}

export interface OptimizationResult {
  optimizedFields: OptimizedField[];
  skippedFields: string[];
  failedFields: { field: string; reason: string }[];
}

// ─── Guardrails ──────────────────────────────────────────

const GUARDRAILS = {
  title: { min: 30, max: 60 },
  metaDescription: { min: 120, max: 160 },
  slug: { max: 75, pattern: /^[a-z0-9-]+$/ },
  excerpt: { min: 30, max: 200 },
  keywords: { min: 3, max: 8 },
} as const;

// ─── Optimizer ───────────────────────────────────────────

export class SEOOptimizerAgent {
  private temperature = 0.3; // Düşük: kontrollü, tutarlı çıktı
  private maxRetries = 2;

  /**
   * Evaluator'ın sorun listesine göre makaleyi optimize et
   */
  async optimize(
    article: ArticleData,
    issues: SEOIssueDetail[],
  ): Promise<OptimizationResult> {
    const optimizedFields: OptimizedField[] = [];
    const skippedFields: string[] = [];
    const failedFields: { field: string; reason: string }[] = [];

    // Otomatik düzeltilemeyecek sorunları filtrele
    const fixableIssues = issues.filter(
      (i) => i.field !== "image", // Görsel otomatik eklenemiyor
    );

    if (fixableIssues.length === 0) {
      return {
        optimizedFields: [],
        skippedFields: ["Sorun yok"],
        failedFields: [],
      };
    }

    // Alan bazında grupla
    const issuesByField = new Map<string, SEOIssueDetail[]>();
    for (const issue of fixableIssues) {
      const existing = issuesByField.get(issue.field) || [];
      existing.push(issue);
      issuesByField.set(issue.field, existing);
    }

    // Her alanı ayrı optimize et (hepsini birden yapmak yerine)
    for (const [field, fieldIssues] of issuesByField) {
      try {
        const result = await this.optimizeField(article, field, fieldIssues);
        if (result) {
          optimizedFields.push(result);
        } else {
          skippedFields.push(field);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[SEO Optimizer] ${field} optimizasyonu başarısız:`, msg);
        failedFields.push({ field, reason: msg });
      }
    }

    return { optimizedFields, skippedFields, failedFields };
  }

  // ─── Field-specific Optimizers ───

  private async optimizeField(
    article: ArticleData,
    field: string,
    issues: SEOIssueDetail[],
  ): Promise<OptimizedField | null> {
    switch (field) {
      case "title":
        return this.optimizeTitle(article, issues);
      case "metaDescription":
        return this.optimizeMetaDescription(article, issues);
      case "slug":
        return this.optimizeSlug(article, issues);
      case "content":
        return this.optimizeContent(article, issues);
      case "keywords":
        return this.optimizeKeywords(article, issues);
      case "excerpt":
        return this.optimizeExcerpt(article, issues);
      default:
        return null;
    }
  }

  private async optimizeTitle(
    article: ArticleData,
    issues: SEOIssueDetail[],
  ): Promise<OptimizedField> {
    const instructions = issues.map((i) => i.fixInstruction).join("\n");

    const messages: DeepSeekMessage[] = [
      {
        role: "system",
        content: `Sen bir SEO başlık uzmanısın. Makale başlıklarını optimize edersin.

KATIL KURALLAR:
- Çıktı SADECE optimize edilmiş başlık olacak (tırnak işareti, açıklama, başka hiçbir şey yok)
- Başlık ${GUARDRAILS.title.min}-${GUARDRAILS.title.max} karakter arasında OLMALI
- Orijinal başlığın dilini, tonunu ve ana mesajını koru
- Clickbait yapma, doğal ol
- "(2026)" veya gereksiz yıl/tarih ekleme
- Keyword stuffing yapma`,
      },
      {
        role: "user",
        content: `Mevcut başlık: "${article.title}" (${article.title.length} karakter)

SORUNLAR:
${instructions}

Makale içeriğinin ilk 500 karakteri:
${article.content.replace(/<[^>]*>/g, "").substring(0, 500)}

Sadece optimize edilmiş başlığı yaz, başka hiçbir şey yazma:`,
      },
    ];

    const optimized = await this.callLLMWithRetry(messages);
    const cleaned = this.cleanLLMOutput(optimized);

    // Guardrail kontrolü
    const { passed, note } = this.validateTitle(cleaned);

    return {
      field: "title",
      before: article.title,
      after: cleaned,
      improvements: issues.map((i) => i.problem),
      guardrailPassed: passed,
      guardrailNote: note,
    };
  }

  private async optimizeMetaDescription(
    article: ArticleData,
    issues: SEOIssueDetail[],
  ): Promise<OptimizedField> {
    const instructions = issues.map((i) => i.fixInstruction).join("\n");

    const messages: DeepSeekMessage[] = [
      {
        role: "system",
        content: `Sen bir SEO meta description uzmanısın.

KATIL KURALLAR:
- Çıktı SADECE optimize edilmiş meta açıklama olacak
- Meta açıklama ${GUARDRAILS.metaDescription.min}-${GUARDRAILS.metaDescription.max} karakter arasında OLMALI
- Orijinal içeriğin dilini koru (Türkçe makale = Türkçe meta, İngilizce = İngilizce)
- Makaleyi doğru özetle, CTA ekle
- Keyword stuffing yapma, doğal ol`,
      },
      {
        role: "user",
        content: `Makale başlığı: "${article.title}"
Mevcut meta: "${article.metaDescription || "(boş)"}" (${(article.metaDescription || "").length} karakter)

SORUNLAR:
${instructions}

Makale içeriğinin ilk 800 karakteri:
${article.content.replace(/<[^>]*>/g, "").substring(0, 800)}

Sadece optimize edilmiş meta açıklamayı yaz:`,
      },
    ];

    const optimized = await this.callLLMWithRetry(messages);
    const cleaned = this.cleanLLMOutput(optimized);

    const { passed, note } = this.validateMetaDescription(cleaned);

    return {
      field: "metaDescription",
      before: article.metaDescription || "",
      after: cleaned,
      improvements: issues.map((i) => i.problem),
      guardrailPassed: passed,
      guardrailNote: note,
    };
  }

  private async optimizeSlug(
    article: ArticleData,
    issues: SEOIssueDetail[],
  ): Promise<OptimizedField> {
    const messages: DeepSeekMessage[] = [
      {
        role: "system",
        content: `Sen bir SEO slug uzmanısın.

KATIL KURALLAR:
- Çıktı SADECE optimize edilmiş slug olacak
- Slug max ${GUARDRAILS.slug.max} karakter
- Sadece küçük harf a-z, rakam 0-9 ve tire (-) kullan
- Türkçe karakterleri çevir: ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u
- Ana anahtar kelimeleri koru
- Gereksiz kelimeleri (ve, ile, bir, bu, da, de) çıkar`,
      },
      {
        role: "user",
        content: `Başlık: "${article.title}"
Mevcut slug: "${article.slug}" (${article.slug.length} karakter)

Sadece optimize edilmiş slug'ı yaz:`,
      },
    ];

    const optimized = await this.callLLMWithRetry(messages);
    let cleaned = this.cleanLLMOutput(optimized)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Max 75 karakter
    if (cleaned.length > GUARDRAILS.slug.max) {
      cleaned = cleaned.substring(0, GUARDRAILS.slug.max).replace(/-$/, "");
    }

    const passed =
      GUARDRAILS.slug.pattern.test(cleaned) &&
      cleaned.length <= GUARDRAILS.slug.max;

    return {
      field: "slug",
      before: article.slug,
      after: cleaned,
      improvements: issues.map((i) => i.problem),
      guardrailPassed: passed,
    };
  }

  private async optimizeContent(
    article: ArticleData,
    issues: SEOIssueDetail[],
  ): Promise<OptimizedField> {
    // İçerik optimizasyonu: SADECE yapısal sorunları düzelt (H2 ekle, link ekle)
    // İçeriğin kendisini ASLA baştan yazma
    const instructions = issues.map((i) => `- ${i.fixInstruction}`).join("\n");

    const messages: DeepSeekMessage[] = [
      {
        role: "system",
        content: `Sen bir SEO içerik yapı uzmanısın. İçeriğin yapısını iyileştirirsin.

KRİTİK KURALLAR:
- Mevcut içeriğin METNİNİ, TONUNU, STİLİNİ DEĞİŞTİRME
- Sadece YAPISAL düzeltmeler yap (H2 başlıklar ekle, paragraf yapısı iyileştir)
- Orijinal cümleleri yeniden yazma
- İçeriğe yeni paragraf ekleyeceksen orijinal stilde yaz
- Keyword stuffing yapma
- Çıktı olarak SADECE düzeltilmiş HTML içerik ver, açıklama yazma
- Fazladan H1 varsa H2'ye çevir, H1 sayısını 1'de tut`,
      },
      {
        role: "user",
        content: `Makale başlığı: "${article.title}"

DÜZELTME GEREKENler:
${instructions}

Mevcut içerik:
${article.content}

Yapısal düzeltmeleri uygulayarak içeriği ver. Sadece HTML içerik, başka açıklama yok:`,
      },
    ];

    const optimized = await this.callLLMWithRetry(messages);

    // İçerik çok kısaldıysa reddet
    const originalWordCount = article.content
      .replace(/<[^>]*>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
    const newWordCount = optimized
      .replace(/<[^>]*>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
    const contentShrunk = newWordCount < originalWordCount * 0.8;

    return {
      field: "content",
      before: article.content,
      after: optimized,
      improvements: issues.map((i) => i.problem),
      guardrailPassed: !contentShrunk,
      guardrailNote: contentShrunk
        ? `İçerik %${Math.round((1 - newWordCount / originalWordCount) * 100)} küçüldü, reddedildi`
        : undefined,
    };
  }

  private async optimizeKeywords(
    article: ArticleData,
    issues: SEOIssueDetail[],
  ): Promise<OptimizedField> {
    const messages: DeepSeekMessage[] = [
      {
        role: "system",
        content: `Sen bir SEO anahtar kelime uzmanısın.

KURALLAR:
- ${GUARDRAILS.keywords.min}-${GUARDRAILS.keywords.max} adet anahtar kelime üret
- Makale içeriğinden türet
- Her kelimeyi yeni satıra yaz
- Sadece anahtar kelimeleri yaz, açıklama ekleme
- Anahtar kelimeler makalenin dilinde olsun`,
      },
      {
        role: "user",
        content: `Başlık: "${article.title}"

İçerik özeti:
${article.content.replace(/<[^>]*>/g, "").substring(0, 1000)}

Anahtar kelimeleri listele (her satıra 1 tane):`,
      },
    ];

    const optimized = await this.callLLMWithRetry(messages);
    const keywords = optimized
      .split("\n")
      .map((k) => k.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((k) => k.length > 0 && k.length < 50)
      .slice(0, GUARDRAILS.keywords.max);

    const passed = keywords.length >= GUARDRAILS.keywords.min;

    return {
      field: "keywords",
      before: (article.keywords || []).join(", "),
      after: keywords.join(", "),
      improvements: issues.map((i) => i.problem),
      guardrailPassed: passed,
      guardrailNote: !passed
        ? `Sadece ${keywords.length} anahtar kelime üretildi, min ${GUARDRAILS.keywords.min}`
        : undefined,
    };
  }

  private async optimizeExcerpt(
    article: ArticleData,
    issues: SEOIssueDetail[],
  ): Promise<OptimizedField> {
    const messages: DeepSeekMessage[] = [
      {
        role: "system",
        content: `Sen bir SEO makale özeti uzmanısın.

KURALLAR:
- ${GUARDRAILS.excerpt.min}-${GUARDRAILS.excerpt.max} karakter arası özet yaz
- Makaleyi kısaca özetle
- Makalenin dilinde yaz
- Sadece özeti yaz, başka hiçbir şey yazma`,
      },
      {
        role: "user",
        content: `Başlık: "${article.title}"

İçerik:
${article.content.replace(/<[^>]*>/g, "").substring(0, 1000)}

Sadece özeti yaz:`,
      },
    ];

    const optimized = await this.callLLMWithRetry(messages);
    const cleaned = this.cleanLLMOutput(optimized);

    const passed =
      cleaned.length >= GUARDRAILS.excerpt.min &&
      cleaned.length <= GUARDRAILS.excerpt.max;

    return {
      field: "excerpt",
      before: article.excerpt || "",
      after: cleaned,
      improvements: issues.map((i) => i.problem),
      guardrailPassed: passed,
      guardrailNote: !passed
        ? `Excerpt ${cleaned.length} karakter (hedef: ${GUARDRAILS.excerpt.min}-${GUARDRAILS.excerpt.max})`
        : undefined,
    };
  }

  // ─── Validation ───

  private validateTitle(title: string): { passed: boolean; note?: string } {
    if (title.length < GUARDRAILS.title.min) {
      return {
        passed: false,
        note: `Başlık çok kısa: ${title.length} karakter (min ${GUARDRAILS.title.min})`,
      };
    }
    if (title.length > GUARDRAILS.title.max) {
      return {
        passed: false,
        note: `Başlık çok uzun: ${title.length} karakter (max ${GUARDRAILS.title.max})`,
      };
    }
    return { passed: true };
  }

  private validateMetaDescription(meta: string): {
    passed: boolean;
    note?: string;
  } {
    if (meta.length < GUARDRAILS.metaDescription.min) {
      return {
        passed: false,
        note: `Meta kısa: ${meta.length} karakter (min ${GUARDRAILS.metaDescription.min})`,
      };
    }
    if (meta.length > GUARDRAILS.metaDescription.max) {
      return {
        passed: false,
        note: `Meta uzun: ${meta.length} karakter (max ${GUARDRAILS.metaDescription.max})`,
      };
    }
    return { passed: true };
  }

  // ─── Helpers ───

  private async callLLMWithRetry(messages: DeepSeekMessage[]): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await callDeepSeek(messages, {
          temperature: this.temperature,
          maxTokens: 4096,
        });
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `[SEO Optimizer] LLM çağrısı başarısız (deneme ${attempt + 1}/${this.maxRetries + 1}):`,
          lastError.message,
        );

        if (attempt < this.maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1)),
          );
        }
      }
    }

    throw lastError || new Error("LLM çağrısı başarısız");
  }

  private cleanLLMOutput(output: string): string {
    return output
      .replace(/^["'`]+|["'`]+$/g, "") // Tırnak ve backtick temizle
      .replace(
        /^(Here|İşte|Optimize|Düzeltilmiş|Output|Result).*?[:：]\s*/i,
        "",
      ) // Açıklama prefix temizle
      .trim();
  }
}
