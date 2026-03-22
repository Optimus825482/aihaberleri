#!/usr/bin/env tsx
/**
 * Sitemap Kontrol ve Validasyon Script'i
 *
 * Kullanım:
 *   npx tsx scripts/check-sitemap.ts
 *
 * Ne yapar:
 * - Sitemap'i fetch eder
 * - URL sayısını kontrol eder
 * - Duplicate URL'leri tespit eder
 * - Geçersiz URL'leri bulur
 * - Veritabanı ile karşılaştırır
 */

import { db } from "../src/lib/db";

const SITEMAP_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`
  : "http://localhost:3000/sitemap.xml";

const NEWS_SITEMAP_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/news-sitemap.xml`
  : "http://localhost:3000/news-sitemap.xml";

interface SitemapStats {
  totalUrls: number;
  duplicates: string[];
  invalidUrls: string[];
  urlsByType: Record<string, number>;
}

async function fetchSitemap(url: string): Promise<string[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();

    // Extract URLs from XML
    const urlMatches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
    const urls = Array.from(urlMatches, (match) => match[1]);

    return urls;
  } catch (error) {
    console.error(`❌ Sitemap fetch hatası (${url}):`, error);
    return [];
  }
}

function analyzeSitemap(urls: string[]): SitemapStats {
  const stats: SitemapStats = {
    totalUrls: urls.length,
    duplicates: [],
    invalidUrls: [],
    urlsByType: {},
  };

  // Duplicate kontrolü
  const urlCounts = new Map<string, number>();
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
      stats.invalidUrls.push(url);
    }
  });

  return stats;
}

async function checkDatabaseConsistency(sitemapUrls: string[]) {
  console.log("\n📊 Veritabanı Tutarlılık Kontrolü...\n");

  // Yayınlanmış makale sayısı
  const publishedCount = await db.article.count({
    where: {
      status: "PUBLISHED",
      publishedAt: { not: null },
    },
  });

  // Sitemap'teki makale URL'leri
  const articleUrls = sitemapUrls.filter(
    (url) => url.includes("/news/") && !url.includes("/en/"),
  );

  console.log(`✅ Veritabanında yayınlanmış makale: ${publishedCount}`);
  console.log(`✅ Sitemap'te Türkçe makale URL'i: ${articleUrls.length}`);

  if (publishedCount !== articleUrls.length) {
    console.log(
      `⚠️  UYARI: Sayılar eşleşmiyor! Fark: ${Math.abs(publishedCount - articleUrls.length)}`,
    );
  } else {
    console.log(`✅ Tutarlı: Veritabanı ve sitemap eşleşiyor`);
  }

  // Kategori kontrolü
  const categoryCount = await db.category.count();
  const categoryUrls = sitemapUrls.filter(
    (url) => url.includes("/category/") && !url.includes("/en/"),
  );

  console.log(`\n✅ Veritabanında kategori: ${categoryCount}`);
  console.log(`✅ Sitemap'te Türkçe kategori URL'i: ${categoryUrls.length}`);

  if (categoryCount !== categoryUrls.length) {
    console.log(`⚠️  UYARI: Kategori sayıları eşleşmiyor!`);
  }
}

async function main() {
  console.log("🔍 Sitemap Kontrol Başlıyor...\n");
  console.log(`📍 Ana Sitemap: ${SITEMAP_URL}`);
  console.log(`📍 News Sitemap: ${NEWS_SITEMAP_URL}\n`);

  // Ana sitemap
  console.log("📥 Ana sitemap fetch ediliyor...");
  const mainUrls = await fetchSitemap(SITEMAP_URL);

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

  if (mainStats.invalidUrls.length > 0) {
    console.log(`\n❌ Geçersiz URL'ler (${mainStats.invalidUrls.length}):`);
    mainStats.invalidUrls
      .slice(0, 5)
      .forEach((url) => console.log(`   - ${url}`));
  } else {
    console.log(`✅ Tüm URL'ler geçerli`);
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
  const newsUrls = await fetchSitemap(NEWS_SITEMAP_URL);

  if (newsUrls.length > 0) {
    console.log(`\n📰 News Sitemap: ${newsUrls.length} URL (son 48 saat)`);
  } else {
    console.log(`\n⚠️  News sitemap boş (son 48 saatte yayınlanan makale yok)`);
  }

  // Veritabanı kontrolü
  await checkDatabaseConsistency(mainUrls);

  console.log("\n✅ Kontrol tamamlandı!\n");

  await db.$disconnect();
}

main().catch((error) => {
  console.error("❌ Hata:", error);
  process.exit(1);
});
