/**
 * Indexing Tracker
 *
 * Haberlerin IndexNow ve Google Indexing API'ye gönderim durumlarını takip eder
 * Hem Türkçe hem İngilizce versiyonları otomatik olarak bildirir
 * Google Indexing API günlük 200 kota limitini akıllıca yönetir
 */

import { db } from "@/lib/db";
import { submitArticleToIndexNow, submitUrlToIndexNow } from "./indexnow";
import { notifyGoogle } from "./google-indexing-api";

// ============================================================
// Google Indexing API Quota Manager
// Günlük 200 limit — TR makalelere öncelik ver, EN için kalan kotayı kullan
// ============================================================
const GOOGLE_DAILY_QUOTA = 200;
const TR_RESERVE_RATIO = 0.6; // %60'ı TR'ye ayır (120 çağrı)

let googleQuotaUsed = 0;
let googleQuotaResetDate = new Date().toDateString();

function resetQuotaIfNewDay(): void {
  const today = new Date().toDateString();
  if (today !== googleQuotaResetDate) {
    console.log(`📊 Google Quota reset: ${googleQuotaUsed}/${GOOGLE_DAILY_QUOTA} used yesterday`);
    googleQuotaUsed = 0;
    googleQuotaResetDate = today;
  }
}

function canUseGoogleQuota(language: "tr" | "en"): boolean {
  resetQuotaIfNewDay();

  const remaining = GOOGLE_DAILY_QUOTA - googleQuotaUsed;
  const trReserve = Math.floor(GOOGLE_DAILY_QUOTA * TR_RESERVE_RATIO);

  if (remaining <= 0) {
    return false; // Kota tamamen doldu
  }

  if (language === "en") {
    // EN makaleler sadece TR reserve'den geriye kalan kotayı kullanabilir
    // Eğer henüz yeterli TR submit yapılmamışsa, EN'e alan bırakılır
    const trUsed = googleQuotaUsed; // approximate — we don't track per-language
    if (remaining <= (trReserve - trUsed) / 2) {
      // Kalan kota azaldıysa EN'i atla — TR'ye öncelik
      return false;
    }
  }

  return true;
}

function recordGoogleQuotaUsage(): void {
  googleQuotaUsed++;
  if (googleQuotaUsed % 20 === 0 || googleQuotaUsed >= GOOGLE_DAILY_QUOTA - 10) {
    console.log(`📊 Google Quota: ${googleQuotaUsed}/${GOOGLE_DAILY_QUOTA} used today (${GOOGLE_DAILY_QUOTA - googleQuotaUsed} remaining)`);
  }
}

export function getGoogleQuotaStatus(): { used: number; remaining: number; limit: number } {
  resetQuotaIfNewDay();
  return {
    used: googleQuotaUsed,
    remaining: GOOGLE_DAILY_QUOTA - googleQuotaUsed,
    limit: GOOGLE_DAILY_QUOTA,
  };
}

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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

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

  // 2. Google Indexing API (Turkish) — kota kontrolü ile
  if (!canUseGoogleQuota("tr")) {
    console.log(`⏭️ Google Indexing API (TR) skipped — daily quota exhausted (${googleQuotaUsed}/${GOOGLE_DAILY_QUOTA}). IndexNow + sitemap will handle indexing.`);
    results.push({
      success: false,
      platform: "Google",
      language: "tr",
      error: "Daily quota exhausted",
    });
  } else {
    try {
      const turkishUrl = `${baseUrl}/news/${slug}`;
      await notifyGoogle(turkishUrl, "URL_UPDATED");
      recordGoogleQuotaUsage();
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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

  // 1. IndexNow (English) - Use /en/news/ prefix for English articles
  try {
    const englishUrl = `${baseUrl}/en/news/${slugEn}`;
    await submitUrlToIndexNow(englishUrl);
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

  // 2. Google Indexing API (English) — kota kontrolü ile (EN daha düşük öncelik)
  if (!canUseGoogleQuota("en")) {
    console.log(`⏭️ Google Indexing API (EN) skipped — quota reserved for TR articles (${googleQuotaUsed}/${GOOGLE_DAILY_QUOTA}). IndexNow + sitemap will handle indexing.`);
    results.push({
      success: false,
      platform: "Google",
      language: "en",
      error: "Quota reserved for TR priority",
    });
  } else {
    try {
      const englishGoogleUrl = `${baseUrl}/en/news/${slugEn}`;
      await notifyGoogle(englishGoogleUrl, "URL_UPDATED");
      recordGoogleQuotaUsage();
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
