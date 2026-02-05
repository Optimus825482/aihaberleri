/**
 * Indexing Tracker
 *
 * Haberlerin IndexNow ve Google Indexing API'ye gönderim durumlarını takip eder
 * Hem Türkçe hem İngilizce versiyonları otomatik olarak bildirir
 */

import { db } from "@/lib/db";
import { submitArticleToIndexNow } from "./indexnow";
import { notifyNewsToGoogle } from "./google-indexing-api";

interface IndexingResult {
  success: boolean;
  platform: string;
  language: "tr" | "en";
  error?: string;
}

/**
 * Türkçe haber için tüm platformlara bildirim gönder
 */
export async function notifyTurkishArticle(
  articleId: string,
  slug: string,
): Promise<IndexingResult[]> {
  const results: IndexingResult[] = [];

  // 1. IndexNow (Turkish)
  try {
    await submitArticleToIndexNow(slug, articleId);
    await db.article.update({
      where: { id: articleId },
      data: {
        indexNowStatus: "SUBMITTED",
        indexedAt: new Date(),
      },
    });
    results.push({
      success: true,
      platform: "IndexNow",
      language: "tr",
    });
    console.log(`✅ IndexNow (TR): ${slug}`);
  } catch (error: any) {
    await db.article.update({
      where: { id: articleId },
      data: { indexNowStatus: "FAILED" },
    });
    results.push({
      success: false,
      platform: "IndexNow",
      language: "tr",
      error: error.message,
    });
    console.error(`❌ IndexNow (TR) failed: ${slug}`, error);
  }

  // 2. Google Indexing API (Turkish)
  try {
    await notifyNewsToGoogle(slug);
    await db.article.update({
      where: { id: articleId },
      data: {
        googleIndexStatus: "SUBMITTED",
        googleIndexedAt: new Date(),
      },
    });
    results.push({
      success: true,
      platform: "Google",
      language: "tr",
    });
    console.log(`✅ Google Indexing API (TR): ${slug}`);
  } catch (error: any) {
    await db.article.update({
      where: { id: articleId },
      data: { googleIndexStatus: "FAILED" },
    });
    results.push({
      success: false,
      platform: "Google",
      language: "tr",
      error: error.message,
    });
    console.error(`❌ Google Indexing API (TR) failed: ${slug}`, error);
  }

  return results;
}

/**
 * İngilizce haber için tüm platformlara bildirim gönder
 */
export async function notifyEnglishArticle(
  articleId: string,
  slugEn: string,
): Promise<IndexingResult[]> {
  const results: IndexingResult[] = [];

  // 1. IndexNow (English)
  try {
    await submitArticleToIndexNow(slugEn, articleId);
    await db.article.update({
      where: { id: articleId },
      data: {
        indexNowStatusEn: "SUBMITTED",
        indexedAtEn: new Date(),
      },
    });
    results.push({
      success: true,
      platform: "IndexNow",
      language: "en",
    });
    console.log(`✅ IndexNow (EN): ${slugEn}`);
  } catch (error: any) {
    await db.article.update({
      where: { id: articleId },
      data: { indexNowStatusEn: "FAILED" },
    });
    results.push({
      success: false,
      platform: "IndexNow",
      language: "en",
      error: error.message,
    });
    console.error(`❌ IndexNow (EN) failed: ${slugEn}`, error);
  }

  // 2. Google Indexing API (English)
  try {
    await notifyNewsToGoogle(slugEn);
    await db.article.update({
      where: { id: articleId },
      data: {
        googleIndexStatusEn: "SUBMITTED",
        googleIndexedAtEn: new Date(),
      },
    });
    results.push({
      success: true,
      platform: "Google",
      language: "en",
    });
    console.log(`✅ Google Indexing API (EN): ${slugEn}`);
  } catch (error: any) {
    await db.article.update({
      where: { id: articleId },
      data: { googleIndexStatusEn: "FAILED" },
    });
    results.push({
      success: false,
      platform: "Google",
      language: "en",
      error: error.message,
    });
    console.error(`❌ Google Indexing API (EN) failed: ${slugEn}`, error);
  }

  return results;
}

/**
 * Hem Türkçe hem İngilizce versiyonları bildir
 */
export async function notifyBothLanguages(
  articleId: string,
  slugTr: string,
  slugEn?: string,
): Promise<{
  turkish: IndexingResult[];
  english: IndexingResult[];
}> {
  const results = {
    turkish: [] as IndexingResult[],
    english: [] as IndexingResult[],
  };

  // Turkish notification
  results.turkish = await notifyTurkishArticle(articleId, slugTr);

  // English notification (if translation exists)
  if (slugEn) {
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
    results.english = await notifyEnglishArticle(articleId, slugEn);
  }

  return results;
}

/**
 * Çeviri tamamlandığında İngilizce versiyonu bildir
 */
export async function notifyAfterTranslation(
  articleId: string,
): Promise<IndexingResult[]> {
  try {
    // Get article with English translation
    const article = await db.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        slug: true,
        translations: {
          where: { locale: "en" },
          select: { slug: true },
        },
      },
    });

    if (!article) {
      throw new Error("Article not found");
    }

    const englishTranslation = article.translations[0];
    if (!englishTranslation) {
      console.log(`⚠️ No English translation found for article ${articleId}`);
      return [];
    }

    console.log(`🌍 Notifying English version: ${englishTranslation.slug}`);
    return await notifyEnglishArticle(articleId, englishTranslation.slug);
  } catch (error) {
    console.error("Error notifying after translation:", error);
    return [];
  }
}

/**
 * Tüm pending haberleri bildir (bulk operation)
 */
export async function notifyAllPending(
  language: "tr" | "en" | "both" = "both",
): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const stats = {
    processed: 0,
    successful: 0,
    failed: 0,
  };

  try {
    // Get pending articles
    const where: any = {
      status: "PUBLISHED",
      publishedAt: { not: null },
    };

    if (language === "tr") {
      where.OR = [
        { indexNowStatus: "PENDING" },
        { googleIndexStatus: "PENDING" },
      ];
    } else if (language === "en") {
      where.OR = [
        { indexNowStatusEn: "PENDING" },
        { googleIndexStatusEn: "PENDING" },
      ];
    } else {
      // both
      where.OR = [
        { indexNowStatus: "PENDING" },
        { googleIndexStatus: "PENDING" },
        { indexNowStatusEn: "PENDING" },
        { googleIndexStatusEn: "PENDING" },
      ];
    }

    const articles = await db.article.findMany({
      where,
      select: {
        id: true,
        slug: true,
        translations: {
          where: { locale: "en" },
          select: { slug: true },
        },
      },
      take: 100, // Process in batches
    });

    console.log(`📊 Found ${articles.length} pending articles`);

    for (const article of articles) {
      stats.processed++;

      if (language === "tr" || language === "both") {
        const trResults = await notifyTurkishArticle(article.id, article.slug);
        if (trResults.every((r) => r.success)) {
          stats.successful++;
        } else {
          stats.failed++;
        }
      }

      if (language === "en" || language === "both") {
        const enSlug = article.translations[0]?.slug;
        if (enSlug) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const enResults = await notifyEnglishArticle(article.id, enSlug);
          if (enResults.every((r) => r.success)) {
            stats.successful++;
          } else {
            stats.failed++;
          }
        }
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log(`✅ Bulk notification complete:`, stats);
    return stats;
  } catch (error) {
    console.error("Error in bulk notification:", error);
    return stats;
  }
}
