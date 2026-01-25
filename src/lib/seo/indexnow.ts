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
 * Tek bir URL'i IndexNow'a gönder
 */
export async function submitUrlToIndexNow(url: string): Promise<boolean> {
  try {
    const apiKey = await getOrCreateIndexNowKey();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const host = new URL(baseUrl).hostname;

    const payload: IndexNowSubmission = {
      host,
      key: apiKey,
      keyLocation: `${baseUrl}/${apiKey}.txt`,
      urlList: [url],
    };

    // Tüm endpoint'lere paralel gönder
    const promises = INDEXNOW_ENDPOINTS.map((endpoint) =>
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      }),
    );

    const results = await Promise.allSettled(promises);

    // En az bir başarılı response varsa true dön
    const hasSuccess = results.some(
      (result) =>
        result.status === "fulfilled" &&
        (result.value.status === 200 || result.value.status === 202),
    );

    if (hasSuccess) {
      console.log(`✅ IndexNow: URL submitted successfully - ${url}`);
    } else {
      console.warn(`⚠️ IndexNow: Failed to submit URL - ${url}`);
    }

    return hasSuccess;
  } catch (error) {
    console.error("❌ IndexNow submission error:", error);
    return false;
  }
}

/**
 * Birden fazla URL'i IndexNow'a gönder (batch)
 * Max 10,000 URL per request (IndexNow limit)
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<boolean> {
  if (urls.length === 0) return false;

  try {
    const apiKey = await getOrCreateIndexNowKey();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const host = new URL(baseUrl).hostname;

    // 10,000 URL limit
    const urlsToSubmit = urls.slice(0, 10000);

    const payload: IndexNowSubmission = {
      host,
      key: apiKey,
      keyLocation: `${baseUrl}/${apiKey}.txt`,
      urlList: urlsToSubmit,
    };

    // Tüm endpoint'lere paralel gönder
    const promises = INDEXNOW_ENDPOINTS.map((endpoint) =>
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      }),
    );

    const results = await Promise.allSettled(promises);

    const hasSuccess = results.some(
      (result) =>
        result.status === "fulfilled" &&
        (result.value.status === 200 || result.value.status === 202),
    );

    if (hasSuccess) {
      console.log(
        `✅ IndexNow: ${urlsToSubmit.length} URLs submitted successfully`,
      );
    } else {
      console.warn(`⚠️ IndexNow: Failed to submit ${urlsToSubmit.length} URLs`);
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
  articleSlug: string,
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const articleUrl = `${baseUrl}/news/${articleSlug}`;
  return submitUrlToIndexNow(articleUrl);
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
      select: { slug: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const urls = articles.map((article) => `${baseUrl}/news/${article.slug}`);

    const success = await submitUrlsToIndexNow(urls);

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
