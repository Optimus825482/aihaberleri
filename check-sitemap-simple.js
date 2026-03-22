#!/usr/bin/env node
/**
 * Basit Sitemap Kontrol Script'i (Node.js native)
 * tsx gerektirmez, container içinde çalışır
 */

const https = require("https");

const SITEMAP_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`
  : "https://aihaberleri.org/sitemap.xml";

const NEWS_SITEMAP_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/news-sitemap.xml`
  : "https://aihaberleri.org/news-sitemap.xml";

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      })
      .on("error", reject);
  });
}

function extractUrls(xml) {
  const urlMatches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
  return Array.from(urlMatches, (match) => match[1]);
}

function analyzeSitemap(urls) {
  const stats = {
    totalUrls: urls.length,
    duplicates: [],
    urlsByType: {},
  };

  // Duplicate kontrolü
  const urlCounts = new Map();
  urls.forEach((url) => {
    urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
  });

  urlCounts.forEach((count, url) => {
    if (count > 1) {
      stats.duplicates.push(`${url} (${count}x)`);
    }
  });

  // URL tipi analizi
  urls.forEach((url) => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      let type = "other";
      if (path === "/" || path === "/en") type = "home";
      else if (path.startsWith("/news/") || path.startsWith("/en/news/"))
        type = "article";
      else if (
        path.startsWith("/category/") ||
        path.startsWith("/en/category/")
      )
        type = "category";
      else if (path.match(/\/(about|privacy|terms|contact|sss|faq)/))
        type = "static";

      stats.urlsByType[type] = (stats.urlsByType[type] || 0) + 1;
    } catch (error) {
      // Invalid URL
    }
  });

  return stats;
}

async function main() {
  console.log("🔍 Sitemap Kontrol Başlıyor...\n");
  console.log(`📍 Ana Sitemap: ${SITEMAP_URL}`);
  console.log(`📍 News Sitemap: ${NEWS_SITEMAP_URL}\n`);

  try {
    // Ana sitemap
    console.log("📥 Ana sitemap fetch ediliyor...");
    const mainXml = await fetchUrl(SITEMAP_URL);
    const mainUrls = extractUrls(mainXml);

    if (mainUrls.length === 0) {
      console.error("❌ Ana sitemap boş veya erişilemez!");
      process.exit(1);
    }

    const mainStats = analyzeSitemap(mainUrls);

    console.log("\n📊 Ana Sitemap İstatistikleri:\n");
    console.log(`✅ Toplam URL: ${mainStats.totalUrls}`);
    console.log(`✅ URL Tipleri:`);
    Object.entries(mainStats.urlsByType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    if (mainStats.duplicates.length > 0) {
      console.log(`\n⚠️  Duplicate URL'ler (${mainStats.duplicates.length}):`);
      mainStats.duplicates
        .slice(0, 10)
        .forEach((dup) => console.log(`   - ${dup}`));
      if (mainStats.duplicates.length > 10) {
        console.log(`   ... ve ${mainStats.duplicates.length - 10} tane daha`);
      }
    } else {
      console.log(`\n✅ Duplicate URL yok`);
    }

    // Google limit kontrolü
    if (mainStats.totalUrls > 50000) {
      console.log(
        `\n⚠️  UYARI: Sitemap ${mainStats.totalUrls} URL içeriyor (Google limiti: 50,000)`,
      );
      console.log(`   Sitemap'i bölmeniz gerekebilir!`);
    } else {
      console.log(
        `\n✅ URL sayısı Google limiti içinde (${mainStats.totalUrls}/50,000)`,
      );
    }

    // News sitemap
    console.log("\n📥 News sitemap fetch ediliyor...");
    try {
      const newsXml = await fetchUrl(NEWS_SITEMAP_URL);
      const newsUrls = extractUrls(newsXml);

      if (newsUrls.length > 0) {
        console.log(`\n📰 News Sitemap: ${newsUrls.length} URL (son 48 saat)`);
      } else {
        console.log(
          `\n⚠️  News sitemap boş (son 48 saatte yayınlanan makale yok)`,
        );
      }
    } catch (error) {
      console.log(`\n⚠️  News sitemap erişilemedi: ${error.message}`);
    }

    console.log("\n✅ Kontrol tamamlandı!\n");

    // Örnek URL'leri göster
    console.log("📋 Örnek URL'ler (ilk 5):\n");
    mainUrls.slice(0, 5).forEach((url, i) => {
      console.log(`${i + 1}. ${url}`);
    });
  } catch (error) {
    console.error("❌ Hata:", error.message);
    process.exit(1);
  }
}

main();
