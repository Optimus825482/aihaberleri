/**
 * Intelligent News Service v2.0
 *
 * YENİ AKIŞ:
 * 1. RSS'den haberler toplanır → Trend analizi yapılır
 * 2. En iyi 20 haber sıralanır
 * 3. SIRAYLA kontrol et: Duplicate mi? → Hayır → Bu haberi al!
 * 4. Derin araştırma: Brave API ile 8-10 kaynak topla
 * 5. Kaynakları oku: Jina Reader ile içerikleri çek
 * 6. Sentezle: Tüm kaynakları birleştir, orijinal içerik yaz
 * 7. Çift dilde yayınla: Önce Türkçe, sonra İngilizce
 */

import { db } from "@/lib/db";
import { braveSearch, type BraveSearchResult } from "@/lib/brave";
import { callDeepSeek, generateImagePrompt } from "@/lib/deepseek";
import { isDuplicateNews, type NewsArticle } from "./news.service";
import { generateSlug } from "@/lib/utils";
import { normalizeUrl } from "@/lib/url-utils";
import {
  fetchPollinationsImage,
  fetchFreeBackupImage,
} from "@/lib/pollinations";
import { optimizeAndGenerateSizes } from "@/lib/image-optimizer";
import { createModuleLogger } from "@/lib/agent-log-stream";
import { upsertGlossaryWithArticleTerms } from "../lib/ai-glossary";
import axios from "axios";

// Create module-specific loggers for live streaming
const liveLog = {
  research: createModuleLogger("research"),
  ai: createModuleLogger("ai"),
  process: createModuleLogger("process"),
  publish: createModuleLogger("publish"),
  error: createModuleLogger("error"),
};

// Re-export slugify for internal use
export const slugify = generateSlug;

// ============================================
// TYPES
// ============================================

export interface ResearchedArticle {
  originalArticle: NewsArticle;
  sources: Array<{
    title: string;
    url: string;
    content: string;
    relevanceScore: number;
  }>;
  synthesizedContent: {
    tr: {
      title: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
      metaTitle?: string;
    };
    en: {
      title: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
      metaTitle?: string;
    };
  };
}

export interface SelectionResult {
  selected: NewsArticle | null;
  skippedCount: number;
  skippedReasons: string[];
}

// ============================================
// CONTENT EXTRACTION - Multi-provider fallback
// ============================================

const JINA_READER_URL = "https://r.jina.ai";
const JINA_TIMEOUT = 10000; // 10 seconds (reduced from 15)
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";
const TAVILY_TIMEOUT = 12000; // 12 seconds

/**
 * Jina Reader ile URL içeriğini oku
 */
async function readWithJina(url: string): Promise<string | null> {
  try {
    const response = await axios.get(`${JINA_READER_URL}/${url}`, {
      headers: {
        Accept: "text/plain",
        "X-Return-Format": "markdown",
      },
      timeout: JINA_TIMEOUT,
    });

    const content = response.data;
    if (content && content.length > 100) {
      return content;
    }
    return null;
  } catch (error: any) {
    // Silent fail - will try fallback
    return null;
  }
}

/**
 * Tavily Extract API ile URL içeriğini oku (fallback)
 */
async function readWithTavily(url: string): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await axios.post(
      TAVILY_EXTRACT_URL,
      {
        urls: [url],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: TAVILY_TIMEOUT,
      },
    );

    const results = response.data?.results;
    if (results && results.length > 0 && results[0].raw_content) {
      return results[0].raw_content;
    }
    return null;
  } catch (error: any) {
    // Silent fail
    return null;
  }
}

/**
 * URL içeriğini oku - Multi-provider fallback
 * 1. Jina Reader (free, fast)
 * 2. Tavily Extract (paid, reliable)
 */
async function readUrlContent(url: string): Promise<string> {
  console.log(`📖 İçerik okuma: ${url.substring(0, 60)}...`);

  // Try Jina Reader first (free)
  let content = await readWithJina(url);

  if (content) {
    console.log(`   ✅ Jina Reader başarılı`);
  } else {
    // Fallback to Tavily
    console.log(`   ⚠️ Jina başarısız, Tavily deneniyor...`);
    content = await readWithTavily(url);

    if (content) {
      console.log(`   ✅ Tavily başarılı`);
    } else {
      console.log(`   ❌ İçerik okunamadı`);
      return "";
    }
  }

  // Truncate if too long (token limit)
  if (content.length > 5000) {
    return content.substring(0, 5000) + "...";
  }

  return content;
}

// ============================================
// IMAGE GENERATION HELPER
// ============================================

/**
 * Görsel oluştur, optimize et ve R2'ye yükle
 */
async function generateAndUploadImageInternal(
  title: string,
  content: string,
  category: string,
  slug: string,
): Promise<{
  imageUrl: string | null;
  imageUrlMedium: string | null;
  imageUrlSmall: string | null;
  imageUrlThumb: string | null;
}> {
  try {
    // Generate image prompt using DeepSeek
    console.log("🎨 DeepSeek ile görsel prompt oluşturuluyor...");
    const imagePrompt = await generateImagePrompt(title, content, category);
    console.log(`📝 Görsel prompt: ${imagePrompt}`);

    // Get image from Pollinations.ai
    console.log("🖼️  Pollinations.ai'dan görsel alınıyor...");
    const imageUrl = await fetchPollinationsImage(imagePrompt, {
      width: 1200,
      height: 630,
      model: "flux",
      enhance: true,
      nologo: true,
      safe: true,
    });
    console.log("✅ Görsel URL:", imageUrl);

    // Optimize image and generate multiple sizes
    console.log("🎨 Görsel optimize ediliyor ve boyutlar oluşturuluyor...");
    let imageSizes = {
      large: imageUrl,
      medium: imageUrl,
      small: imageUrl,
      thumb: imageUrl,
    };

    try {
      imageSizes = await optimizeAndGenerateSizes(imageUrl, slug);
      console.log("✅ Görsel optimizasyonu tamamlandı");
    } catch (optimizeError) {
      console.error(
        "⚠️  Görsel optimizasyonu başarısız, orijinal kullanılacak:",
        optimizeError,
      );
    }

    return {
      imageUrl: imageSizes.large,
      imageUrlMedium: imageSizes.medium,
      imageUrlSmall: imageSizes.small,
      imageUrlThumb: imageSizes.thumb,
    };
  } catch (error: any) {
    console.error("❌ Görsel oluşturma hatası:", error.message);
    const backupImage = await fetchFreeBackupImage(`${title} ${category}`, {
      width: 1200,
      height: 630,
      model: "flux",
      enhance: true,
      nologo: true,
    });
    return {
      imageUrl: backupImage,
      imageUrlMedium: backupImage,
      imageUrlSmall: backupImage,
      imageUrlThumb: backupImage,
    };
  }
}

// ============================================
// SLUG-BASED DUPLICATE CHECK (Pre-processing)
// ============================================

/**
 * Potansiyel slug'ı hesapla ve veritabanında kontrol et
 * Bu, DeepSeek çağrısından ÖNCE yapılır (maliyet tasarrufu)
 */
async function isPotentialSlugDuplicate(
  title: string,
): Promise<{ isDuplicate: boolean; existingSlug?: string }> {
  // Potansiyel Türkçe slug oluştur (basit transliteration)
  const potentialSlug = slugify(title).substring(0, 50);

  // Veritabanında benzer slug ara
  const existing = await db.article.findFirst({
    where: {
      slug: {
        startsWith: potentialSlug.substring(0, 30),
      },
    },
    select: { id: true, slug: true, title: true },
  });

  if (existing) {
    console.log(
      `🔍 Potansiyel slug eşleşmesi: "${potentialSlug}" → "${existing.slug}"`,
    );
    return { isDuplicate: true, existingSlug: existing.slug };
  }

  return { isDuplicate: false };
}

// ============================================
// ENHANCED DUPLICATE CHECK (Multi-layer)
// ============================================

/**
 * Gelişmiş duplikat kontrolü - çoklu katman
 *
 * Layer 1: URL kontrolü (fastest)
 * Layer 2: Slug pre-check (fast)
 * Layer 3: Title/content similarity (slow but accurate)
 * Layer 4: Entity-based matching (semantic)
 */
export async function isArticleDuplicate(article: NewsArticle): Promise<{
  isDuplicate: boolean;
  reason?: string;
  existingArticle?: { id: string; title: string; slug: string };
}> {
  console.log(`🔍 Duplikat kontrolü: "${article.title.substring(0, 60)}..."`);

  // Layer 1: Exact URL match
  const normalizedUrl = normalizeUrl(article.url);
  const isYouTubeUrl =
    article.url.includes("youtube.com/watch") ||
    article.url.includes("youtu.be/");
  const urlConditions: any[] = [{ sourceUrl: normalizedUrl }];
  if (!isYouTubeUrl) {
    urlConditions.push({
      sourceUrl: { startsWith: normalizedUrl.split("?")[0] },
    });
  }
  const existingByUrl = await db.article.findFirst({
    where: {
      OR: urlConditions,
    },
    select: { id: true, title: true, slug: true, sourceUrl: true },
  });

  if (existingByUrl) {
    console.log(`❌ DUPLICATE (URL): ${existingByUrl.title}`);
    return {
      isDuplicate: true,
      reason: "EXACT_URL_MATCH",
      existingArticle: existingByUrl,
    };
  }

  // Layer 2: Entity-based semantic matching
  const entityMatch = await checkEntityBasedDuplicate(article.title);
  if (entityMatch.isDuplicate) {
    console.log(`❌ DUPLICATE (ENTITY): ${entityMatch.reason}`);
    return entityMatch;
  }

  // Layer 3: Advanced title/content similarity
  const duplicateCheck = await isDuplicateNews(
    article.title,
    article.description,
    72,
  );
  if (duplicateCheck.isDuplicate) {
    console.log(`❌ DUPLICATE (SIMILARITY): ${duplicateCheck.reason}`);

    // Mevcut makaleyi bul
    let existing = null;
    if (duplicateCheck.similarArticleId) {
      existing = await db.article.findUnique({
        where: { id: duplicateCheck.similarArticleId },
        select: { id: true, title: true, slug: true },
      });
    }

    return {
      isDuplicate: true,
      reason: duplicateCheck.reason,
      existingArticle: existing || undefined,
    };
  }

  console.log(`✅ Unique article: "${article.title.substring(0, 60)}..."`);
  return { isDuplicate: false };
}

/**
 * Entity bazlı duplikat kontrolü
 * Aynı entity'ler + benzer konu = muhtemelen aynı haber
 */
async function checkEntityBasedDuplicate(title: string): Promise<{
  isDuplicate: boolean;
  reason?: string;
  existingArticle?: { id: string; title: string; slug: string };
}> {
  const lowerTitle = title.toLowerCase();

  // Extract entities from title
  const entities = extractEntities(lowerTitle);

  if (entities.length < 2) {
    return { isDuplicate: false };
  }

  // Son 48 saat içindeki makaleleri kontrol et
  const recentArticles = await db.article.findMany({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });

  for (const article of recentArticles) {
    const existingEntities = extractEntities(article.title.toLowerCase());
    const commonEntities = entities.filter((e) => existingEntities.includes(e));

    // 2+ ortak entity = muhtemelen aynı haber
    if (commonEntities.length >= 2) {
      console.log(`🔗 Entity overlap detected: [${commonEntities.join(", ")}]`);
      return {
        isDuplicate: true,
        reason: `ENTITY_MATCH_${commonEntities.join("+")}`,
        existingArticle: article,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Title'dan entity'leri çıkar
 */
function extractEntities(text: string): string[] {
  const entities: string[] = [];

  // Companies
  const companyPatterns = [
    { pattern: /openai|gpt|chatgpt|sam altman/i, entity: "openai" },
    { pattern: /google|gemini|bard|deepmind/i, entity: "google" },
    { pattern: /microsoft|copilot|azure ai/i, entity: "microsoft" },
    { pattern: /meta|llama|zuckerberg/i, entity: "meta" },
    { pattern: /nvidia|jensen huang|cuda|gpu/i, entity: "nvidia" },
    { pattern: /apple|siri|apple intelligence/i, entity: "apple" },
    { pattern: /tesla|autopilot|elon musk|optimus/i, entity: "tesla" },
    { pattern: /anthropic|claude/i, entity: "anthropic" },
    { pattern: /amazon|alexa|aws ai/i, entity: "amazon" },
    { pattern: /deepseek/i, entity: "deepseek" },
    { pattern: /mistral/i, entity: "mistral" },
    { pattern: /xai|grok/i, entity: "xai" },
  ];

  // Actions/Events (word boundaries to prevent substring false positives like "ban" in "Banana")
  const actionPatterns = [
    { pattern: /\b(?:ban|yasak|yasakla)\b/i, entity: "ban" },
    { pattern: /\b(?:launch|release)\b|tanıt|duyur/i, entity: "launch" },
    {
      pattern: /\b(?:acquisition|merge)\b|satın al|birleş/i,
      entity: "acquisition",
    },
    { pattern: /\b(?:investment|fund)\b|yatırım/i, entity: "investment" },
    { pattern: /\b(?:partnership|collab)\b|ortaklık/i, entity: "partnership" },
  ];

  // Countries (for specific news like bans)
  const countryPatterns = [
    { pattern: /indonesia|endonezya/i, entity: "indonesia" },
    { pattern: /china|çin/i, entity: "china" },
    { pattern: /eu|avrupa birliği|european union/i, entity: "eu" },
    { pattern: /usa|amerika|united states/i, entity: "usa" },
  ];

  const allPatterns = [
    ...companyPatterns,
    ...actionPatterns,
    ...countryPatterns,
  ];

  for (const { pattern, entity } of allPatterns) {
    if (pattern.test(text)) {
      entities.push(entity);
    }
  }

  return [...new Set(entities)]; // Remove duplicates
}

// ============================================
// DEEP RESEARCH - Çoklu kaynak toplama
// ============================================

/**
 * Brave Search ile kapsamlı kaynak araştırması yap
 */
export async function gatherSources(
  article: NewsArticle,
  targetSourceCount: number = 8,
): Promise<
  Array<{ title: string; url: string; content: string; relevanceScore: number }>
> {
  console.log(
    `🔬 Kaynak toplama başlatılıyor: "${article.title.substring(0, 50)}..."`,
  );
  console.log(`   Hedef: ${targetSourceCount} kaynak`);

  await liveLog.research.info(
    `🔬 Derin araştırma: ${article.title.substring(0, 40)}...`,
  );

  const sources: Array<{
    title: string;
    url: string;
    content: string;
    relevanceScore: number;
  }> = [];
  const seenUrls = new Set<string>();

  // Add original article as first source
  seenUrls.add(normalizeUrl(article.url));

  // Extract keywords for search queries
  const keywords = extractSearchKeywords(article.title, article.description);
  console.log(`🔑 Anahtar kelimeler: ${keywords}`);

  // Generate diverse search queries
  const searchQueries = [
    keywords,
    `${keywords} latest news`,
    `${keywords} analysis`,
    `${keywords} details facts`,
    `${keywords} expert opinion`,
  ];

  // Search with each query
  for (const query of searchQueries) {
    if (sources.length >= targetSourceCount) break;

    try {
      console.log(`🔍 Arama: "${query}"`);

      const results = await braveSearch(query, {
        count: 10,
        freshness: "pw", // Past week
      });

      for (const result of results) {
        if (sources.length >= targetSourceCount) break;

        const normalizedUrl = normalizeUrl(result.url);
        if (seenUrls.has(normalizedUrl)) continue;
        seenUrls.add(normalizedUrl);

        // Skip non-article URLs
        if (shouldSkipUrl(result.url)) continue;

        // Calculate relevance score
        const relevanceScore = calculateRelevanceScore(result, article.title);

        if (relevanceScore >= 30) {
          // Read full content using Jina Reader
          const content = await readUrlContent(result.url);

          if (content && content.length > 100) {
            sources.push({
              title: result.title,
              url: result.url,
              content: content,
              relevanceScore,
            });

            console.log(
              `   ✅ Kaynak eklendi: ${result.title.substring(0, 50)}... (skor: ${relevanceScore})`,
            );
          }
        }
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error: any) {
      console.warn(`⚠️ Arama hatası ("${query}"): ${error.message}`);
    }
  }

  // Sort by relevance
  sources.sort((a, b) => b.relevanceScore - a.relevanceScore);

  console.log(`✅ Toplam ${sources.length} kaynak toplandı`);
  await liveLog.research.success(`✅ ${sources.length} kaynak toplandı`);

  return sources;
}

/**
 * Arama için anahtar kelimeleri çıkar
 */
function extractSearchKeywords(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  // Stop words
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "was",
    "are",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "bir",
    "ve",
    "veya",
    "ama",
    "için",
    "ile",
    "olan",
    "bu",
    "şu",
    "o",
    "de",
    "da",
  ]);

  // 🛡️ Ambiguous English words that cause dictionary/irrelevant results
  const ambiguousWords = new Set([
    "sick",
    "hot",
    "cool",
    "fire",
    "dead",
    "wild",
    "mad",
    "bad",
    "lit",
    "cold",
    "fresh",
    "raw",
    "live",
    "sharp",
    "flat",
    "deep",
    "fast",
    "slow",
    "hard",
    "soft",
    "big",
    "small",
    "large",
    "long",
    "short",
    "high",
    "low",
    "open",
    "close",
    "right",
    "wrong",
    "free",
    "lost",
    "still",
    "just",
    "even",
    "well",
    "good",
    "best",
    "better",
    "much",
    "more",
    "most",
    "very",
    "only",
    "also",
    "now",
    "new",
    "old",
    "first",
    "last",
    "next",
    "yet",
    "way",
    "out",
    "off",
    "put",
    "get",
    "got",
    "set",
    "run",
    "let",
    "say",
    "make",
    "take",
    "come",
    "see",
    "look",
    "find",
    "give",
    "tell",
    "may",
    "will",
    "can",
    "could",
    "would",
    "should",
    "might",
    "must",
    "need",
    "want",
    "like",
    "use",
    "try",
    "these",
    "those",
    "some",
    "any",
    "each",
    "every",
    "all",
    "both",
    "few",
    "many",
    "such",
    "than",
    "does",
    "did",
    "its",
    "not",
    "top",
  ]);

  // Extract words (filter stop words AND ambiguous words)
  const words = text
    .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w) && !ambiguousWords.has(w));

  // Prioritize proper nouns and longer words
  const originalWords = `${title} ${description}`.split(/\s+/);
  const properNouns = new Set(
    originalWords
      .filter((w) => /^[A-Z][a-zA-Z]{2,}/.test(w) || /^[A-Z]{2,}/.test(w))
      .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter(
        (w) => w.length > 2 && !stopWords.has(w) && !ambiguousWords.has(w),
      ),
  );

  const sortedWords = words.sort((a, b) => {
    const aIsProper = properNouns.has(a) ? 1 : 0;
    const bIsProper = properNouns.has(b) ? 1 : 0;
    if (bIsProper !== aIsProper) return bIsProper - aIsProper;
    return b.length - a.length;
  });

  return [...new Set(sortedWords)].slice(0, 8).join(" ");
}

/**
 * URL'nin atlanıp atlanmayacağını kontrol et
 */
function shouldSkipUrl(url: string): boolean {
  const skipPatterns = [
    /youtube\.com/i,
    /twitter\.com|x\.com/i,
    /facebook\.com/i,
    /instagram\.com/i,
    /reddit\.com/i,
    /linkedin\.com/i,
    /tiktok\.com/i,
    /pinterest\.com/i,
    /\.pdf$/i,
    /\.zip$/i,
    /\.mp4$/i,
    // 🛡️ Dictionary, reference, and non-news sites
    /merriam-webster\.com/i,
    /dictionary\.com/i,
    /wordreference\.com/i,
    /thefreedictionary\.com/i,
    /cambridge\.org\/dictionary/i,
    /oxfordlearnersdictionaries\.com/i,
    /collinsdictionary\.com/i,
    /urbandictionary\.com/i,
    /wiktionary\.org/i,
    /thesaurus\.com/i,
    /vocabulary\.com/i,
    /definitions\.net/i,
    /wikipedia\.org/i,
    /wikihow\.com/i,
    /quora\.com/i,
    /amazon\.com/i,
  ];

  return skipPatterns.some((pattern) => pattern.test(url));
}

/**
 * Kaynak relevance skorunu hesapla
 */
function calculateRelevanceScore(
  result: BraveSearchResult,
  originalTitle: string,
): number {
  let score = 0;

  const titleLower = originalTitle.toLowerCase();
  const resultTitleLower = result.title.toLowerCase();
  const resultDescLower = (result.description || "").toLowerCase();

  // Title word overlap
  const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);
  for (const word of titleWords) {
    if (resultTitleLower.includes(word)) score += 15;
    if (resultDescLower.includes(word)) score += 5;
  }

  // Recency bonus
  if (result.age) {
    if (result.age.includes("hour")) score += 20;
    else if (result.age.includes("day")) score += 10;
  }

  // Authority domain bonus
  const authorityDomains = [
    "techcrunch.com",
    "theverge.com",
    "wired.com",
    "arstechnica.com",
    "reuters.com",
    "bloomberg.com",
    "bbc.com",
    "cnn.com",
    "engadget.com",
    "zdnet.com",
    "venturebeat.com",
  ];
  if (authorityDomains.some((d) => result.url.includes(d))) {
    score += 15;
  }

  return score;
}

// ============================================
// CONTENT SYNTHESIS - İçerik sentezleme
// ============================================

/**
 * Çoklu kaynaktan içerik sentezle - Türkçe ve İngilizce
 */
export async function synthesizeContent(
  article: NewsArticle,
  sources: Array<{
    title: string;
    url: string;
    content: string;
    relevanceScore: number;
  }>,
  category: string,
): Promise<{
  tr: {
    title: string;
    metaTitle?: string;
    excerpt: string;
    content: string;
    keywords: string[];
    metaDescription: string;
    score: number;
  };
  en: {
    title: string;
    metaTitle?: string;
    excerpt: string;
    content: string;
    keywords: string[];
    metaDescription: string;
  };
}> {
  console.log(`🧠 İçerik sentezleme başlatılıyor...`);
  console.log(`   Kaynak sayısı: ${sources.length}`);

  await liveLog.ai.info(`🧠 İçerik sentezleniyor: ${sources.length} kaynak`);

  // Build sources text
  const sourcesText = sources
    .slice(0, 6) // Max 6 sources to avoid token limit
    .map(
      (s, i) => `
--- KAYNAK ${i + 1}: ${new URL(s.url).hostname} ---
Başlık: ${s.title}
URL: ${s.url}
İçerik:
${s.content.substring(0, 2000)}
`,
    )
    .join("\n");

  // STEP 1: Generate Turkish content
  console.log(`🇹🇷 Türkçe içerik oluşturuluyor...`);

  const trPrompt = `Sen dünya çapında ödüllü bir investigative journalist ve haber editörüsün. 

Görevin: Aşağıdaki ${sources.length} FARKLI KAYNAKTAN toplanan bilgileri SENTEZLEYEREK, KAPSAMLI ve ORİJİNAL bir Türkçe haber makalesi oluştur.

### ORİJİNAL HABER:
Başlık: ${article.title}
Açıklama: ${article.description}
Kaynak URL: ${article.url}

### TOPLANAN KAYNAKLAR:
${sourcesText}

### SENTEZ KURALLARI:

1. **ORİJİNAL İÇERİK OLUŞTUR:**
   - Kaynaklardan bilgileri KOPYALAMA, SENTEZLİYE
   - Her kaynağın benzersiz katkısını içeriğe yansıt
   - Kendi analizini ve yorumunu ekle
   - Piramit tekniği: En önemli bilgi en üstte

2. **KAYNAK ATRİBÜSYONU:**
   - Önemli bilgilerde kaynak belirt: "Reuters'a göre...", "TechCrunch'ın haberine göre..."
   - Çelişen bilgileri karşılaştırmalı sun
   - Tüm kaynakların URL'lerini koruma altına al

3. **PROFESYONEL ÜSLUP:**
   - TV haber sunucusu gibi: Objektif, mesafeli, profesyonel
   - ASLA "Ben", "Biz", "Düşünüyorum" kullanma
   - 3. tekil şahıs anlatım
   - Teknik terimleri sadeleştir

4. **YAPI VE SEO KURALLARI (KRİTİK):**
   - **Başlık (title):** 50-70 karakter. Ana anahtar kelime İLK 5 kelimede. Başlığa yıl (2025, 2026 vb.) EKLEME — sadece haberin konusu doğrudan bir yıla atıfta bulunuyorsa kullan. Başlıkta Çince, Japonca, Korece veya Latin dışı karakterler ASLA kullanma.
   - **Meta Başlık (metaTitle):** 50-60 karakter. Google SERP için optimize. Ana anahtar kelimeyi başa koy.
   - Özet: 2-3 cümle, haberin özü, ana anahtar kelimeyi içermeli
   - İçerik: HTML formatlı (<p>, <h2>, <ul>), minimum 500 kelime
   - Minimum 2 adet <h2> başlık, H2'lerde anahtar kelime geçmeli
   - Paragraflar kısa: max 3-4 cümle
   - İlk paragrafta ana anahtar kelime GEÇMELİ
   - Son paragrafta ana anahtar kelime GEÇMELİ

5. **SEO:**
   - Meta açıklama: 120-155 karakter, CTA fiili ekle ("Keşfet", "Öğren", "İncele")
   - 6-10 anahtar kelime
   - Anahtar kelime yoğunluğu %1-2
   - Anahtar kelimeler: başlık, ilk paragraf, H2'ler ve son paragrafta yer almalı

JSON formatında yanıt ver:
{
  "title": "SEO Uyumlu Türkçe Başlık (50-70 kar)",
  "metaTitle": "Google SERP İçin Kısa Başlık (50-60 kar)",
  "excerpt": "Ana sayfada görünecek 2-3 cümlelik özet",
  "content": "HTML formatlı tam makale metni",
  "keywords": ["anahtar1", "anahtar2", "anahtar3"],
  "metaDescription": "CTA içeren SEO meta açıklama (120-155 kar)",
  "score": 850
}`;

  const trResponse = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Sen dünyanın en iyi Türkçe haber editörüsün. Çoklu kaynakları sentezleyerek kapsamlı, orijinal ve profesyonel haberler üretiyorsun. Sadece geçerli JSON yanıtı ver.",
      },
      {
        role: "user",
        content: trPrompt,
      },
    ],
    {
      model: "deepseek-chat",
      maxTokens: 6000,
      temperature: 0.9,
    },
  );

  const trJsonMatch = trResponse.match(/\{[\s\S]*\}/);
  if (!trJsonMatch) {
    throw new Error("Failed to parse Turkish content response");
  }
  const trContent = JSON.parse(trJsonMatch[0]);

  console.log(`✅ Türkçe içerik oluşturuldu: ${trContent.title}`);

  // STEP 2: Generate English content
  console.log(`🇬🇧 İngilizce içerik oluşturuluyor...`);

  const enPrompt = `You are a world-renowned investigative journalist and news editor.

Your task: Create a comprehensive, original English news article by synthesizing information from ${sources.length} different sources.

### ORIGINAL NEWS:
Title: ${article.title}
Description: ${article.description}

### SOURCES:
${sourcesText}

### SYNTHESIS RULES:

1. **CREATE ORIGINAL CONTENT:**
   - Do NOT copy from sources, SYNTHESIZE
   - Reflect unique contributions from each source
   - Add your own analysis and insights
   - Pyramid technique: Most important info first

2. **SOURCE ATTRIBUTION:**
   - Cite sources for important claims: "According to Reuters...", "TechCrunch reports..."
   - Present conflicting information comparatively

3. **PROFESSIONAL TONE:**
   - Objective, neutral, professional news anchor style
   - NEVER use "I", "We", "In my opinion"
   - Third-person narrative

4. **STRUCTURE & SEO RULES (CRITICAL):**
   - **Title (title):** 50-70 chars. Primary keyword in FIRST 5 words. Include year or number if possible.
   - **Meta Title (metaTitle):** 50-60 chars. Optimized for Google SERP. Primary keyword first.
   - Excerpt: 2-3 sentences, must include primary keyword
   - Content: HTML formatted (<p>, <h2>, <ul>), minimum 500 words
   - Minimum 2 <h2> headings, H2s MUST contain keywords
   - Short paragraphs: max 3-4 sentences each
   - Primary keyword MUST appear in FIRST paragraph
   - Primary keyword MUST appear in LAST paragraph

5. **SEO:**
   - Meta description: 120-155 chars, include CTA verb ("Discover", "Learn", "Explore")
   - 6-10 keywords
   - Keyword density 1-2%
   - Keywords must appear in: title, first paragraph, H2s, last paragraph

Respond in JSON format:
{
  "title": "SEO-Optimized English Title (50-70 chars)",
  "metaTitle": "Short SERP Title (50-60 chars)",
  "excerpt": "2-3 sentence summary for homepage",
  "content": "Full HTML-formatted article",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "metaDescription": "CTA-driven SEO meta description (120-155 chars)"
}`;

  const enResponse = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "You are a world-class English news editor. You synthesize multiple sources into comprehensive, original, professional news articles. Respond only with valid JSON.",
      },
      {
        role: "user",
        content: enPrompt,
      },
    ],
    {
      model: "deepseek-chat",
      maxTokens: 6000,
      temperature: 0.9,
    },
  );

  const enJsonMatch = enResponse.match(/\{[\s\S]*\}/);
  if (!enJsonMatch) {
    throw new Error("Failed to parse English content response");
  }
  const enContent = JSON.parse(enJsonMatch[0]);

  console.log(`✅ İngilizce içerik oluşturuldu: ${enContent.title}`);

  await liveLog.ai.success(`✅ İçerik sentezlendi (TR + EN)`);

  return {
    tr: trContent,
    en: enContent,
  };
}

// ============================================
// MAIN PIPELINE - Ana akış
// ============================================

/**
 * Akıllı haber seçimi ve işleme pipeline'ı
 *
 * 1. Haberleri sırayla kontrol et
 * 2. Duplicate olmayanı bul
 * 3. Derin araştırma yap
 * 4. Çift dilde yayınla
 */
export async function processIntelligentNews(
  articles: NewsArticle[],
  targetCount: number = 3,
  category: string,
  agentLogId?: string,
): Promise<Array<{ id: string; slug: string; language: string }>> {
  console.log(`\n🚀 AKILLI HABER İŞLEME BAŞLATILIYOR`);
  console.log(`   Toplam aday: ${articles.length}`);
  console.log(`   Hedef: ${targetCount} haber`);
  console.log(`   Kategori: ${category}`);

  await liveLog.process.info(
    `🚀 Akıllı haber işleme: ${articles.length} aday → ${targetCount} hedef`,
  );

  const published: Array<{ id: string; slug: string; language: string }> = [];
  let skippedCount = 0;
  let processedCount = 0;

  // Her haber için sırayla işle
  for (const article of articles) {
    if (published.length >= targetCount * 2) {
      // TR + EN = 2x
      console.log(`✅ Hedef sayıya ulaşıldı (${targetCount} haber × 2 dil)`);
      break;
    }

    processedCount++;
    console.log(
      `\n📰 [${processedCount}/${articles.length}] İşleniyor: ${article.title.substring(0, 60)}...`,
    );

    try {
      // STEP 1: Duplicate kontrolü
      const duplicateCheck = await isArticleDuplicate(article);

      if (duplicateCheck.isDuplicate) {
        console.log(`   ⏭️ SKIP: ${duplicateCheck.reason}`);
        skippedCount++;
        continue;
      }

      console.log(`   ✅ Unique! Derin araştırma başlatılıyor...`);

      // STEP 2: Derin araştırma (kaynak toplama)
      const sources = await gatherSources(article, 8);

      if (sources.length < 2) {
        console.log(
          `   ⚠️ Yetersiz kaynak (${sources.length}), fallback moda geçiliyor...`,
        );
        // Fallback: Sadece orijinal makaleyi kullan
        sources.push({
          title: article.title,
          url: article.url,
          content: article.description || "",
          relevanceScore: 100,
        });
      }

      // STEP 3: İçerik sentezleme (Türkçe + İngilizce)
      const synthesized = await synthesizeContent(article, sources, category);

      await upsertGlossaryWithArticleTerms({
        title: synthesized.tr.title,
        excerpt: synthesized.tr.excerpt,
        content: synthesized.tr.content,
        keywords: synthesized.tr.keywords,
        source: "INTELLIGENT_PRE_PUBLISH_AGENT",
      }).catch((error: unknown) => {
        console.error(
          "AI glossary enrichment failed (intelligent pre-publish):",
          error,
        );
      });

      // Generate slug BEFORE image generation (needed for image naming)
      const trSlug = slugify(synthesized.tr.title);

      // STEP 4: Görsel oluştur
      console.log(`🎨 Görsel oluşturuluyor...`);
      const imageUrls = await generateAndUploadImageInternal(
        synthesized.tr.title,
        synthesized.tr.content,
        category,
        trSlug,
      );

      // STEP 5: Türkçe versiyonu yayınla
      console.log(`🇹🇷 Türkçe versiyon yayınlanıyor...`);

      const categoryRecord = await db.category.findUnique({
        where: { slug: category },
      });

      if (!categoryRecord) {
        throw new Error(`Kategori bulunamadı: ${category}`);
      }

      const trArticle = await db.article.create({
        data: {
          title: synthesized.tr.title,
          slug: trSlug,
          excerpt: synthesized.tr.excerpt,
          content: synthesized.tr.content,
          imageUrl: imageUrls.imageUrl,
          imageUrlMedium: imageUrls.imageUrlMedium,
          imageUrlSmall: imageUrls.imageUrlSmall,
          imageUrlThumb: imageUrls.imageUrlThumb,
          sourceUrl: article.url,
          categoryId: categoryRecord.id,
          status: synthesized.tr.score >= 750 ? "PUBLISHED" : "DRAFT",
          score: synthesized.tr.score || 800,
          publishedAt: synthesized.tr.score >= 750 ? new Date() : null,
          metaTitle: synthesized.tr.metaTitle || synthesized.tr.title,
          metaDescription: synthesized.tr.metaDescription,
          keywords: synthesized.tr.keywords,
          topic: article.topic, // NEW: Save topic for future duplicate checks
          agentLogId,
        },
      });

      published.push({
        id: trArticle.id,
        slug: trArticle.slug,
        language: "tr",
      });
      console.log(`   ✅ Türkçe yayınlandı: ${trSlug}`);

      // STEP 6: İngilizce versiyonu ArticleTranslation tablosuna kaydet
      console.log(`🇬🇧 İngilizce çeviri kaydediliyor...`);
      const enSlug = slugify(synthesized.en.title);

      // Önce Türkçe çeviriyi kaydet
      await db.$executeRaw`
        INSERT INTO "ArticleTranslation" (
          id, "articleId", locale, title, slug, excerpt, content, 
          "metaTitle", "metaDescription", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), ${trArticle.id}, 'tr', ${synthesized.tr.title}, 
          ${trSlug}, ${synthesized.tr.excerpt}, ${synthesized.tr.content},
          ${synthesized.tr.metaTitle || synthesized.tr.title}, ${synthesized.tr.metaDescription}, 
          NOW(), NOW()
        )
        ON CONFLICT ("articleId", locale) DO UPDATE SET
          title = EXCLUDED.title,
          slug = EXCLUDED.slug,
          excerpt = EXCLUDED.excerpt,
          content = EXCLUDED.content,
          "metaTitle" = EXCLUDED."metaTitle",
          "metaDescription" = EXCLUDED."metaDescription",
          "updatedAt" = NOW()
      `;

      // Sonra İngilizce çeviriyi kaydet
      await db.$executeRaw`
        INSERT INTO "ArticleTranslation" (
          id, "articleId", locale, title, slug, excerpt, content, 
          "metaTitle", "metaDescription", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), ${trArticle.id}, 'en', ${synthesized.en.title}, 
          ${enSlug}, ${synthesized.en.excerpt}, ${synthesized.en.content},
          ${synthesized.en.metaTitle || synthesized.en.title}, ${synthesized.en.metaDescription}, 
          NOW(), NOW()
        )
        ON CONFLICT ("articleId", locale) DO UPDATE SET
          title = EXCLUDED.title,
          slug = EXCLUDED.slug,
          excerpt = EXCLUDED.excerpt,
          content = EXCLUDED.content,
          "metaTitle" = EXCLUDED."metaTitle",
          "metaDescription" = EXCLUDED."metaDescription",
          "updatedAt" = NOW()
      `;

      console.log(`   ✅ Çeviriler kaydedildi (TR + EN)`);

      try {
        const { notifyEnglishArticle } =
          await import("@/lib/seo/indexing-tracker");
        await notifyEnglishArticle(trArticle.id, enSlug);
        console.log(`   ✅ EN IndexNow/Google bildirimi yapıldı: ${enSlug}`);
      } catch (notifyError: any) {
        console.warn(
          `   ⚠️ EN indexing bildirimi başarısız: ${notifyError?.message || notifyError}`,
        );
      }

      await liveLog.publish.success(
        `✅ Haber yayınlandı: ${synthesized.tr.title.substring(0, 40)}... (TR + EN)`,
      );
    } catch (error: any) {
      console.error(`   ❌ Hata: ${error.message}`);
      await liveLog.error.error(`❌ Haber işleme hatası: ${error.message}`);
      // Continue with next article
    }
  }

  console.log(`\n📊 İŞLEM TAMAMLANDI`);
  console.log(`   Kontrol edilen: ${processedCount}`);
  console.log(`   Atlanan (duplicate): ${skippedCount}`);
  console.log(`   Yayınlanan: ${published.length}`);

  return published;
}

export default {
  isArticleDuplicate,
  gatherSources,
  synthesizeContent,
  processIntelligentNews,
};
