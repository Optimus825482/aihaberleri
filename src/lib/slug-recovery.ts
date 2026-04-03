/**
 * Slug Recovery Service
 *
 * 404 durumundaki slug'lar için:
 * 1. Slug → arama sorgusu
 * 2. Brave API ile kaynak araştır
 * 3. Jina Reader ile içerik çek
 * 4. DeepSeek ile TR + EN içerik üret
 * 5. AYNI slug ile yayınla
 */

import { db } from "@/lib/db";
import { braveSearch } from "@/lib/brave";
import { callDeepSeek } from "@/lib/deepseek";
import { saveArticleTranslation } from "@/lib/translation";
import { generateSlug } from "@/lib/utils";
import axios from "axios";

// ─── Slug → arama sorgusu ─────────────────────────────────────────────────────

/**
 * URL slug'ını doğal dil arama sorgusuna dönüştürür.
 * Örnek: "qwen35-35b-a3b-turkiyede-yapay-zeka" → "qwen35 35b a3b türkiye yapay zeka"
 */
export function slugToQuery(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b(ve|ile|icin|bir|bu|de|da|ki|ne|mi)\b/g, "") // Türkçe stop kelimeler
    .replace(/\s+/g, " ")
    .trim();
}

// ─── URL içerik okuma ─────────────────────────────────────────────────────────

async function readUrlWithJina(url: string): Promise<string> {
  try {
    const resp = await axios.get(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
      timeout: 10000,
    });
    const text = String(resp.data || "");
    if (text.length > 100) {
      return text.substring(0, 3000);
    }
  } catch {
    // silent fail
  }
  return "";
}

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface SlugResearchResult {
  slug: string;
  query: string;
  sources: Array<{
    title: string;
    url: string;
    description: string;
  }>;
}

export interface SlugGeneratedContent {
  tr: {
    title: string;
    excerpt: string;
    content: string;
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  en: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
}

export interface SlugPublishResult {
  articleId: string;
  trSlug: string;
  enSlug: string;
}

// ─── Araştırma ────────────────────────────────────────────────────────────────

export async function researchBySlug(slug: string): Promise<SlugResearchResult> {
  const query = slugToQuery(slug);
  const results = await braveSearch(query, { count: 8 });

  return {
    slug,
    query,
    sources: results.slice(0, 8).map((r) => ({
      title: r.title,
      url: r.url,
      description: r.description || "",
    })),
  };
}

// ─── İçerik üretimi ──────────────────────────────────────────────────────────

export async function generateContentForSlug(
  slug: string,
  research: SlugResearchResult,
): Promise<SlugGeneratedContent> {
  const query = research.query;

  // En iyi 4 kaynağı oku (paralel)
  const sourcesWithContent = await Promise.all(
    research.sources.slice(0, 4).map(async (s) => {
      const content = await readUrlWithJina(s.url);
      return { ...s, content: content || s.description };
    }),
  );

  const sourcesText = sourcesWithContent
    .map(
      (s, i) => `
--- KAYNAK ${i + 1}: ${s.url} ---
Başlık: ${s.title}
İçerik:
${(s.content || s.description).substring(0, 2500)}
`,
    )
    .join("\n");

  const prompt = `Sen dünya çapında ödüllü bir investigative journalist ve haber editörüsün.

KONU: "${query}"

Aşağıdaki kaynaklardan bilgileri SENTEZLEYEREk:
1. Kapsamlı ve özgün bir TÜRKÇE haber makalesi yaz
2. Aynı haberi doğal ve akıcı İNGİLİZCE'ye çevir

### KAYNAKLAR:
${sourcesText}

### YAZIM KURALLARI:
- Türkçe ve İngilizce için: HTML formatlı (<p>, <h2>, <ul>/<li>), min 500 kelime
- Başlıklarda yıl EKLEME (sadece haber doğrudan yıla atıfta bulunuyorsa kullan)
- 3. tekil şahıs anlatım, "Ben/Biz" kullanma
- İlk ve son paragrafta ana anahtar kelime geçmeli
- En az 2 adet <h2> başlık kullan
- Başlık 50-70 karakter

SADECE aşağıdaki JSON formatında yanıt ver (başka açıklama ekleme):
{
  "tr": {
    "title": "Türkçe başlık (50-70 karakter)",
    "excerpt": "2-3 cümlelik özet",
    "content": "<p>HTML formatlı tam makale içeriği...</p>",
    "metaTitle": "Google SERP başlık (50-60 karakter)",
    "metaDescription": "CTA içeren meta açıklama (120-155 karakter)",
    "keywords": ["anahtar1", "anahtar2", "anahtar3"]
  },
  "en": {
    "title": "English title (50-70 chars)",
    "excerpt": "2-3 sentence summary",
    "content": "<p>HTML formatted full article...</p>",
    "metaTitle": "Google SERP title (50-60 chars)",
    "metaDescription": "Meta description with CTA (120-155 chars)",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
}`;

  const rawResponse = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Sen dünyanın en iyi Türkçe-İngilizce haber editörüsün. Çoklu kaynakları sentezleyerek kapsamlı ve özgün haberler üretiyorsun. SADECE geçerli JSON yanıtı ver.",
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.3, maxTokens: 8000 },
  );

  // JSON'u ayıkla (markdown code block'ları da destekle)
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI yanıtından JSON ayrıştırılamadı");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.tr?.title || !parsed.en?.title) {
    throw new Error("AI yanıtı eksik alan içeriyor (title zorunlu)");
  }

  const enSlug = generateSlug(parsed.en.title);

  return {
    tr: {
      title: String(parsed.tr.title),
      excerpt: String(parsed.tr.excerpt || ""),
      content: String(parsed.tr.content || ""),
      metaTitle: String(parsed.tr.metaTitle || parsed.tr.title),
      metaDescription: String(parsed.tr.metaDescription || ""),
      keywords: Array.isArray(parsed.tr.keywords) ? parsed.tr.keywords.map(String) : [],
    },
    en: {
      title: String(parsed.en.title),
      slug: enSlug,
      excerpt: String(parsed.en.excerpt || ""),
      content: String(parsed.en.content || ""),
      metaTitle: String(parsed.en.metaTitle || parsed.en.title),
      metaDescription: String(parsed.en.metaDescription || ""),
      keywords: Array.isArray(parsed.en.keywords) ? parsed.en.keywords.map(String) : [],
    },
  };
}

// ─── Yayınlama ────────────────────────────────────────────────────────────────

export async function publishRecoveredArticle(
  slug: string,
  content: SlugGeneratedContent,
  categoryId: string,
): Promise<SlugPublishResult> {
  // Mevcut makale kontrolü
  const existing = await db.article.findUnique({ where: { slug } });
  if (existing) {
    throw new Error(`Bu slug zaten mevcut: ${slug}`);
  }

  // EN slug çakışma kontrolü
  const existingEn = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ArticleTranslation"
    WHERE slug = ${content.en.slug} AND locale = 'en'
    LIMIT 1
  `;

  const enSlug =
    existingEn.length > 0 ? `${content.en.slug}-${Date.now()}` : content.en.slug;

  // Ana makaleyi oluştur (slug ZORLA orijinal 404 slug)
  const article = await db.article.create({
    data: {
      title: content.tr.title,
      slug, // ← orijinal 404 slug korunuyor
      excerpt: content.tr.excerpt,
      content: content.tr.content,
      metaTitle: content.tr.metaTitle,
      metaDescription: content.tr.metaDescription,
      keywords: content.tr.keywords,
      categoryId,
      status: "PUBLISHED",
      publishedAt: new Date(),
      score: 800,
    },
  });

  // TR çevirisini kaydet
  await saveArticleTranslation(article.id, "tr", {
    title: content.tr.title,
    slug,
    excerpt: content.tr.excerpt,
    content: content.tr.content,
    metaTitle: content.tr.metaTitle,
    metaDescription: content.tr.metaDescription,
  });

  // EN çevirisini kaydet (saveArticleTranslation titleEn/excerptEn/contentEn'i de günceller)
  await saveArticleTranslation(article.id, "en", {
    title: content.en.title,
    slug: enSlug,
    excerpt: content.en.excerpt,
    content: content.en.content,
    metaTitle: content.en.metaTitle,
    metaDescription: content.en.metaDescription,
  });

  return {
    articleId: article.id,
    trSlug: slug,
    enSlug,
  };
}
