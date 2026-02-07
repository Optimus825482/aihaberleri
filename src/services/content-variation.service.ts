/**
 * Content Variation Service
 *
 * 🎯 YENİ YAKLAŞIM: Duplicate'leri engellemek yerine, aynı konulardan
 * farklı açılardan içerik üret.
 *
 * Strateji:
 * 1. Aynı konu için farklı "angle" (açış) belirle
 * 2. Farklı hedef kitleye hitap et
 * 3. Derinlemesine araştırma yap
 * 4. SEO optimizasyonuyla tamamlama
 */

import { callDeepSeek } from "@/lib/deepseek";
import { deepResearchArticle } from "@/lib/brave";

export interface ContentVariation {
  angle: string;
  targetAudience: string;
  focus: string;
  titleModifier: string;
}

export interface ArticleWithVariation {
  originalTitle: string;
  originalDescription: string;
  originalUrl: string;
  variation: ContentVariation;
  researchContext: {
    statistics: string[];
    expertQuotes: string[];
    relatedContext: string[];
    sources: Array<{ title: string; url: string }>;
  };
}

/**
 * 🔥 YENİ: Aynı konu için farklı açışlar (angles) belirle
 *
 * Örnek: "OpenAI GPT-5 Yayınlandı" için:
 * - Teknik Analiz: Model mimarisi ve performans
 * - İş Dünyası: Şirketler nasıl kullanacak?
 * - Etkik Güvenlik: Riskler ve önlemler
 * - Kullanıcı Deneyimi: Pratik kullanım senaryoları
 */
export async function generateContentAngles(
  originalTitle: string,
  originalDescription: string,
  existingTopics: string[] = [],
): Promise<ContentVariation[]> {
  const existingTopicsList = existingTopics.length > 0
    ? `\n⚠️ DİKKAT: Bu konuları AVOID et (zaten işlendi):\n${existingTopics.map(t => `  - ${t}`).join("\n")}`
    : "";

  const prompt = `Sen bir içerik stratejisti uzmanısın. Aynı haberden farklı açılardan içerik üretmek istiyoruz.

ORİJİNAL HABER:
Başlık: "${originalTitle}"
Özet: "${originalDescription}"
${existingTopicsList}

GÖREV: Bu haberden 5 FARKLI AÇI (angle) üret. Her açı farklı hedef kitleye hitap etmeli.

ÇIKTI FORMATI (her açı için):
ANGLE: [kısa açı adı]
TARGET: [hedef kitle]
FOCUS: [odak noktası]
TITLE_MODIFIER: [başlık nasıl değiştirilmeli]

ÖRNEK ÇIKTI:
ANGLE: Teknik Analiz
TARGET: Geliştiriciler ve mühendisler
FOCUS: Model mimarisi, parametreler, benchmark sonuçları
TITLE_MODIFIER: "GPT-5 Teknik İnceleme: Model Mimarisinde Neler Yeni?"

ANGLE: İş Dünyası
TARGET: İşletme sahipleri ve yöneticiler
FOCUS: ROI, otomasyon fırsatları, maliyet tasarrufu
TITLE_MODIFIER: "GPT-5 İş Dünyasında Devrim Yaratacak mı?"

Şimdi 5 farklı açı üret:`;

  try {
    const response = await callDeepSeek(
      [
        {
          role: "system",
          content: "Sen bir içerik stratejisti uzmanısın. JSON formatında yanıt vermelisin."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      {
        model: "deepseek-chat",
        maxTokens: 1000,
        temperature: 0.8 // Yüksek creativity = daha çeşitli açılar
      }
    );

    // Parse the response into ContentVariation objects
    const variations: ContentVariation[] = [];
    const lines = response.split("\n");
    let currentVariation: Partial<ContentVariation> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("ANGLE:")) {
        if (currentVariation.angle && currentVariation.targetAudience) {
          variations.push(currentVariation as ContentVariation);
        }
        currentVariation = { angle: trimmed.replace("ANGLE:", "").trim() };
      } else if (trimmed.startsWith("TARGET:")) {
        currentVariation.targetAudience = trimmed.replace("TARGET:", "").trim();
      } else if (trimmed.startsWith("FOCUS:")) {
        currentVariation.focus = trimmed.replace("FOCUS:", "").trim();
      } else if (trimmed.startsWith("TITLE_MODIFIER:")) {
        currentVariation.titleModifier = trimmed.replace("TITLE_MODIFIER:", "").trim();
      }
    }

    // Add last variation
    if (currentVariation.angle && currentVariation.targetAudience) {
      variations.push(currentVariation as ContentVariation);
    }

    return variations.length > 0 ? variations : getDefaultVariations();
  } catch (error) {
    console.warn("⚠️ Angle generation failed, using defaults:", error);
    return getDefaultVariations();
  }
}

/**
 * Fallback variations when AI fails
 */
function getDefaultVariations(): ContentVariation[] {
  return [
    {
      angle: "Derinlemesine Analiz",
      targetAudience: Teknoloji meraklıları,
      focus: Teknik detaylar ve spesifikasyonlar,
      titleModifier: "Detaylı İnceleme:"
    },
    {
      angle: "Pratik Uygulamalar",
      targetAudience: "Kullanıcılar",
      focus: "Günlük kullanım senaryoları",
      titleModifier: "Nasıl Kullanılır?"
    },
    {
      angle: "Sektör Etkisi",
      targetAudience: "İş dünyası",
      focus: "Pazar etkisi ve trendler",
      titleModifier: "Sektörü Nasıl Etkiler?"
    }
  ];
}

/**
 * 🔬 Derin araştırma + Angle belirleme -> Zenginleştirilmiş içerik
 */
export async function createVariationArticle(
  originalTitle: string,
  originalDescription: string,
  originalUrl: string,
  variation: ContentVariation,
  existingTopics: string[] = []
): Promise<{
  angleTitle: string;
  angleContent: string;
  researchSummary: string;
}> {
  console.log(`\n🎨 Creating variation: ${variation.angle}`);
  console.log(`   Target: ${variation.targetAudience}`);
  console.log(`   Focus: ${variation.focus}`);

  // Step 1: Derin araştırma (Brave API)
  console.log(`🔬 Deep research for: ${originalTitle}`);
  const researchData = await deepResearchArticle(originalTitle, originalDescription);

  // Step 2: AI ile açıya göre yeniden yaz
  const rewritePrompt = `Sen uzman bir teknoloji yazarısın. Aşağıdaki haberi belirtilen AÇI'dan (angle) yeniden yaz.

ORİJİNAL HABER:
Başlık: "${originalTitle}"
Özet: "${originalDescription}"

SEÇİLEN AÇI (ANGLE):
- Açı: ${variation.angle}
- Hedef Kitle: ${variation.targetAudience}
- Odak: ${variation.focus}
- Başlık Değiştirici: ${variation.titleModifier}

EK ARAŞTIRMA VERİLERİ:
${researchData.statistics.length > 0 ? `📊 İstatistikler:\n${researchData.statistics.map(s => `  - ${s}`).join("\n")}` : ""}
${researchData.expertQuotes.length > 0 ? `💬 Uzman Görüşleri:\n${researchData.expertQuotes.map(q => `  - "${q}"`).join("\n")}` : ""}
${researchData.relatedContext.length > 0 ? `🔗 İlgili Bağlam:\n${researchData.relatedContext.map(c => `  - ${c}`).join("\n")}` : ""}

KURALLAR:
1. Başlığı ${variation.titleModifier} ile başlat
2. ${variation.targetAudience} kitlesine hitap et
3. ${variation.focus} konusuna odaklan
4. Araştırma verilerini kullan (varsa)
5. SEO uyumlu, 800-1000 kelime
6. Türkçe, profesyonel ton
7. "human-like" yaz - robot gibi değil
8. Alt başlıklar kullan (H2, H3)
9. Madde işaretleri ekle
10. Eyleme geçirilebilir tavsiyeler ver

ÇIKTI FORMATI:
TITLE: [yeni başlık]
CONTENT: [HTML formatlı içerik]
RESEARCH_SUMMARY: [kullanılan araştırma özeti]`;

  try {
    const response = await callDeepSeek(
      [
        {
          role: "system",
          content: "Sen uzman bir teknoloji yazarısın. SEO uyumlu, insan gibi yazı yazarsın."
        },
        {
          role: "user",
          content: rewritePrompt
        }
      ],
      {
        model: "deepseek-chat",
        maxTokens: 3000,
        temperature: 0.9 // Yüksek creativity = daha özgün içerik
      }
    );

    // Parse response
    let angleTitle = variation.titleModifier + " " + originalTitle;
    let angleContent = response;
    let researchSummary = "";

    if (response.includes("TITLE:")) {
      const parts = response.split("CONTENT:");
      if (parts.length >= 2) {
        angleTitle = parts[0].replace("TITLE:", "").trim();
        const rest = parts[1];
        if (rest.includes("RESEARCH_SUMMARY:")) {
          const contentAndResearch = rest.split("RESEARCH_SUMMARY:");
          angleContent = contentAndResearch[0].trim();
          researchSummary = contentAndResearch[1].trim();
        } else {
          angleContent = rest.trim();
        }
      }
    }

    return {
      angleTitle,
      angleContent,
      researchSummary: researchSummary || `${researchData.sources.length} kaynak kullanıldı`
    };
  } catch (error) {
    console.error("❌ Variation creation failed:", error);
    throw error;
  }
}

/**
 * 🎯 Ana fonksiyon: Benzer konular için variation oluştur
 *
 * Kullanım:
 * 1. Agent çalıştır
 * 2. Aynı konuda haber var mı kontrol et
 * 3. Varsa -> variation oluştur
 * 4. Yoksa -> normal akış
 */
export async function findOrCreateVariation(
  candidateTitle: string,
  candidateDescription: string,
  candidateUrl: string,
  existingArticles: Array<{ title: string; topic: string; publishedAt: Date }>,
  timeWindowHours: number = 48
): Promise<{
  shouldCreateVariation: boolean;
  variation?: ContentVariation;
  reason?: string;
  baseArticle?: { title: string; topic: string };
}> {
  // 1. Benzer konuları bul
  const similarTopics = existingArticles.filter(article => {
    const hoursSince = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince > timeWindowHours) return false;

    // Basit benzerlik kontrolü
    const candidateLower = candidateTitle.toLowerCase();
    const articleLower = article.title.toLowerCase();

    // Ortak kelimeleri kontrol et
    const candidateWords = candidateLower.split(/\s+/).filter(w => w.length > 4);
    const articleWords = articleLower.split(/\s+/).filter(w => w.length > 4);

    const commonWords = candidateWords.filter(w => articleWords.includes(w));
    const similarity = commonWords.length / Math.max(candidateWords.length, 1);

    return similarity > 0.3; // %30+ benzerlik
  });

  if (similarTopics.length === 0) {
    return {
      shouldCreateVariation: false,
      reason: "No similar topics found - can create original article"
    };
  }

  // 2. Mevcut topic'leri listele
  const existingTopics = similarTopics.map(a => a.topic);

  console.log(`\n🔄 Similar topics found (${similarTopics.length}):`);
  similarTopics.forEach((a, i) => {
    console.log(`   ${i + 1}. ${a.title} (${a.topic})`);
  });

  // 3. Yeni açılar üret
  const variations = await generateContentAngles(
    candidateTitle,
    candidateDescription,
    existingTopics
  );

  // 4. En iyi variation'ı seç (ilk olan)
  const selectedVariation = variations[0];

  console.log(`\n✅ Selected variation: ${selectedVariation.angle}`);
  console.log(`   This will create UNIQUE content from similar topic`);

  return {
    shouldCreateVariation: true,
    variation: selectedVariation,
    reason: `Similar topic exists, creating ${selectedVariation.angle} variation`,
    baseArticle: similarTopics[0]
  };
}

/**
 * 🔥 SEO Uzmanı modu: İçeriği SEO açısından optimize et
 */
export async function optimizeForSEO(
  title: string,
  content: string,
  targetKeywords: string[] = []
): Promise<{
  optimizedTitle: string;
  metaDescription: string;
  focusKeywords: string[];
  suggestedUrl: string;
}> {
  const keywords = targetKeywords.length > 0
    ? `HEDEF ANAHTAR KELİMELER: ${targetKeywords.join(", ")}`
    : "";

  const prompt = `Sen bir SEO uzmanısın. Aşağıdaki içeriği SEO açısından optimize et.

BAŞLIK: "${title}"
İÇERİK: ${content.substring(0, 500)}...
${keywords}

GÖREV:
1. SEO uyumlu başlık (60 karakter max)
2. Meta description (160 karakter max)
3. Focus keywords (5 ana kelime)
4. URL slug önerisi

ÇIKTI FORMATI:
TITLE: [seo başlık]
META_DESC: [meta description]
KEYWORDS: [kelime1, kelime2, ...]
URL: [url-slug]`;

  try {
    const response = await callDeepSeek(
      [
        {
          role: "system",
          content: "Sen bir SEO uzmanısın. JSON formatında yanıt ver."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      {
        model: "deepseek-chat",
        maxTokens: 300,
        temperature: 0.3
      }
    );

    // Parse response
    let optimizedTitle = title;
    let metaDescription = "";
    let focusKeywords: string[] = [];
    let suggestedUrl = "";

    const lines = response.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("TITLE:")) {
        optimizedTitle = trimmed.replace("TITLE:", "").trim();
      } else if (trimmed.startsWith("META_DESC:")) {
        metaDescription = trimmed.replace("META_DESC:", "").trim();
      } else if (trimmed.startsWith("KEYWORDS:")) {
        const keywordsStr = trimmed.replace("KEYWORDS:", "").trim();
        focusKeywords = keywordsStr.split(",").map(k => k.trim());
      } else if (trimmed.startsWith("URL:")) {
        suggestedUrl = trimmed.replace("URL:", "").trim();
      }
    }

    return {
      optimizedTitle: optimizedTitle || title,
      metaDescription: metaDescription || title,
      focusKeywords: focusKeywords.length > 0 ? focusKeywords : ["AI", "yapay zeka"],
      suggestedUrl: suggestedUrl || title.toLowerCase().replace(/\s+/g, "-")
    };
  } catch (error) {
    console.warn("⚠️ SEO optimization failed, using defaults");
    return {
      optimizedTitle: title,
      metaDescription: title,
      focusKeywords: ["AI", "yapay zeka"],
      suggestedUrl: title.toLowerCase().replace(/\s+/g, "-")
    };
  }
}

export default {
  generateContentAngles,
  createVariationArticle,
  findOrCreateVariation,
  optimizeForSEO
};
