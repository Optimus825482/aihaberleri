/**
 * Topic Extraction Service
 *
 * Haber başlıklarından kısa ve açıklayıcı topic'ler çıkarır
 * DeepSeek API kullanarak akıllı kategorilendirme yapar
 */

import { callDeepSeek } from "@/lib/deepseek";
import { db } from "@/lib/db";

/**
 * AI Keywords for quick relevance check
 * Used to filter out non-AI news before expensive API calls
 */
const AI_KEYWORDS = [
  // Core AI Terms
  "artificial intelligence",
  "yapay zeka",
  " ai ",
  "a.i.",
  "machine learning",
  "deep learning",
  "neural network",
  // AI Models & Products
  "gpt",
  "chatgpt",
  "openai",
  "gemini",
  "claude",
  "anthropic",
  "llama",
  "mistral",
  "deepseek",
  "copilot",
  "bard",
  "dall-e",
  "midjourney",
  "stable diffusion",
  "sora",
  "grok",
  // AI Techniques
  "nlp",
  "natural language",
  "computer vision",
  "transformer",
  "language model",
  "generative ai",
  "llm",
  "large language model",
  // AI Companies
  "nvidia",
  "hugging face",
  "cohere",
  "perplexity",
  "stability ai",
  "meta ai",
  "google ai",
  "microsoft ai",
  "amazon ai",
  "xai",
  // Tech keywords
  "robot",
  "automation",
  "autonomous",
  "algorithm",
  "data science",
  "tech",
  "software",
  "startup",
  "silicon valley",
  "chip",
  "gpu",
  "semiconductor",
  "quantum",
  "blockchain",
  "crypto",
  "web3",
];

/**
 * Quick AI relevance check using keywords
 * Returns true if article appears to be AI/tech related
 */
function isAIRelevant(title: string, description?: string): boolean {
  const text = `${title} ${description || ""}`.toLowerCase();
  return AI_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

export interface ArticleWithTopic {
  id?: string;
  title: string;
  description?: string;
  topic?: string;
  trendScore?: number;
  [key: string]: any;
}

/**
 * Tek bir haber başlığından topic çıkar
 */
export async function extractTopic(title: string): Promise<string> {
  try {
    const prompt = `Sen bir haber kategorilendirme uzmanısın.

Görevin: Aşağıdaki haber başlığından KISA ve AÇIKLAYICI bir topic (konu) çıkar.

KURALLAR:
1. Topic 2-4 kelime olmalı (snake_case formatında)
2. Ana entity'leri içermeli (şirket, ürün, kişi)
3. Ana aksiyonu içermeli (investment, ban, release, partnership, launch, acquisition)
4. Türkçe karaktersiz, küçük harf, alt çizgi ile ayrılmış
5. Genel değil, SPESIFIK ol

ÖRNEKLER:
- "Nvidia CEO'su OpenAI'a 100 Milyar Dolar Yatırım Yapacak" → nvidia_openai_investment
- "Endonezya Grok Yapay Zekasına Yasağı Kaldırdı" → indonesia_grok_ban
- "Google Gemini 2.0 Tanıtıldı" → google_gemini_release
- "Tesla Autopilot Güvenlik Sorunları" → tesla_autopilot_safety
- "Microsoft Copilot Yeni Özellikler" → microsoft_copilot_features

BAŞLIK: "${title}"

SADECE TOPIC'İ YANIT VER (örnek: nvidia_openai_investment)`;

    const response = await callDeepSeek(
      [
        {
          role: "system",
          content:
            "Sen bir haber kategorilendirme uzmanısın. Sadece topic yanıtı ver, başka hiçbir şey yazma.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        model: "deepseek-chat",
        maxTokens: 50,
        temperature: 0.3, // Düşük temperature = daha tutarlı sonuçlar
      },
    );

    // Clean up response (remove quotes, whitespace, etc.)
    let topic = response
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    // Fallback: Eğer topic çok kısa veya çok uzunsa, basit extraction yap
    if (topic.length < 5 || topic.length > 50) {
      console.warn(
        `⚠️  Invalid topic from DeepSeek: "${topic}", using fallback`,
      );
      topic = generateFallbackTopic(title);
    }

    return topic;
  } catch (error) {
    console.error("❌ Topic extraction error:", error);
    // Fallback: Basit topic generation
    return generateFallbackTopic(title);
  }
}

/**
 * Fallback topic generation (DeepSeek başarısız olursa)
 */
function generateFallbackTopic(title: string): string {
  // Extract first 3-4 meaningful words
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);

  return words.join("_") || "unknown_topic";
}

/**
 * Batch processing: Birden fazla haberin topic'ini çıkar
 */
export async function extractTopicsBatch(
  articles: ArticleWithTopic[],
  batchSize: number = 4,
): Promise<ArticleWithTopic[]> {
  console.log(`🧠 Topic extraction başlatılıyor: ${articles.length} haber`);

  const results: ArticleWithTopic[] = [];

  // Batch'lere böl
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    console.log(
      `📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)} işleniyor (${batch.length} haber)...`,
    );

    // Paralel olarak topic'leri çıkar
    const topicPromises = batch.map((article) => extractTopic(article.title));
    const topics = await Promise.all(topicPromises);

    // Her habere topic'ini ekle
    batch.forEach((article, index) => {
      results.push({
        ...article,
        topic: topics[index],
      });
      console.log(
        `   ✅ ${article.title.substring(0, 50)}... → ${topics[index]}`,
      );
    });

    // Rate limit protection (500ms bekleme)
    if (i + batchSize < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`✅ Topic extraction tamamlandı: ${results.length} haber`);
  return results;
}

/**
 * Topic'lere göre haberleri grupla
 */
export function groupByTopic(
  articles: ArticleWithTopic[],
): Record<string, ArticleWithTopic[]> {
  const groups: Record<string, ArticleWithTopic[]> = {};

  for (const article of articles) {
    const topic = article.topic || "unknown";
    if (!groups[topic]) {
      groups[topic] = [];
    }
    groups[topic].push(article);
  }

  return groups;
}

/**
 * Topic bazlı duplicate kontrolü
 */
export async function checkTopicDuplicate(
  topic: string,
  timeWindowDays: number = 2, // 7 günden 2 güne düşürüldü
): Promise<{
  isDuplicate: boolean;
  existingArticle?: { id: string; title: string; publishedAt: Date | null };
}> {
  try {
    const whereClause: any = {
      topic: topic,
      publishedAt: {
        gte: new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000),
      },
      status: "PUBLISHED",
    };

    const existingArticle = await db.article.findFirst({
      where: whereClause,
      select: {
        id: true,
        title: true,
        publishedAt: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    if (existingArticle) {
      return {
        isDuplicate: true,
        existingArticle,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error("❌ Topic duplicate check error:", error);
    // Fail-open: Eğer hata olursa, duplicate değil kabul et
    return { isDuplicate: false };
  }
}

/**
 * Akıllı haber seçimi: Topic bazlı duplicate kontrolü ile
 */
export async function selectUniqueTopicArticles(
  articles: ArticleWithTopic[],
  targetCount: number = 5,
  timeWindowDays: number = 2, // 7 günden 2 güne düşürüldü
): Promise<ArticleWithTopic[]> {
  console.log(`\n🎯 Akıllı haber seçimi başlatılıyor...`);
  console.log(`   Aday sayısı: ${articles.length}`);
  console.log(`   Hedef: ${targetCount} unique topic`);
  console.log(`   Zaman penceresi: ${timeWindowDays} gün`);

  // Puana göre sırala (en yüksek önce)
  const sortedArticles = [...articles].sort(
    (a, b) => (b.trendScore || 0) - (a.trendScore || 0),
  );

  const selected: ArticleWithTopic[] = [];
  const seenTopics = new Set<string>();
  let skippedSameTopic = 0;
  let skippedDuplicate = 0;
  let skippedNotAI = 0;

  for (const article of sortedArticles) {
    if (selected.length >= targetCount) {
      console.log(`✅ Hedef sayıya ulaşıldı (${targetCount} haber)`);
      break;
    }

    const topic = article.topic || "unknown";

    // NEW: Quick AI relevance check BEFORE expensive duplicate checks
    if (!isAIRelevant(article.title, article.description)) {
      console.log(
        `   ⏭️  SKIP (not AI-related): "${article.title.substring(0, 50)}..."`,
      );
      skippedNotAI++;
      continue;
    }

    // Bu topic'i daha önce seçtik mi?
    if (seenTopics.has(topic)) {
      console.log(
        `   ⏭️  SKIP (topic already selected): ${topic} - "${article.title.substring(0, 50)}..."`,
      );
      skippedSameTopic++;
      continue;
    }

    // Veritabanında bu topic var mı?
    const duplicateCheck = await checkTopicDuplicate(topic, timeWindowDays);
    if (duplicateCheck.isDuplicate) {
      console.log(
        `   ⏭️  SKIP (topic in database): ${topic} - "${article.title.substring(0, 50)}..."`,
      );
      console.log(
        `      Existing: "${duplicateCheck.existingArticle?.title.substring(0, 50)}..." (${duplicateCheck.existingArticle?.publishedAt?.toLocaleDateString() || "N/A"})`,
      );
      skippedDuplicate++;
      continue;
    }

    // NEW: URL-based duplicate check (prevents URL duplicates even with different topics)
    if (article.url) {
      const urlWithoutParams = article.url.split("?")[0]; // Ignore query parameters
      const existingByUrl = await db.article.findFirst({
        where: {
          OR: [
            { sourceUrl: article.url },
            { sourceUrl: { startsWith: urlWithoutParams } },
          ],
        },
        select: {
          id: true,
          title: true,
          publishedAt: true,
          sourceUrl: true,
        },
      });

      if (existingByUrl) {
        console.log(
          `   ⏭️  SKIP (URL in database): ${article.url.substring(0, 60)}...`,
        );
        console.log(
          `      Existing: "${existingByUrl.title.substring(0, 50)}..." (${existingByUrl.publishedAt?.toLocaleDateString() || "N/A"})`,
        );
        skippedDuplicate++;
        continue;
      }
    }

    // ✅ Unique topic! Seç
    selected.push(article);
    seenTopics.add(topic);
    console.log(
      `   ✅ SELECTED [${selected.length}/${targetCount}]: ${topic} (score: ${article.trendScore || 0})`,
    );
    console.log(`      "${article.title.substring(0, 60)}...")`);
  }

  console.log(`\n📊 Seçim özeti:`);
  console.log(`   Seçilen: ${selected.length}`);
  console.log(`   Atlanan (AI değil): ${skippedNotAI}`);
  console.log(`   Atlanan (aynı topic): ${skippedSameTopic}`);
  console.log(`   Atlanan (duplicate): ${skippedDuplicate}`);
  console.log(`   Toplam işlenen: ${sortedArticles.length}`);

  return selected;
}

/**
 * Background job: Mevcut haberlerin topic'lerini çıkar
 */
export async function extractTopicsForExistingArticles(
  limit: number = 100,
): Promise<{ processed: number; failed: number }> {
  console.log(
    `🔄 Mevcut haberler için topic extraction başlatılıyor (limit: ${limit})...`,
  );

  const whereClause: any = {
    topic: null,
    status: "PUBLISHED",
  };

  const articles = await db.article.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
    },
    take: limit,
    orderBy: {
      publishedAt: "desc",
    },
  });

  console.log(`📰 ${articles.length} haber bulundu`);

  let processed = 0;
  let failed = 0;

  // 4'er batch'te işle
  for (let i = 0; i < articles.length; i += 4) {
    const batch = articles.slice(i, i + 4);

    for (const article of batch) {
      try {
        const topic = await extractTopic(article.title);
        const updateData: any = { topic: topic };
        await db.article.update({
          where: { id: article.id },
          data: updateData,
        });
        processed++;
        console.log(
          `   ✅ [${processed}/${articles.length}] ${article.title.substring(0, 50)}... → ${topic}`,
        );
      } catch (error) {
        failed++;
        console.error(
          `   ❌ [${processed + failed}/${articles.length}] Failed:`,
          error,
        );
      }
    }

    // Rate limit protection
    if (i + 4 < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`\n✅ Topic extraction tamamlandı:`);
  console.log(`   Başarılı: ${processed}`);
  console.log(`   Başarısız: ${failed}`);

  return { processed, failed };
}

export default {
  extractTopic,
  extractTopicsBatch,
  groupByTopic,
  checkTopicDuplicate,
  selectUniqueTopicArticles,
  extractTopicsForExistingArticles,
};

/**
 * Extract entities from title (for duplicate detection)
 */
function extractEntities(title: string): string[] {
  const entities: string[] = [];
  const lowerTitle = title.toLowerCase();

  // Common tech entities
  const techEntities = [
    "openai",
    "nvidia",
    "google",
    "meta",
    "microsoft",
    "apple",
    "amazon",
    "tesla",
    "anthropic",
    "deepmind",
    "facebook",
    "instagram",
    "twitter",
    "x",
    "tiktok",
    "youtube",
    "chatgpt",
    "gemini",
    "claude",
    "grok",
    "copilot",
    "waymo",
    "uber",
    "lyft",
    "spacex",
    "neuralink",
  ];

  for (const entity of techEntities) {
    if (lowerTitle.includes(entity)) {
      entities.push(entity);
    }
  }

  return entities;
}

/**
 * Extract keywords from title (for similarity check)
 * ENHANCED: Includes AI-specific short keywords
 */
function extractKeywords(title: string): string[] {
  const stopWords = [
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
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "s",
  ];

  // AI-specific keywords (even if short)
  const aiKeywords = ["ai", "ml", "gpt", "llm", "api"];

  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => {
      // Include AI keywords even if short
      if (aiKeywords.includes(word)) return true;
      // Otherwise, filter by length and stopwords
      return word.length > 2 && !stopWords.includes(word);
    });

  return words;
}

/**
 * NEW: Early duplicate filtering by topic, URL, entities, and keywords
 * Filters out articles that already exist in database (last N days)
 * AND filters duplicates within the same batch (cross-article comparison)
 * This should be called BEFORE expensive operations (Brave API, scoring, etc.)
 */
export async function filterDuplicatesByTopicAndUrl(
  articles: ArticleWithTopic[],
  timeWindowDays: number = 2,
): Promise<ArticleWithTopic[]> {
  console.log(`\n🔍 Early duplicate filtering başlatılıyor...`);
  console.log(`   Input: ${articles.length} haber`);
  console.log(`   Time window: ${timeWindowDays} gün`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeWindowDays);

  const unique: ArticleWithTopic[] = [];
  let duplicateCount = 0;

  // Fetch recent articles from database ONCE (for performance)
  const recentArticles = await db.article.findMany({
    where: {
      publishedAt: { gte: cutoffDate },
    },
    select: {
      id: true,
      title: true,
      topic: true,
      sourceUrl: true,
      publishedAt: true,
    },
    take: 100, // Check last 100 articles
  });

  console.log(
    `   📚 Checking against ${recentArticles.length} recent articles in database`,
  );

  for (const article of articles) {
    let isDuplicate = false;

    // 1. Topic-based check (database)
    if (article.topic) {
      const existingByTopic = recentArticles.find(
        (a) => a.topic === article.topic,
      );

      if (existingByTopic) {
        console.log(
          `   ⏭️  SKIP (topic duplicate in DB): ${article.topic} - "${article.title.substring(0, 50)}..."`,
        );
        duplicateCount++;
        isDuplicate = true;
        continue;
      }

      // 🆕 CRITICAL: Check topic against ALREADY SELECTED articles in this batch
      const batchDuplicate = unique.find((u) => u.topic === article.topic);
      if (batchDuplicate) {
        console.log(
          `   ⏭️  SKIP (topic duplicate in BATCH): ${article.topic} - "${article.title.substring(0, 50)}..."`,
        );
        console.log(
          `      Already selected: "${batchDuplicate.title.substring(0, 50)}..."`,
        );
        duplicateCount++;
        isDuplicate = true;
        continue;
      }
    }

    // 2. URL-based check (database)
    if (!isDuplicate && article.url) {
      const urlWithoutParams = article.url.split("?")[0];
      const existingByUrl = recentArticles.find(
        (a) =>
          a.sourceUrl === article.url ||
          a.sourceUrl?.startsWith(urlWithoutParams),
      );

      if (existingByUrl) {
        console.log(
          `   ⏭️  SKIP (URL duplicate in DB): ${article.url.substring(0, 60)}...`,
        );
        duplicateCount++;
        isDuplicate = true;
        continue;
      }

      // 🆕 CRITICAL: Check URL against ALREADY SELECTED articles in this batch
      const batchUrlDuplicate = unique.find(
        (u) => u.url === article.url || u.url?.startsWith(urlWithoutParams),
      );
      if (batchUrlDuplicate) {
        console.log(
          `   ⏭️  SKIP (URL duplicate in BATCH): ${article.url.substring(0, 60)}...`,
        );
        duplicateCount++;
        isDuplicate = true;
        continue;
      }
    }

    // 3. 🆕 CRITICAL: Entity+keyword check (database AND batch)
    if (!isDuplicate) {
      const entities = extractEntities(article.title);
      if (entities.length >= 1) {
        // At least 1 entity for matching

        // Check against DATABASE articles
        for (const existing of recentArticles) {
          const existingEntities = extractEntities(existing.title);
          const commonEntities = entities.filter((e) =>
            existingEntities.includes(e),
          );

          // If 1+ common entities, check keyword similarity
          if (commonEntities.length >= 1) {
            const keywords = extractKeywords(article.title);
            const existingKeywords = extractKeywords(existing.title);
            const commonKeywords = keywords.filter((k) =>
              existingKeywords.includes(k),
            );
            const similarity =
              commonKeywords.length / Math.max(keywords.length, 1);

            // If 30%+ keyword similarity with same entities = duplicate
            if (similarity >= 0.3) {
              console.log(
                `   ⏭️  SKIP (entity+keyword duplicate in DB): [${commonEntities.join(", ")}] + ${(similarity * 100).toFixed(0)}% similarity`,
              );
              console.log(`      New: "${article.title.substring(0, 50)}..."`);
              console.log(
                `      Existing: "${existing.title.substring(0, 50)}..." (${existing.publishedAt?.toLocaleDateString()})`,
              );
              duplicateCount++;
              isDuplicate = true;
              break;
            }
          }
        }

        // 🆕 CRITICAL: Check against ALREADY SELECTED articles in this batch
        if (!isDuplicate) {
          for (const selected of unique) {
            const selectedEntities = extractEntities(selected.title);
            const commonEntities = entities.filter((e) =>
              selectedEntities.includes(e),
            );

            // If 2+ common entities, check keyword similarity
            if (commonEntities.length >= 1) {
              const keywords = extractKeywords(article.title);
              const selectedKeywords = extractKeywords(selected.title);
              const commonKeywords = keywords.filter((k) =>
                selectedKeywords.includes(k),
              );
              const similarity =
                commonKeywords.length / Math.max(keywords.length, 1);

              // If 30%+ keyword similarity with same entities = duplicate
              if (similarity >= 0.3) {
                console.log(
                  `   ⏭️  SKIP (entity+keyword duplicate in BATCH): [${commonEntities.join(", ")}] + ${(similarity * 100).toFixed(0)}% similarity`,
                );
                console.log(
                  `      New: "${article.title.substring(0, 50)}..."`,
                );
                console.log(
                  `      Already selected: "${selected.title.substring(0, 50)}..."`,
                );
                duplicateCount++;
                isDuplicate = true;
                break;
              }
            }
          }
        }

        if (isDuplicate) continue;
      }
    }

    // ✅ Unique!
    unique.push(article);
  }

  console.log(`\n📊 Early filtering özeti:`);
  console.log(`   Input: ${articles.length} haber`);
  console.log(`   Duplicate: ${duplicateCount} haber`);
  console.log(`   Unique: ${unique.length} haber`);
  console.log(
    `   Duplicate rate: ${((duplicateCount / articles.length) * 100).toFixed(1)}%`,
  );

  return unique;
}
