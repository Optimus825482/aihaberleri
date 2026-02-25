/**
 * IndexNow API Integration
 * Bing, Yandex ve diğer search engine'lere instant indexing
 * https://www.indexnow.org/
 */

import { db } from "@/lib/db";

// IndexNow API endpoint'leri
const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow", // Generic endpoint
  "https://www.bing.com/indexnow", // Bing
  "https://yandex.com/indexnow", // Yandex
];

// Timeout for IndexNow API calls (ms)
const INDEXNOW_TIMEOUT = 15000;

// Max retry attempts for transient failures
const INDEXNOW_MAX_RETRIES = 2;

/**
 * IndexNow fetch with timeout, retry, and diagnostic logging
 */
async function fetchIndexNowWithRetry(
  endpoint: string,
  payload: IndexNowSubmission,
  attempt = 1,
): Promise<{ endpoint: string; status: number; ok: boolean; body?: string }> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(INDEXNOW_TIMEOUT),
    });

    const status = response.status;
    const ok = status === 200 || status === 202;

    if (!ok) {
      const body = await response.text().catch(() => "(no body)");
      console.warn(
        `⚠️ IndexNow [${endpoint}] HTTP ${status}: ${body.slice(0, 200)}`,
      );

      // Retry on 429 (rate limit) or 5xx (server error)
      if ((status === 429 || status >= 500) && attempt < INDEXNOW_MAX_RETRIES) {
        const delay = attempt * 2000; // 2s, 4s backoff
        console.log(`🔄 IndexNow retry ${attempt + 1}/${INDEXNOW_MAX_RETRIES} for ${endpoint} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        return fetchIndexNowWithRetry(endpoint, payload, attempt + 1);
      }

      return { endpoint, status, ok: false, body: body.slice(0, 200) };
    }

    return { endpoint, status, ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ IndexNow [${endpoint}] network error: ${msg}`);

    // Retry on network/timeout errors
    if (attempt < INDEXNOW_MAX_RETRIES) {
      const delay = attempt * 2000;
      console.log(`🔄 IndexNow retry ${attempt + 1}/${INDEXNOW_MAX_RETRIES} for ${endpoint} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      return fetchIndexNowWithRetry(endpoint, payload, attempt + 1);
    }

    return { endpoint, status: 0, ok: false, body: msg };
  }
}

interface IndexNowSubmission {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/**
 * IndexNow API key'i al veya oluştur
 * Key, database'de saklanır ve public klasörde de bulunmalıdır
 */
export async function getOrCreateIndexNowKey(): Promise<string> {
  const setting = await db.setting.findUnique({
    where: { key: "indexnow_api_key" },
  });

  if (setting) {
    return setting.value;
  }

  // Yeni key oluştur (UUID formatında)
  const newKey = crypto.randomUUID();

  await db.setting.create({
    data: {
      key: "indexnow_api_key",
      value: newKey,
      encrypted: false,
    },
  });

  return newKey;
}

/**
 * Tek bir URL'i IndexNow'a gönder ve DB durumunu güncelle
 */
export async function submitUrlToIndexNow(
  url: string,
  articleId?: string,
): Promise<boolean> {
  try {
    const apiKey = await getOrCreateIndexNowKey();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
    const host = new URL(baseUrl).hostname;

    const payload: IndexNowSubmission = {
      host,
      key: apiKey,
      keyLocation: `${baseUrl}/${apiKey}.txt`,
      urlList: [url],
    };

    // Tüm endpoint'lere paralel gönder (with timeout & retry)
    const results = await Promise.all(
      INDEXNOW_ENDPOINTS.map((endpoint) =>
        fetchIndexNowWithRetry(endpoint, payload),
      ),
    );

    // En az bir başarılı response varsa true dön
    const hasSuccess = results.some((r) => r.ok);

    if (hasSuccess) {
      const successEndpoints = results.filter((r) => r.ok).map((r) => r.endpoint);
      console.log(`✅ IndexNow: URL submitted successfully - ${url} (via ${successEndpoints.length} endpoint(s))`);
      // DB durumunu güncelle
      if (articleId) {
        await db.article.update({
          where: { id: articleId },
          data: {
            indexNowStatus: "SUBMITTED",
            indexedAt: new Date(),
          },
        });
      }
    } else {
      const failDetails = results.map((r) => `${r.endpoint}→${r.status}`).join(", ");
      console.warn(`⚠️ IndexNow: Failed to submit URL - ${url} | Details: ${failDetails}`);
      if (articleId) {
        await db.article.update({
          where: { id: articleId },
          data: { indexNowStatus: "FAILED" },
        });
      }
    }

    return hasSuccess;
  } catch (error) {
    console.error("❌ IndexNow submission error:", error);
    if (articleId) {
      await db.article.update({
        where: { id: articleId },
        data: { indexNowStatus: "FAILED" },
      });
    }
    return false;
  }
}

/**
 * Birden fazla URL'i IndexNow'a gönder (batch)
 */
export async function submitUrlsToIndexNow(
  urls: string[],
  articleIds?: string[],
): Promise<boolean> {
  if (urls.length === 0) return false;

  try {
    const apiKey = await getOrCreateIndexNowKey();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
    const host = new URL(baseUrl).hostname;

    // 10,000 URL limit
    const urlsToSubmit = urls.slice(0, 10000);

    const payload: IndexNowSubmission = {
      host,
      key: apiKey,
      keyLocation: `${baseUrl}/${apiKey}.txt`,
      urlList: urlsToSubmit,
    };

    // Tüm endpoint'lere paralel gönder (with timeout & retry)
    const results = await Promise.all(
      INDEXNOW_ENDPOINTS.map((endpoint) =>
        fetchIndexNowWithRetry(endpoint, payload),
      ),
    );

    const hasSuccess = results.some((r) => r.ok);

    if (hasSuccess) {
      const successEndpoints = results.filter((r) => r.ok).map((r) => r.endpoint);
      console.log(
        `✅ IndexNow: ${urlsToSubmit.length} URLs submitted successfully (via ${successEndpoints.length} endpoint(s))`,
      );
      if (articleIds && articleIds.length > 0) {
        await db.article.updateMany({
          where: { id: { in: articleIds } },
          data: {
            indexNowStatus: "SUBMITTED",
            indexedAt: new Date(),
          },
        });
      }
    } else {
      const failDetails = results.map((r) => `${r.endpoint}→HTTP${r.status}${r.body ? ` (${r.body.slice(0, 80)})` : ""}`).join(" | ");
      console.warn(`⚠️ IndexNow: Failed to submit ${urlsToSubmit.length} URLs | ${failDetails}`);
      if (articleIds && articleIds.length > 0) {
        await db.article.updateMany({
          where: { id: { in: articleIds } },
          data: { indexNowStatus: "FAILED" },
        });
      }
    }

    return hasSuccess;
  } catch (error) {
    console.error("❌ IndexNow batch submission error:", error);
    return false;
  }
}

/**
 * Yeni yayınlanan makale için IndexNow submit
 */
export async function submitArticleToIndexNow(
  slug: string,
  articleId?: string,
): Promise<boolean> {
  // Eğer articleId verilmemişse slug üzerinden bul
  let actualId = articleId;
  if (!actualId) {
    const article = await db.article.findUnique({
      where: { slug },
      select: { id: true },
    });
    actualId = article?.id;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const articleUrl = `${baseUrl}/news/${slug}`;
  return submitUrlToIndexNow(articleUrl, actualId);
}

/**
 * Gönderilmemiş (PENDING veya FAILED) tüm haberleri gönder
 */
export async function submitPendingArticlesToIndexNow(): Promise<{
  success: boolean;
  count: number;
}> {
  try {
    const pendingArticlesTr = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        indexNowStatus: { in: ["PENDING", "FAILED"] },
        publishedAt: { not: null },
      },
      select: { id: true, slug: true },
      take: 100, // Reasonable batch size
    });

    const pendingArticlesEn = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        indexNowStatusEn: { in: ["PENDING", "FAILED"] },
        publishedAt: { not: null },
        translations: {
          some: {
            locale: "en",
          },
        },
      },
      select: {
        id: true,
        translations: {
          where: { locale: "en" },
          select: { slug: true },
          take: 1,
        },
      },
      take: 100,
    });

    const pendingArticles = pendingArticlesTr.length + pendingArticlesEn.length;

    if (pendingArticles === 0) {
      return { success: true, count: 0 };
    }

    console.log(
      `📤 Gönderilmemiş ${pendingArticles} haber/çeviri IndexNow'a bildiriliyor...`,
    );

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
    const trUrls = pendingArticlesTr.map(
      (article) => `${baseUrl}/news/${article.slug}`,
    );
    const trIds = pendingArticlesTr.map((a) => a.id);

    const enPairs = pendingArticlesEn
      .map((article) => ({
        id: article.id,
        slug: article.translations[0]?.slug,
      }))
      .filter((item): item is { id: string; slug: string } =>
        Boolean(item.slug),
      );

    const enUrls = enPairs.map((item) => `${baseUrl}/en/news/${item.slug}`);
    const enIds = enPairs.map((item) => item.id);

    let trSuccess = true;
    let enSuccess = true;

    if (trUrls.length > 0) {
      trSuccess = await submitUrlsToIndexNow(trUrls);
      await db.article.updateMany({
        where: { id: { in: trIds } },
        data: {
          indexNowStatus: trSuccess ? "SUBMITTED" : "FAILED",
          indexedAt: trSuccess ? new Date() : undefined,
        },
      });
    }

    if (enUrls.length > 0) {
      enSuccess = await submitUrlsToIndexNow(enUrls);
      await db.article.updateMany({
        where: { id: { in: enIds } },
        data: {
          indexNowStatusEn: enSuccess ? "SUBMITTED" : "FAILED",
          indexedAtEn: enSuccess ? new Date() : undefined,
        },
      });
    }

    const success = trSuccess && enSuccess;

    return {
      success,
      count: pendingArticles,
    };
  } catch (error) {
    console.error("❌ submitPendingArticlesToIndexNow error:", error);
    return { success: false, count: 0 };
  }
}

/**
 * Tüm published article'ları IndexNow'a gönder
 * İlk kurulumda veya toplu güncelleme için
 */
export async function submitAllArticlesToIndexNow(): Promise<{
  success: boolean;
  count: number;
}> {
  try {
    const articles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
      },
      select: { id: true, slug: true },
    });

    const englishTranslations = await db.articleTranslation.findMany({
      where: {
        locale: "en",
        article: {
          status: "PUBLISHED",
          publishedAt: { not: null },
        },
      },
      select: {
        articleId: true,
        slug: true,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
    const trUrls = articles.map((article) => `${baseUrl}/news/${article.slug}`);
    const enUrls = englishTranslations.map(
      (translation) => `${baseUrl}/en/news/${translation.slug}`,
    );
    const urls = [...trUrls, ...enUrls];

    const trSuccess =
      trUrls.length > 0 ? await submitUrlsToIndexNow(trUrls) : true;
    const enSuccess =
      enUrls.length > 0 ? await submitUrlsToIndexNow(enUrls) : true;

    if (articles.length > 0) {
      await db.article.updateMany({
        where: { id: { in: articles.map((a) => a.id) } },
        data: {
          indexNowStatus: trSuccess ? "SUBMITTED" : "FAILED",
          indexedAt: trSuccess ? new Date() : undefined,
        },
      });
    }

    if (englishTranslations.length > 0) {
      await db.article.updateMany({
        where: { id: { in: englishTranslations.map((t) => t.articleId) } },
        data: {
          indexNowStatusEn: enSuccess ? "SUBMITTED" : "FAILED",
          indexedAtEn: enSuccess ? new Date() : undefined,
        },
      });
    }

    const success = trSuccess && enSuccess;

    return {
      success,
      count: urls.length,
    };
  } catch (error) {
    console.error("❌ Error submitting all articles to IndexNow:", error);
    return {
      success: false,
      count: 0,
    };
  }
}

/**
 * IndexNow key dosyasını public klasöre yaz
 * Bu dosya, search engine'lerin key'i doğrulaması için gerekli
 */
export async function writeIndexNowKeyFile(): Promise<void> {
  const apiKey = await getOrCreateIndexNowKey();
  const fs = require("fs");
  const path = require("path");

  const publicDir = path.join(process.cwd(), "public");
  const keyFilePath = path.join(publicDir, `${apiKey}.txt`);

  // Key dosyası yoksa oluştur
  if (!fs.existsSync(keyFilePath)) {
    fs.writeFileSync(keyFilePath, apiKey, "utf-8");
    console.log(`✅ IndexNow key file created: ${apiKey}.txt`);
  }
}

/**
 * Sitemap değişikliğini arama motorlarına bildir (Ping)
 * ENHANCED: Multiple fallback methods for faster indexing
 *
 * Methods used:
 * 1. IndexNow API (Bing, Yandex) - Most reliable
 * 2. WebSub/PubSubHubbub (Google) - For RSS/Atom feeds
 * 3. Legacy sitemap ping (fallback)
 */
export async function pingSitemaps(): Promise<{
  google: boolean;
  bing: boolean;
  indexNow: boolean;
  webSub: boolean;
}> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const newsSitemapUrl = `${baseUrl}/news-sitemap.xml`;
  const rssFeedUrl = `${baseUrl}/feed.xml`;

  const results = {
    google: false,
    bing: false,
    indexNow: false,
    webSub: false,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // METHOD 1: IndexNow - Most reliable for Bing/Yandex
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const indexNowResult = await submitUrlsToIndexNow([
      sitemapUrl,
      newsSitemapUrl,
      `${baseUrl}/`,
    ]);
    results.indexNow = indexNowResult;
    if (indexNowResult) {
      console.log("✅ IndexNow: Sitemap URLs submitted successfully");
      results.bing = true; // IndexNow covers Bing
    }
  } catch (error) {
    console.warn("⚠️ IndexNow sitemap submission failed:", error);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METHOD 2: WebSub/PubSubHubbub - Google's preferred method for feeds
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const webSubHubs = [
      "https://pubsubhubbub.appspot.com/",
      "https://pubsubhubbub.superfeedr.com/",
    ];

    for (const hub of webSubHubs) {
      const formData = new URLSearchParams();
      formData.append("hub.mode", "publish");
      formData.append("hub.url", rssFeedUrl);

      const response = await fetch(hub, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (response.ok || response.status === 204) {
        console.log(`✅ WebSub ping successful: ${hub}`);
        results.webSub = true;
        results.google = true; // WebSub notifies Google
        break;
      }
    }
  } catch (error) {
    console.warn("⚠️ WebSub ping failed:", error);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METHOD 3: Legacy Sitemap Ping (fallback - may be deprecated)
  // ═══════════════════════════════════════════════════════════════════════════
  const encodedSitemap = encodeURIComponent(sitemapUrl);
  const encodedNewsSitemap = encodeURIComponent(newsSitemapUrl);

  // Bing fallback: IndexNow API (single URL mode) then legacy ping
  if (!results.bing) {
    // Try Bing IndexNow directly with sitemap URL
    try {
      const apiKey = await getOrCreateIndexNowKey();
      const host = new URL(baseUrl).hostname;
      const bingIndexNowPayload: IndexNowSubmission = {
        host,
        key: apiKey,
        keyLocation: `${baseUrl}/${apiKey}.txt`,
        urlList: [sitemapUrl, newsSitemapUrl],
      };
      const bingResult = await fetchIndexNowWithRetry(
        "https://www.bing.com/indexnow",
        bingIndexNowPayload,
      );
      if (bingResult.ok) {
        console.log("✅ Bing IndexNow direct ping successful");
        results.bing = true;
        results.indexNow = true;
      }
    } catch (error) {
      console.warn("⚠️ Bing IndexNow direct ping failed:", error);
    }

    // Legacy ping as last resort (deprecated since 2023)
    if (!results.bing) {
      try {
        const bingResponse = await fetch(
          `https://www.bing.com/ping?sitemap=${encodedSitemap}`,
          {
            method: "GET",
            signal: AbortSignal.timeout(10000),
          },
        );

        if (bingResponse.ok) {
          console.log("✅ Bing legacy sitemap ping successful");
          results.bing = true;
        } else {
          console.warn(`⚠️ Bing legacy ping HTTP ${bingResponse.status}`);
        }

        await fetch(`https://www.bing.com/ping?sitemap=${encodedNewsSitemap}`, {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        });
      } catch (error) {
        console.warn(
          "⚠️ Bing legacy sitemap ping failed (deprecated endpoint)",
        );
      }
    }
  }

  // Google legacy ping (deprecated but try anyway if WebSub failed)
  if (!results.google) {
    try {
      const googleResponse = await fetch(
        `https://www.google.com/ping?sitemap=${encodedSitemap}`,
        {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        },
      );

      if (googleResponse.ok) {
        console.log("✅ Google legacy sitemap ping successful");
        results.google = true;
      }
    } catch (error) {
      // Expected to fail - Google deprecated this in 2023
      console.log("ℹ️ Google legacy ping not available (expected)");
    }
  }

  // Verify IndexNow key file accessibility (ALWAYS run — even when Yandex succeeds, Bing may fail)
  try {
    const apiKey = await getOrCreateIndexNowKey();
    const keyFileUrl = `${baseUrl}/${apiKey}.txt`;
    console.log(`🔑 IndexNow key in use: ${apiKey}`);
    console.log(`🔑 Key file URL: ${keyFileUrl}`);
    const keyCheck = await fetch(keyFileUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "IndexNow-KeyVerify/1.0" },
    });
    if (!keyCheck.ok) {
      console.error(
        `🔑 IndexNow key file NOT accessible at ${keyFileUrl} (HTTP ${keyCheck.status}) — Bing WILL reject submissions!`,
      );
    } else {
      const keyContent = await keyCheck.text();
      if (keyContent.trim() !== apiKey) {
        console.error(
          `🔑 IndexNow key file content MISMATCH! Expected "${apiKey}", got "${keyContent.trim().slice(0, 80)}" — Bing WILL reject submissions!`,
        );
      } else {
        console.log(`🔑 IndexNow key file verified OK at ${keyFileUrl}`);
      }
    }
  } catch (e) {
    console.warn(
      `🔑 IndexNow key file accessibility check failed: ${e instanceof Error ? e.message : "network error"}`,
    );
  }

  // Log summary
  const successCount = Object.values(results).filter(Boolean).length;
  console.log(`📊 Sitemap ping summary: ${successCount}/4 methods successful`);
  console.log(`   - IndexNow: ${results.indexNow ? "✅" : "❌"}`);
  console.log(`   - WebSub: ${results.webSub ? "✅" : "❌"}`);
  console.log(`   - Google: ${results.google ? "✅" : "❌"}`);
  console.log(`   - Bing: ${results.bing ? "✅" : "❌"}`);

  return results;
}
