/**
 * SEO Evaluator Agent — %100 Deterministik Skorlama
 *
 * PRENSIP: LLM ASLA skor vermez. Skor her zaman calculateSEOScore'dan gelir.
 * LLM sadece kalitatif analiz yapar (opsiyonel, skor etkilemez).
 *
 * SORUMLULUKLAR:
 * 1. Deterministik SEO skoru hesapla (tek kaynak: calculateSEOScore)
 * 2. Spesifik, actionable sorunları listele
 * 3. Her soruna "nasıl düzeltilir" talimatı ekle
 * 4. Optimizer'a hedef vermek için kullanılır
 */

import { calculateSEOScore } from "@/lib/seo-calculator";

// ─── Types ───────────────────────────────────────────────

export interface SEOIssueDetail {
  field:
    | "title"
    | "metaDescription"
    | "slug"
    | "content"
    | "image"
    | "keywords"
    | "excerpt";
  severity: "critical" | "high" | "medium" | "low";
  problem: string;
  currentValue: string;
  constraint: string; // "30-60 karakter" gibi
  fixInstruction: string; // Optimizer'a verilecek spesifik talimat
  potentialGain: number; // Bu sorun düzeltilirse kazanılacak puan
}

export interface EvaluatorReport {
  score: number;
  maxPossible: number; // 100
  issues: SEOIssueDetail[];
  totalPotentialGain: number;
  summary: string;
  fieldScores: {
    title: { score: number; max: number; status: "ok" | "warn" | "fail" };
    metaDescription: {
      score: number;
      max: number;
      status: "ok" | "warn" | "fail";
    };
    slug: { score: number; max: number; status: "ok" | "warn" | "fail" };
    content: { score: number; max: number; status: "ok" | "warn" | "fail" };
    image: { score: number; max: number; status: "ok" | "warn" | "fail" };
    keywords: { score: number; max: number; status: "ok" | "warn" | "fail" };
    excerpt: { score: number; max: number; status: "ok" | "warn" | "fail" };
  };
}

export interface ArticleData {
  title: string;
  content: string;
  excerpt: string | null;
  metaDescription: string | null;
  slug: string;
  keywords: string[] | null;
  imageUrl: string | null;
}

// ─── Evaluator ───────────────────────────────────────────

export class SEOEvaluatorAgent {
  /**
   * Makaleyi değerlendir — %100 deterministik
   */
  evaluate(article: ArticleData): EvaluatorReport {
    const issues: SEOIssueDetail[] = [];

    // Deterministik skor hesapla
    const seoResult = calculateSEOScore({
      title: article.title,
      content: article.content,
      excerpt: article.excerpt || "",
      metaDescription: article.metaDescription,
      slug: article.slug,
      keywords: article.keywords,
      imageUrl: article.imageUrl,
    });

    // ─── Title Analizi ───
    const titleStatus = this.evaluateTitle(article.title, issues);

    // ─── Meta Description Analizi ───
    const metaStatus = this.evaluateMetaDescription(
      article.metaDescription,
      issues,
    );

    // ─── Slug Analizi ───
    const slugStatus = this.evaluateSlug(article.slug, issues);

    // ─── Content Analizi ───
    const contentStatus = this.evaluateContent(article.content, issues);

    // ─── Image Analizi ───
    const imageStatus = this.evaluateImage(article.imageUrl, issues);

    // ─── Keywords Analizi ───
    const keywordsStatus = this.evaluateKeywords(article.keywords, issues);

    // ─── Excerpt Analizi ───
    const excerptStatus = this.evaluateExcerpt(article.excerpt, issues);

    // Potansiyel kazancı hesapla
    const totalPotentialGain = issues.reduce(
      (sum, i) => sum + i.potentialGain,
      0,
    );

    // Özet oluştur
    const criticalCount = issues.filter(
      (i) => i.severity === "critical",
    ).length;
    const highCount = issues.filter((i) => i.severity === "high").length;
    const summary = this.generateSummary(
      seoResult.score,
      criticalCount,
      highCount,
      issues.length,
    );

    return {
      score: seoResult.score,
      maxPossible: 100,
      issues,
      totalPotentialGain: Math.min(totalPotentialGain, 100 - seoResult.score),
      summary,
      fieldScores: {
        title: titleStatus,
        metaDescription: metaStatus,
        slug: slugStatus,
        content: contentStatus,
        image: imageStatus,
        keywords: keywordsStatus,
        excerpt: excerptStatus,
      },
    };
  }

  // ─── Field Evaluators ───

  private evaluateTitle(
    title: string | null | undefined,
    issues: SEOIssueDetail[],
  ): { score: number; max: number; status: "ok" | "warn" | "fail" } {
    const max = 25; // Title toplam ağırlık

    if (!title || title.length === 0) {
      issues.push({
        field: "title",
        severity: "critical",
        problem: "Başlık boş",
        currentValue: "(boş)",
        constraint: "30-60 karakter arası",
        fixInstruction:
          "30-60 karakter arası, ana anahtar kelime ilk 5 kelimede olacak şekilde bir başlık oluştur",
        potentialGain: 20,
      });
      return { score: 0, max, status: "fail" };
    }

    if (title.length < 30) {
      issues.push({
        field: "title",
        severity: "medium",
        problem: `Başlık çok kısa (${title.length} karakter)`,
        currentValue: title,
        constraint: "30-60 karakter arası",
        fixInstruction: `Başlığı 30-60 karakter arasına uzat. Mevcut: "${title}" (${title.length} char). İçerik tonunu koru, gereksiz kelime ekleme.`,
        potentialGain: 5,
      });
      return { score: max - 5, max, status: "warn" };
    }

    if (title.length > 60) {
      issues.push({
        field: "title",
        severity: "medium",
        problem: `Başlık çok uzun (${title.length} karakter)`,
        currentValue: title,
        constraint: "30-60 karakter arası",
        fixInstruction: `Başlığı 60 karakterin altına kısalt. Mevcut: "${title}" (${title.length} char). Ana mesajı ve anahtar kelimeyi koru, gereksiz kelimeleri çıkar.`,
        potentialGain: 5,
      });
      return { score: max - 5, max, status: "warn" };
    }

    return { score: max, max, status: "ok" };
  }

  private evaluateMetaDescription(
    meta: string | null | undefined,
    issues: SEOIssueDetail[],
  ): { score: number; max: number; status: "ok" | "warn" | "fail" } {
    const max = 20;

    if (!meta || meta.length === 0) {
      issues.push({
        field: "metaDescription",
        severity: "high",
        problem: "Meta açıklama eksik",
        currentValue: "(boş)",
        constraint: "120-160 karakter arası",
        fixInstruction:
          "120-160 karakter arası, makaleyi özetleyen, CTA içeren bir meta açıklama oluştur. Ana anahtar kelimeyi doğal şekilde entegre et.",
        potentialGain: 15,
      });
      return { score: 0, max, status: "fail" };
    }

    if (meta.length < 120) {
      issues.push({
        field: "metaDescription",
        severity: "medium",
        problem: `Meta açıklama kısa (${meta.length} karakter)`,
        currentValue: meta,
        constraint: "120-160 karakter arası",
        fixInstruction: `Meta açıklamayı 120-160 karakter arasına uzat. Mevcut: "${meta}" (${meta.length} char). Makaleyi özetle, CTA ekle.`,
        potentialGain: 5,
      });
      return { score: max - 5, max, status: "warn" };
    }

    if (meta.length > 160) {
      issues.push({
        field: "metaDescription",
        severity: "medium",
        problem: `Meta açıklama uzun (${meta.length} karakter)`,
        currentValue: meta,
        constraint: "120-160 karakter arası",
        fixInstruction: `Meta açıklamayı 160 karakterin altına kısalt. Mevcut: "${meta}" (${meta.length} char). Ana mesajı koru.`,
        potentialGain: 5,
      });
      return { score: max - 5, max, status: "warn" };
    }

    return { score: max, max, status: "ok" };
  }

  private evaluateSlug(
    slug: string | null | undefined,
    issues: SEOIssueDetail[],
  ): { score: number; max: number; status: "ok" | "warn" | "fail" } {
    const max = 13;

    if (!slug || slug.length === 0) {
      issues.push({
        field: "slug",
        severity: "high",
        problem: "Slug eksik",
        currentValue: "(boş)",
        constraint: "max 75 karakter, sadece a-z 0-9 ve tire",
        fixInstruction:
          "Başlıktan SEO-friendly slug oluştur. Küçük harf, tire ile ayrılmış, max 75 karakter, Türkçe karakter yok.",
        potentialGain: 10,
      });
      return { score: 0, max, status: "fail" };
    }

    let lost = 0;

    if (slug.length > 75) {
      issues.push({
        field: "slug",
        severity: "low",
        problem: `Slug uzun (${slug.length} karakter)`,
        currentValue: slug,
        constraint: "max 75 karakter",
        fixInstruction: `Slug'ı 75 karakterin altına kısalt. Mevcut: "${slug}" (${slug.length} char). Ana anahtar kelimeleri koru, gereksiz kelimeleri çıkar.`,
        potentialGain: 3,
      });
      lost += 3;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      issues.push({
        field: "slug",
        severity: "medium",
        problem: "Slug geçersiz karakterler içeriyor",
        currentValue: slug,
        constraint: "sadece a-z, 0-9 ve tire (-)",
        fixInstruction: `Slug'daki geçersiz karakterleri düzelt. Türkçe karakterleri çevir (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u). Mevcut: "${slug}"`,
        potentialGain: 5,
      });
      lost += 5;
    }

    return {
      score: Math.max(0, max - lost),
      max,
      status: lost > 0 ? "warn" : "ok",
    };
  }

  private evaluateContent(
    content: string | null | undefined,
    issues: SEOIssueDetail[],
  ): { score: number; max: number; status: "ok" | "warn" | "fail" } {
    const max = 33;

    if (!content || content.length === 0) {
      issues.push({
        field: "content",
        severity: "critical",
        problem: "İçerik boş",
        currentValue: "(boş)",
        constraint: "Min 300 kelime, H1/H2 başlıklar, linkler",
        fixInstruction:
          "Makale içeriği oluştur. En az 300 kelime, H2 başlıklar ekle, ilgili makalelere linkler ekle.",
        potentialGain: 25,
      });
      return { score: 0, max, status: "fail" };
    }

    let lost = 0;
    const wordCount = content
      .replace(/<[^>]*>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
    const h1Count = (content.match(/<h1/gi) || []).length;
    const h2Count = (content.match(/<h2/gi) || []).length;
    const linkCount = (content.match(/<a /gi) || []).length;

    if (wordCount < 300) {
      issues.push({
        field: "content",
        severity: "high",
        problem: `İçerik kısa (${wordCount} kelime)`,
        currentValue: `${wordCount} kelime`,
        constraint: "Min 300 kelime",
        fixInstruction: `İçeriği en az 300 kelimeye uzat. Mevcut: ${wordCount} kelime. Mevcut içeriğin tonunu ve stilini koru, ilgili detaylar ekle.`,
        potentialGain: 10,
      });
      lost += 10;
    }

    if (h1Count === 0) {
      issues.push({
        field: "content",
        severity: "medium",
        problem: "H1 başlık yok",
        currentValue: "0 H1",
        constraint: "Tam 1 adet H1",
        fixInstruction:
          "İçeriğe uygun bir H1 başlık ekle. Makale başlığını H1 olarak kullan.",
        potentialGain: 5,
      });
      lost += 5;
    } else if (h1Count > 1) {
      issues.push({
        field: "content",
        severity: "low",
        problem: `Çoklu H1 başlık (${h1Count} adet)`,
        currentValue: `${h1Count} H1`,
        constraint: "Tam 1 adet H1",
        fixInstruction:
          "Fazladan H1 başlıkları H2'ye çevir. Sadece 1 H1 kalsın.",
        potentialGain: 3,
      });
      lost += 3;
    }

    if (h2Count === 0 && wordCount > 300) {
      issues.push({
        field: "content",
        severity: "medium",
        problem: "H2 alt başlık yok",
        currentValue: "0 H2",
        constraint: "En az 2-3 H2 başlık",
        fixInstruction:
          "İçeriğe en az 2-3 adet H2 alt başlık ekle. İçeriğin mevcut bölümlerine uygun başlıklar seç.",
        potentialGain: 5,
      });
      lost += 5;
    }

    if (linkCount === 0 && wordCount > 500) {
      issues.push({
        field: "content",
        severity: "low",
        problem: "İçerikte link yok",
        currentValue: "0 link",
        constraint: "En az 2-3 dahili link",
        fixInstruction:
          "İçeriğe 2-3 adet ilgili makaleye dahili link ekle. Doğal anchor text kullan.",
        potentialGain: 3,
      });
      lost += 3;
    }

    const status = lost >= 15 ? "fail" : lost > 0 ? "warn" : "ok";
    return { score: Math.max(0, max - lost), max, status };
  }

  private evaluateImage(
    imageUrl: string | null | undefined,
    issues: SEOIssueDetail[],
  ): { score: number; max: number; status: "ok" | "warn" | "fail" } {
    const max = 10;

    if (!imageUrl || imageUrl === "/logos/og-image.png" || imageUrl === "") {
      issues.push({
        field: "image",
        severity: "high",
        problem: "Öne çıkan görsel eksik veya varsayılan",
        currentValue: imageUrl || "(yok)",
        constraint: "Makaleye uygun orijinal görsel",
        fixInstruction:
          "Bu alan otomatik düzeltilemez. Manuel olarak görsel ekleyin.",
        potentialGain: 10,
      });
      return { score: 0, max, status: "fail" };
    }

    return { score: max, max, status: "ok" };
  }

  private evaluateKeywords(
    keywords: string[] | null | undefined,
    issues: SEOIssueDetail[],
  ): { score: number; max: number; status: "ok" | "warn" | "fail" } {
    const max = 5;

    if (!keywords || keywords.length === 0) {
      issues.push({
        field: "keywords",
        severity: "low",
        problem: "Anahtar kelimeler eksik",
        currentValue: "(boş)",
        constraint: "3-8 anahtar kelime",
        fixInstruction:
          "Makale içeriğinden 3-8 adet anahtar kelime çıkar. Ana konu, alt konular ve ilgili terimler dahil et.",
        potentialGain: 5,
      });
      return { score: 0, max, status: "fail" };
    }

    return { score: max, max, status: "ok" };
  }

  private evaluateExcerpt(
    excerpt: string | null | undefined,
    issues: SEOIssueDetail[],
  ): { score: number; max: number; status: "ok" | "warn" | "fail" } {
    const max = 5;

    if (!excerpt || excerpt.length === 0) {
      issues.push({
        field: "excerpt",
        severity: "low",
        problem: "Makale özeti eksik",
        currentValue: "(boş)",
        constraint: "50-200 karakter arası özet",
        fixInstruction:
          "Makaleyi 50-200 karakter arası özetle. Ana mesajı ve anahtar kelimeyi dahil et.",
        potentialGain: 5,
      });
      return { score: 0, max, status: "fail" };
    }

    return { score: max, max, status: "ok" };
  }

  // ─── Summary ───

  private generateSummary(
    score: number,
    criticalCount: number,
    highCount: number,
    totalIssues: number,
  ): string {
    if (score >= 90) {
      return `Mükemmel SEO skoru (${score}/100). ${totalIssues === 0 ? "Sorun yok." : `${totalIssues} küçük iyileştirme fırsatı var.`}`;
    }
    if (score >= 75) {
      return `İyi SEO skoru (${score}/100). ${totalIssues} sorun düzeltilirse skor artırılabilir.`;
    }
    if (score >= 50) {
      return `Orta SEO skoru (${score}/100). ${criticalCount > 0 ? `${criticalCount} kritik sorun` : ""}${criticalCount > 0 && highCount > 0 ? " ve " : ""}${highCount > 0 ? `${highCount} önemli sorun` : ""} düzeltilmeli.`;
    }
    return `Düşük SEO skoru (${score}/100). ${criticalCount + highCount} ciddi sorun acil düzeltilmeli.`;
  }
}
