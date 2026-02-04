/**
 * AGGRESSIVE INDEXING SYSTEM
 *
 * Her makale yayınlandığında TÜM arama motorlarına ANINDA bildirim gönderir.
 *
 * Kullanılan Yöntemler:
 * 1. IndexNow API (Bing, Yandex) - ANINDA
 * 2. Google Search Console API - ANINDA
 * 3. WebSub/PubSubHubbub - RSS feed bildirimi
 * 4. Sitemap Ping - Legacy fallback
 * 5. Cloudflare Cache Purge - CDN güncellemesi
 */

import { submitArticleToIndexNow, pingSitemaps } from "./indexnow";

interface IndexingResult {
  indexNow: boolean;
  googleSearchConsole: boolean;
  webSub: boolean;
  sitemapPing: boolean;
  cloudflarePurge: boolean;
  timestamp: Date;
}

/**
 * Google Search Console API ile URL'i indexing kuyruğuna ekle
 * https://developers.google.com/search/apis/indexing-api/v3/quickstart
 */
async function submitToGoogleSearchConsole(url: string): Promise<boolean> {
  try {
    // Google Search Console API key kontrolü
    const apiKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
    if (!apiKey) {
      console.log("⚠️ Google Search Console API key bulunamadı");
      return false;
    }

    const response = await fetch(
      "https://indexing.googleapis.com/v3/urlNotifications:publish",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          type: "URL_UPDATED",
        }),
      },
    );

    if (response.ok) {
      console.log(`✅ Google Search Console: URL submitted - ${url}`);
      return true;
    } else {
      const error = await response.text();
      console.warn(`⚠️ Google Search Console failed: ${error}`);
      return false;
    }
  } catch (error) {
    console.error("❌ Google Search Console error:", error);
    return false;
  }
}

/**
 * Cloudflare Cache Purge - CDN'deki cache'i temizle
 */
async function purgeCloudflareCache(urls: string[]): Promise<boolean> {
  try {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
      console.log("⚠️ Cloudflare credentials bulunamadı");
      return false;
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          files: urls,
        }),
      },
    );

    if (response.ok) {
      console.log(`✅ Cloudflare: ${urls.length} URL cache purged`);
      return true;
    } else {
      const error = await response.text();
      console.warn(`⚠️ Cloudflare purge failed: ${error}`);
      return false;
    }
  } catch (error) {
    console.error("❌ Cloudflare purge error:", error);
    return false;
  }
}

/**
 * WebSub/PubSubHubbub - RSS feed güncellemesini bildir
 */
async function notifyWebSub(feedUrl: string): Promise<boolean> {
  try {
    const hubs = [
      "https://pubsubhubbub.appspot.com/",
      "https://pubsubhubbub.superfeedr.com/",
    ];

    const results = await Promise.allSettled(
      hubs.map(async (hub) => {
        const formData = new URLSearchParams();
        formData.append("hub.mode", "publish");
        formData.append("hub.url", feedUrl);

        const response = await fetch(hub, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        return response.ok || response.status === 204;
      }),
    );

    const success = results.some(
      (r) => r.status === "fulfilled" && r.value === true,
    );

    if (success) {
      console.log("✅ WebSub: Feed update notified");
    }

    return success;
  } catch (error) {
    console.error("❌ WebSub notification error:", error);
    return false;
  }
}

/**
 * AGGRESSIVE INDEXING - Her makale için TÜM yöntemleri kullan
 */
export async function aggressivelyIndexArticle(
  slug: string,
  articleId?: string,
): Promise<IndexingResult> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  const articleUrl = `${baseUrl}/news/${slug}`;
  const feedUrl = `${baseUrl}/feed.xml`;
  const newsSitemapUrl = `${baseUrl}/news-sitemap.xml`;

  console.log(`🚀 AGGRESSIVE INDEXING başlatıldı: ${slug}`);

  const result: IndexingResult = {
    indexNow: false,
    googleSearchConsole: false,
    webSub: false,
    sitemapPing: false,
    cloudflarePurge: false,
    timestamp: new Date(),
  };

  // Tüm yöntemleri PARALEL çalıştır (hız için)
  const [
    indexNowResult,
    googleResult,
    webSubResult,
    sitemapResult,
    cloudflareResult,
  ] = await Promise.allSettled([
    // 1. IndexNow (Bing, Yandex)
    submitArticleToIndexNow(slug, articleId),

    // 2. Google Search Console
    submitToGoogleSearchConsole(articleUrl),

    // 3. WebSub (RSS feed)
    notifyWebSub(feedUrl),

    // 4. Sitemap Ping
    pingSitemaps(),

    // 5. Cloudflare Cache Purge
    purgeCloudflareCache([
      articleUrl,
      `${baseUrl}/`,
      feedUrl,
      newsSitemapUrl,
      `${baseUrl}/sitemap.xml`,
    ]),
  ]);

  // Sonuçları kaydet
  result.indexNow =
    indexNowResult.status === "fulfilled" && indexNowResult.value === true;
  result.googleSearchConsole =
    googleResult.status === "fulfilled" && googleResult.value === true;
  result.webSub =
    webSubResult.status === "fulfilled" && webSubResult.value === true;
  result.sitemapPing =
    sitemapResult.status === "fulfilled" &&
    Object.values(sitemapResult.value).some((v) => v === true);
  result.cloudflarePurge =
    cloudflareResult.status === "fulfilled" && cloudflareResult.value === true;

  // Özet log
  const successCount = Object.values(result).filter(
    (v) => typeof v === "boolean" && v === true,
  ).length;

  console.log(`📊 AGGRESSIVE INDEXING tamamlandı: ${successCount}/5 başarılı`);
  console.log(`   - IndexNow: ${result.indexNow ? "✅" : "❌"}`);
  console.log(
    `   - Google Search Console: ${result.googleSearchConsole ? "✅" : "❌"}`,
  );
  console.log(`   - WebSub: ${result.webSub ? "✅" : "❌"}`);
  console.log(`   - Sitemap Ping: ${result.sitemapPing ? "✅" : "❌"}`);
  console.log(`   - Cloudflare Purge: ${result.cloudflarePurge ? "✅" : "❌"}`);

  return result;
}

/**
 * Toplu makale indexing (batch)
 */
export async function aggressivelyIndexMultipleArticles(
  articles: Array<{ slug: string; id?: string }>,
): Promise<IndexingResult[]> {
  console.log(
    `🚀 BATCH AGGRESSIVE INDEXING: ${articles.length} makale işleniyor...`,
  );

  const results = await Promise.all(
    articles.map((article) =>
      aggressivelyIndexArticle(article.slug, article.id),
    ),
  );

  const totalSuccess = results.reduce((sum, result) => {
    const count = Object.values(result).filter(
      (v) => typeof v === "boolean" && v === true,
    ).length;
    return sum + count;
  }, 0);

  console.log(
    `✅ BATCH INDEXING tamamlandı: ${totalSuccess}/${articles.length * 5} toplam başarı`,
  );

  return results;
}

/**
 * Periyodik olarak tüm pending article'ları agresif şekilde index et
 * Cron job veya scheduler tarafından çağrılabilir
 */
export async function indexPendingArticlesAggressively(): Promise<{
  success: boolean;
  count: number;
}> {
  try {
    const { db } = await import("@/lib/db");

    // Son 24 saatte yayınlanan ama indexNowStatus PENDING veya FAILED olan makaleler
    const pendingArticles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Son 24 saat
        },
        OR: [
          { indexNowStatus: "PENDING" },
          { indexNowStatus: "FAILED" },
          { indexNowStatus: null },
        ],
      },
      select: { id: true, slug: true },
      take: 50, // Batch size
    });

    if (pendingArticles.length === 0) {
      console.log("✅ Indexing bekleyen makale yok");
      return { success: true, count: 0 };
    }

    console.log(
      `📤 ${pendingArticles.length} makale agresif indexing'e alınıyor...`,
    );

    await aggressivelyIndexMultipleArticles(pendingArticles);

    return {
      success: true,
      count: pendingArticles.length,
    };
  } catch (error) {
    console.error("❌ indexPendingArticlesAggressively error:", error);
    return { success: false, count: 0 };
  }
}
