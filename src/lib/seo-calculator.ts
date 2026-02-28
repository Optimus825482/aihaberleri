interface SEOInput {
  title: string;
  content: string;
  excerpt: string | null;
  slug: string;
  imageUrl: string | null;
  metaDescription: string | null;
  keywords: string[] | null; // Changed from metaKeywords to keywords (array)
}

interface SEORecommendation {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  suggestion: string;
}

interface SEOResult {
  score: number;
  recommendations: SEORecommendation[];
}

export function calculateSEOScore(input: SEOInput): SEOResult {
  const recommendations: SEORecommendation[] = [];
  let score = 100;

  // Title kontrolü
  if (!input.title || input.title.length === 0) {
    score -= 20;
    recommendations.push({
      type: "Başlık Eksik",
      severity: "critical",
      message: "Makale başlığı boş",
      suggestion: "Açıklayıcı ve SEO dostu bir başlık ekleyin",
    });
  } else {
    if (input.title.length < 30) {
      score -= 5;
      recommendations.push({
        type: "Başlık Kısa",
        severity: "medium",
        message: `Başlık çok kısa (${input.title.length} karakter)`,
        suggestion: "Başlığı 30-60 karakter arasında tutun",
      });
    } else if (input.title.length > 100) {
      score -= 5;
      recommendations.push({
        type: "Başlık Uzun",
        severity: "medium",
        message: `Başlık çok uzun (${input.title.length} karakter)`,
        suggestion: "Başlığı 30-100 karakter arasında tutun",
      });
    }
  }

  // Meta description kontrolü
  if (!input.metaDescription || input.metaDescription.length === 0) {
    score -= 15;
    recommendations.push({
      type: "Meta Açıklama Eksik",
      severity: "high",
      message: "Meta açıklama bulunamadı",
      suggestion: "120-160 karakter arası meta açıklama ekleyin",
    });
  } else {
    if (input.metaDescription.length < 120) {
      score -= 5;
      recommendations.push({
        type: "Meta Açıklama Kısa",
        severity: "medium",
        message: `Meta açıklama kısa (${input.metaDescription.length} karakter)`,
        suggestion: "Meta açıklamayı 120-160 karakter arasında tutun",
      });
    } else if (input.metaDescription.length > 160) {
      score -= 5;
      recommendations.push({
        type: "Meta Açıklama Uzun",
        severity: "medium",
        message: `Meta açıklama uzun (${input.metaDescription.length} karakter)`,
        suggestion: "Meta açıklamayı 120-160 karakter arasında tutun",
      });
    }
  }

  // Slug kontrolü
  if (!input.slug || input.slug.length === 0) {
    score -= 10;
    recommendations.push({
      type: "Slug Eksik",
      severity: "high",
      message: "URL slug bulunamadı",
      suggestion: "SEO dostu bir slug oluşturun",
    });
  } else {
    if (input.slug.length > 75) {
      score -= 3;
      recommendations.push({
        type: "Slug Uzun",
        severity: "low",
        message: `Slug çok uzun (${input.slug.length} karakter)`,
        suggestion: "Slug'ı 75 karakterin altında tutun",
      });
    }
    if (!/^[a-z0-9-]+$/.test(input.slug)) {
      score -= 5;
      recommendations.push({
        type: "Slug Formatı",
        severity: "medium",
        message: "Slug geçersiz karakterler içeriyor",
        suggestion: "Sadece küçük harf, rakam ve tire kullanın",
      });
    }
  }

  // Görsel kontrolü
  if (!input.imageUrl) {
    score -= 10;
    recommendations.push({
      type: "Görsel Eksik",
      severity: "high",
      message: "Öne çıkan görsel bulunamadı",
      suggestion: "Makaleye uygun bir görsel ekleyin",
    });
  }

  // İçerik kontrolü
  if (!input.content || input.content.length === 0) {
    score -= 25;
    recommendations.push({
      type: "İçerik Eksik",
      severity: "critical",
      message: "Makale içeriği boş",
      suggestion: "En az 300 kelimelik içerik ekleyin",
    });
  } else {
    const wordCount = input.content.split(/\s+/).length;
    if (wordCount < 300) {
      score -= 10;
      recommendations.push({
        type: "İçerik Kısa",
        severity: "high",
        message: `İçerik çok kısa (${wordCount} kelime)`,
        suggestion: "En az 300 kelimelik içerik yazın",
      });
    }

    // H1 kontrolü
    const h1Count = (input.content.match(/<h1/gi) || []).length;
    if (h1Count === 0) {
      score -= 5;
      recommendations.push({
        type: "H1 Eksik",
        severity: "medium",
        message: "İçerikte H1 başlığı bulunamadı",
        suggestion: "İçeriğe bir H1 başlığı ekleyin",
      });
    } else if (h1Count > 1) {
      score -= 3;
      recommendations.push({
        type: "Çoklu H1",
        severity: "low",
        message: `İçerikte ${h1Count} adet H1 başlığı var`,
        suggestion: "Sadece bir H1 başlığı kullanın",
      });
    }

    // Alt başlık kontrolü
    const h2Count = (input.content.match(/<h2/gi) || []).length;
    if (h2Count === 0 && wordCount > 300) {
      score -= 5;
      recommendations.push({
        type: "Alt Başlık Eksik",
        severity: "medium",
        message: "İçerikte H2 alt başlıkları bulunamadı",
        suggestion: "İçeriği H2 başlıklarıyla yapılandırın",
      });
    }

    // Link kontrolü
    const linkCount = (input.content.match(/<a /gi) || []).length;
    if (linkCount === 0 && wordCount > 500) {
      score -= 3;
      recommendations.push({
        type: "İç Link Eksik",
        severity: "low",
        message: "İçerikte link bulunamadı",
        suggestion: "İlgili içeriklere linkler ekleyin",
      });
    }
  }

  // Excerpt kontrolü
  if (!input.excerpt || input.excerpt.length === 0) {
    score -= 5;
    recommendations.push({
      type: "Özet Eksik",
      severity: "low",
      message: "Makale özeti bulunamadı",
      suggestion: "Kısa bir özet ekleyin",
    });
  }

  // Keywords kontrolü
  if (!input.keywords || input.keywords.length === 0) {
    score -= 5;
    recommendations.push({
      type: "Anahtar Kelime Eksik",
      severity: "low",
      message: "Meta anahtar kelimeler bulunamadı",
      suggestion: "İlgili anahtar kelimeleri ekleyin",
    });
  }

  // Skoru 0-100 arasında tut
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    recommendations,
  };
}
