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
import { exaSearch } from "@/lib/exa";
import { callDeepSeek } from "@/lib/deepseek";
import { generateSlug } from "@/lib/utils";
import { fetchGeminiImage, fetchAIHordeImage, fetchPollinationsImage, fetchFreeBackupImage } from "@/lib/pollinations";
import { optimizeAndGenerateSizes } from "@/lib/image-optimizer";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";
import axios from "axios";

// ─── Slug → arama sorgusu ─────────────────────────────────────────────────────

/**
 * URL slug'ını doğal dil arama sorgusuna dönüştürür.
 * Örnek: "qwen35-35b-a3b-turkiyede-yapay-zeka" → "qwen35 35b a3b türkiye yapay zeka"
 */
export function slugToQuery(slug: string): string {
  const cleaned = slug
    .replace(/-/g, " ")
    .replace(/\b(ve|ile|icin|bir|bu|de|da|ki|ne|mi)\b/g, "") // Türkçe stop kelimeler
    .replace(/\s+/g, " ")
    .trim();
  // Exa / arama API limiti — ilk 8 anlamlı kelimeyi al
  return cleaned.split(" ").filter(Boolean).slice(0, 8).join(" ");
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

// ─── NSFW-safe görsel üretimi ────────────────────────────────────────────────

/**
 * Slug recovery için NSFW-güvenli görsel üretir.
 *
 * Öncelik sırası:
 *  1. Gemini (Google safety filter — en katı, NSFW üretmez)
 *  2. Pollinations flux + safe=true (platform seviyesi filtre)
 *  3. Picsum (stock fotoğraf, garantili güvenli)
 *
 * Prompt mühendisliği kuralları:
 *  - Her zaman "SFW, safe for work, professional" ile başla
 *  - İnsan/yüz/vücut içeren terimleri kesinlikle ekleme
 *  - Teknoloji temasını somut nesnelerle ifade et (devre, ekran, ağ vs.)
 */
async function generateSafeRecoveryImage(
  title: string,
  customPrompt?: string,
): Promise<string> {
  // ── Güvenli, NSFW'den uzak prompt oluştur ───────────────────────────────────
  const safeBase =
    "SFW, safe for work, professional technology news illustration, " +
    "modern digital art, clean minimal design, 4k, high quality, " +
    "abstract tech aesthetic, no people, no humans, no faces, no hands, " +
    "no body parts, no text, no watermark, no logo, " +
    "studio lighting, sharp focus, editorial style";

  // Başlıktan konuya özgü güvenli anahtar kelimeler çıkar
  const topicKeywords = extractSafeTopicKeywords(title);

  const finalPrompt = customPrompt
    ? `${safeBase}, ${customPrompt.replace(/nsfw|adult|explicit|sexy|nude/gi, "").trim()}`
    : `${topicKeywords}, ${safeBase}`;

  console.log(`[SLUG-RECOVERY] 🎨 Görsel prompt: ${finalPrompt.substring(0, 120)}`);

  // ── 1. AI Horde (ücretsiz, sınırsız, nsfw=false + censor_nsfw=true) ──────────
  try {
    const hordeUrl = await fetchAIHordeImage(finalPrompt, { width: 1200, height: 630 });
    if (hordeUrl) {
      console.log("[SLUG-RECOVERY] ✅ AI Horde görsel başarılı");
      return hordeUrl;
    }
  } catch (e) {
    console.warn(`[SLUG-RECOVERY] ⚠️ AI Horde görsel başarısız: ${(e as Error).message}`);
  }

  // ── 2. Gemini (Google safety filter) ────────────────────────────────────────
  try {
    const geminiUrl = await fetchGeminiImage(finalPrompt);
    if (geminiUrl) {
      console.log("[SLUG-RECOVERY] ✅ Gemini görsel başarılı");
      return geminiUrl;
    }
  } catch (e) {
    console.warn(`[SLUG-RECOVERY] ⚠️ Gemini görsel başarısız: ${(e as Error).message}`);
  }

  // ── 3. Pollinations flux + safe=true (fallback) ──────────────────────────────
  try {
    const pollUrl = await fetchPollinationsImage(finalPrompt, {
      model: "flux",
      width: 1200,
      height: 630,
      safe: true,
      enhance: true,
      negativePrompt:
        "nsfw, nude, explicit, sexual, violent, gore, blood, weapon, " +
        "people, humans, faces, hands, portraits, body parts, " +
        "watermark, text, logo, signature, low quality, blurry",
      allowBackupFallback: false,
    });
    if (pollUrl) {
      console.log("[SLUG-RECOVERY] ✅ Pollinations görsel başarılı");
      return pollUrl;
    }
  } catch (e) {
    console.warn(`[SLUG-RECOVERY] ⚠️ Pollinations görsel başarısız: ${(e as Error).message}`);
  }

  // ── 3. Picsum (garantili güvenli stock fotoğraf) ─────────────────────────────
  console.warn("[SLUG-RECOVERY] 📷 Picsum fallback kullanılıyor");
  return fetchFreeBackupImage(finalPrompt);
}

/**
 * Haber başlığından NSFW riski taşımayan, konuya özgü görsel anahtar kelimeleri çıkarır.
 */
function extractSafeTopicKeywords(title: string): string {
  const lower = title.toLowerCase();

  const topicMap: Array<{ terms: string[]; keywords: string }> = [
    {
      terms: ["yapay zeka", "ai", "llm", "model", "chatgpt", "gpt", "claude", "gemini"],
      keywords: "glowing neural network visualization, AI chip, digital brain, circuit board",
    },
    {
      terms: ["robot", "otomasyon", "automation"],
      keywords: "industrial robotic arm, factory automation, mechanical components, metallic machinery",
    },
    {
      terms: ["güvenlik", "security", "siber", "cyber", "hack", "şifre"],
      keywords: "digital lock, cybersecurity shield, encrypted data streams, firewall visualization",
    },
    {
      terms: ["bulut", "cloud", "sunucu", "server", "veri merkezi", "data center"],
      keywords: "server rack, data center infrastructure, glowing cables, cloud computing visualization",
    },
    {
      terms: ["telefon", "phone", "mobil", "mobile", "iphone", "android"],
      keywords: "sleek smartphone floating, mobile app interface, device screen glow",
    },
    {
      terms: ["chip", "işlemci", "processor", "gpu", "nvidia", "intel", "amd"],
      keywords: "semiconductor chip close-up, microprocessor architecture, silicon wafer",
    },
    {
      terms: ["araç", "araba", "otomotiv", "ev", "akıllı ev", "iot"],
      keywords: "smart home devices, IoT connected objects, glowing interface on objects",
    },
    {
      terms: ["para", "fintech", "kripto", "bitcoin", "ekonomi", "finance"],
      keywords: "digital currency visualization, financial data graph, holographic chart",
    },
    {
      terms: ["sağlık", "health", "tıp", "medical", "hastane", "hospital"],
      keywords: "medical technology, digital health visualization, futuristic medical equipment",
    },
    {
      terms: ["uzay", "space", "nasa", "roket", "rocket", "satellite"],
      keywords: "spacecraft in orbit, satellite visualization, cosmic technology",
    },
  ];

  for (const { terms, keywords } of topicMap) {
    if (terms.some((t) => lower.includes(t))) {
      return keywords;
    }
  }

  // Varsayılan — genel teknoloji
  return "abstract technology background, digital grid, glowing data streams, futuristic interface";
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
  imagePrompt?: string;
}

export interface SlugPublishResult {
  articleId: string;
  trSlug: string;
  enSlug: string;
}

// ─── Araştırma ────────────────────────────────────────────────────────────────

export async function researchBySlug(slug: string): Promise<SlugResearchResult> {
  const query = slugToQuery(slug);
  const results = await exaSearch(query, {
    num_results: 8,
    use_autoprompt: true,
    type: "neural",
  });

  return {
    slug,
    query,
    sources: results.slice(0, 8).map((r) => ({
      title: r.title,
      url: r.url,
      description: r.text ? r.text.substring(0, 300) : "",
    })),
  };
}

// ─── İçerik üretimi ──────────────────────────────────────────────────────────

export async function generateContentForSlug(
  slug: string,
  research: SlugResearchResult,
): Promise<SlugGeneratedContent> {
  const query = research.query;

  // En iyi 4 kaynağı oku — Exa zaten text döndürüyor, kısa olanlar için Jina fallback
  const sourcesWithContent = await Promise.all(
    research.sources.slice(0, 4).map(async (s) => {
      // Exa'dan gelen description (text snippet) yeterliyse Jina'ya gitme
      if (s.description && s.description.length >= 200) {
        return { ...s, content: s.description };
      }
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
  },
  "imagePrompt": "professional tech illustration, [topic specific], digital art, 4k, no people, no humans, no faces"
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
    imagePrompt: parsed.imagePrompt ? String(parsed.imagePrompt) : undefined,
  };
}

// ─── Yayınlama ────────────────────────────────────────────────────────────────

export async function publishRecoveredArticle(
  slug: string,
  content: SlugGeneratedContent,
  categoryId: string,
): Promise<SlugPublishResult> {
  // ── 1. Article tablosunda slug kontrolü ─────────────────────────────────────
  //    Eğer Article zaten bu slug ile varsa ve translation'ı da varsa → atla.
  //    Translation'ı yoksa → kurtarma işlemini tamamla.
  const existingArticle = await db.article.findUnique({ where: { slug } });
  if (existingArticle) {
    const existingTrForArticle = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "ArticleTranslation"
      WHERE "articleId" = ${existingArticle.id} AND locale = 'tr'
      LIMIT 1
    `;
    if (existingTrForArticle.length > 0) {
      // Her şey tamam — zaten yayınlı
      console.log(`[SLUG-RECOVERY] ⏭️ Zaten yayınlı, atlandı: ${slug}`);
      return { articleId: existingArticle.id, trSlug: slug, enSlug: "" };
    }
    // Article var ama translation yok — aşağıda translation oluşturulacak
    console.log(`[SLUG-RECOVERY] 🔧 Article var, translation eksik — tamamlanıyor: ${slug}`);
  }

  // ── 2. ArticleTranslation tablosunda (slug, tr) çakışma kontrolü ────────────
  //    Başka bir makalenin TR translation'ı bu slug'ı kullanıyorsa,
  //    o makaleyi 404 hedef slug'ına taşı — yeni Article oluşturma.
  const existingTrTranslation = await db.$queryRaw<{ id: string; articleId: string }[]>`
    SELECT id, "articleId" FROM "ArticleTranslation"
    WHERE slug = ${slug} AND locale = 'tr'
    LIMIT 1
  `;

  if (existingTrTranslation.length > 0) {
    const ownerArticleId = existingTrTranslation[0].articleId;
    const ownerArticle = await db.article.findUnique({ where: { id: ownerArticleId } });

    if (ownerArticle) {
      // Sahip makale farklı bir slug'da yaşıyor — onu 404 hedef slug'ına taşı
      if (ownerArticle.slug !== slug) {
        await db.article.update({
          where: { id: ownerArticleId },
          data: { slug },
        });
        console.log(`[SLUG-RECOVERY] ♻️ Mevcut makale slug'ı güncellendi: ${ownerArticle.slug} → ${slug}`);
      }
      // EN translation'ı da kontrol et, yoksa oluştur
      const existingEnForOwner = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM "ArticleTranslation"
        WHERE "articleId" = ${ownerArticleId} AND locale = 'en'
        LIMIT 1
      `;
      if (existingEnForOwner.length === 0) {
        const enSlugFallback = `${content.en.slug}-${Date.now()}`;
        await db.$executeRaw`
          INSERT INTO "ArticleTranslation" (
            id, "articleId", locale, title, slug, excerpt, content,
            "metaTitle", "metaDescription", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), ${ownerArticleId}, 'en', ${content.en.title},
            ${enSlugFallback}, ${content.en.excerpt}, ${content.en.content},
            ${content.en.metaTitle || null}, ${content.en.metaDescription || null},
            NOW(), NOW()
          )
          ON CONFLICT (slug, locale) DO NOTHING
        `;
        await db.$executeRaw`
          UPDATE "Article" SET
            "titleEn"   = ${content.en.title},
            "excerptEn" = ${content.en.excerpt},
            "contentEn" = ${content.en.content}
          WHERE id = ${ownerArticleId}
        `;
      }
      return { articleId: ownerArticleId, trSlug: slug, enSlug: content.en.slug };
    } else {
      // Orphan translation — temizle ve devam et
      await db.$executeRaw`
        DELETE FROM "ArticleTranslation" WHERE id = ${existingTrTranslation[0].id}
      `;
      console.log(`[SLUG-RECOVERY] 🧹 Orphan TR translation temizlendi: ${existingTrTranslation[0].id}`);
    }
  }

  // ── 3. EN slug çakışma kontrolü ─────────────────────────────────────────────
  const existingEn = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ArticleTranslation"
    WHERE slug = ${content.en.slug} AND locale = 'en'
    LIMIT 1
  `;
  const enSlug =
    existingEn.length > 0 ? `${content.en.slug}-${Date.now()}` : content.en.slug;

  // ── 4. Görsel üret (transaction öncesi — zaman alabilir) ────────────────────
  let imageUrl: string | null = null;
  let imageUrlMedium: string | null = null;
  let imageUrlSmall: string | null = null;
  let imageUrlThumb: string | null = null;

  try {
    const rawImageUrl = await generateSafeRecoveryImage(
      content.tr.title,
      content.imagePrompt,
    );
    if (rawImageUrl) {
      const sizes = await optimizeAndGenerateSizes(rawImageUrl, slug);
      imageUrl = sizes.original ?? rawImageUrl;
      imageUrlMedium = sizes.medium ?? null;
      imageUrlSmall = sizes.small ?? null;
      imageUrlThumb = sizes.thumb ?? null;
      console.log(`[SLUG-RECOVERY] 🖼️ Görsel oluşturuldu: ${imageUrl?.substring(0, 80)}`);
    }
  } catch (imgErr) {
    console.warn(`[SLUG-RECOVERY] ⚠️ Görsel üretilemedi, görselsiz devam: ${(imgErr as Error).message}`);
  }

  // ── 5. Transaction ile atomik kayıt ─────────────────────────────────────────
  const result = await db.$transaction(async (tx) => {
    // Article zaten varsa yeniden oluşturma — mevcut olanı kullan
    const article = existingArticle
      ? existingArticle
      : await tx.article.create({
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
            imageUrl,
            imageUrlMedium,
            imageUrlSmall,
            imageUrlThumb,
          },
        });

    // TR çevirisini kaydet
    await tx.$executeRaw`
      INSERT INTO "ArticleTranslation" (
        id, "articleId", locale, title, slug, excerpt, content,
        "metaTitle", "metaDescription", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${article.id}, 'tr', ${content.tr.title},
        ${slug}, ${content.tr.excerpt}, ${content.tr.content},
        ${content.tr.metaTitle || null}, ${content.tr.metaDescription || null},
        NOW(), NOW()
      )
      ON CONFLICT (slug, locale) DO UPDATE SET
        "updatedAt" = NOW()
    `;

    // EN çevirisini kaydet
    await tx.$executeRaw`
      INSERT INTO "ArticleTranslation" (
        id, "articleId", locale, title, slug, excerpt, content,
        "metaTitle", "metaDescription", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${article.id}, 'en', ${content.en.title},
        ${enSlug}, ${content.en.excerpt}, ${content.en.content},
        ${content.en.metaTitle || null}, ${content.en.metaDescription || null},
        NOW(), NOW()
      )
      ON CONFLICT (slug, locale) DO UPDATE SET
        slug = ${enSlug},
        "updatedAt" = NOW()
    `;

    // Article.titleEn/excerptEn/contentEn denormalize güncelle
    await tx.$executeRaw`
      UPDATE "Article" SET
        "titleEn"   = ${content.en.title},
        "excerptEn" = ${content.en.excerpt},
        "contentEn" = ${content.en.content}
      WHERE id = ${article.id}
    `;

    return { articleId: article.id };
  });

  // ── 6. Sosyal medya paylaşım kuyruğuna ekle ─────────────────────────────────
  try {
    const socialShareQueue = getQueue(QUEUE_NAMES.SOCIAL_SHARE);
    if (socialShareQueue) {
      // categoryName'i DB'den çek (SocialShareInput zorunlu alan)
      const category = await db.category.findUnique({
        where: { id: categoryId },
        select: { name: true },
      });
      const categoryName = category?.name ?? "Yapay Zeka";

      await socialShareQueue.add(
        "share-articles",
        [
          {
            articleId: result.articleId,
            slug,
            title: content.tr.title,
            excerpt: content.tr.excerpt,
            imageUrl,
            categoryName,
            enSlug,
            enTitle: content.en.title,
            enExcerpt: content.en.excerpt,
          },
        ],
        { removeOnComplete: 100, removeOnFail: 50, attempts: 3 },
      );
      console.log(`[SLUG-RECOVERY] 📱 Sosyal paylaşım kuyruğuna eklendi: ${slug}`);
    }
  } catch (shareErr) {
    // Paylaşım hatası makaleyi etkilemesin
    console.warn(`[SLUG-RECOVERY] ⚠️ Sosyal paylaşım kuyruğu hatası: ${(shareErr as Error).message}`);
  }

  return {
    articleId: result.articleId,
    trSlug: slug,
    enSlug,
  };
}
