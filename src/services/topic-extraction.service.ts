/**
 * Topic Extraction Service
 *
 * Haber başlıklarından kısa ve açıklayıcı topic'ler çıkarır
 * DeepSeek API kullanarak akıllı kategorilendirme yapar
 */

import { callDeepSeek } from "@/lib/deepseek";
import { db } from "@/lib/db";

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

  for (const article of sortedArticles) {
    if (selected.length >= targetCount) {
      console.log(`✅ Hedef sayıya ulaşıldı (${targetCount} haber)`);
      break;
    }

    const topic = article.topic || "unknown";

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
