/**
 * Google PageSpeed Insights API
 * Core Web Vitals ve performans metrikleri
 *
 * API Key gerektirmez - Ücretsiz ve sınırsız
 * https://developers.google.com/speed/docs/insights/v5/get-started
 */

interface CoreWebVitals {
  lcp: number | null; // Largest Contentful Paint (ms)
  fid: number | null; // First Input Delay (ms)
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint (ms)
  ttfb: number | null; // Time to First Byte (ms)
  si: number | null; // Speed Index (ms)
}

interface PageSpeedResult {
  url: string;
  score: number; // 0-100
  coreWebVitals: CoreWebVitals;
  strategy: "mobile" | "desktop";
  timestamp: Date;
  loadingExperience: "FAST" | "AVERAGE" | "SLOW" | null;
}

/**
 * Tek bir URL için PageSpeed analizi yap
 */
export async function analyzePageSpeed(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
): Promise<PageSpeedResult | null> {
  try {
    const apiUrl = new URL(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
    );
    apiUrl.searchParams.set("url", url);
    apiUrl.searchParams.set("strategy", strategy);
    apiUrl.searchParams.set("category", "performance");

    // API key opsiyonel ama rate limit için eklenebilir
    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
    if (apiKey) {
      apiUrl.searchParams.set("key", apiKey);
    }

    console.log(`🔍 PageSpeed analizi başlatıldı: ${url} (${strategy})`);

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`❌ PageSpeed API hatası: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Performance score
    const score = Math.round(
      (data.lighthouseResult?.categories?.performance?.score || 0) * 100,
    );

    // Core Web Vitals from field data (real user metrics)
    const fieldMetrics = data.loadingExperience?.metrics || {};

    // Lab data (Lighthouse simulation)
    const audits = data.lighthouseResult?.audits || {};

    const coreWebVitals: CoreWebVitals = {
      // Field data (gerçek kullanıcı verileri) varsa onu kullan
      lcp:
        fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile ||
        audits["largest-contentful-paint"]?.numericValue ||
        null,
      fid: fieldMetrics.FIRST_INPUT_DELAY_MS?.percentile || null,
      cls:
        fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile ||
        audits["cumulative-layout-shift"]?.numericValue ||
        null,
      fcp:
        fieldMetrics.FIRST_CONTENTFUL_PAINT_MS?.percentile ||
        audits["first-contentful-paint"]?.numericValue ||
        null,
      ttfb: audits["server-response-time"]?.numericValue || null,
      si: audits["speed-index"]?.numericValue || null,
    };

    // Loading experience category
    const loadingExperience = data.loadingExperience?.overall_category || null;

    console.log(
      `✅ PageSpeed: ${url} = ${score}/100 (${loadingExperience || "N/A"})`,
    );

    return {
      url,
      score,
      coreWebVitals,
      strategy,
      timestamp: new Date(),
      loadingExperience,
    };
  } catch (error) {
    console.error("❌ PageSpeed analizi hatası:", error);
    return null;
  }
}

/**
 * Bir haber sayfasının performansını analiz et
 */
export async function analyzeArticlePageSpeed(
  slug: string,
  strategy: "mobile" | "desktop" = "mobile",
): Promise<PageSpeedResult | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  const articleUrl = `${baseUrl}/news/${slug}`;

  return analyzePageSpeed(articleUrl, strategy);
}

/**
 * Core Web Vitals değerlendirmesi
 */
export function evaluateCoreWebVitals(vitals: CoreWebVitals): {
  lcp: "good" | "needs-improvement" | "poor" | "unknown";
  fid: "good" | "needs-improvement" | "poor" | "unknown";
  cls: "good" | "needs-improvement" | "poor" | "unknown";
} {
  return {
    // LCP: Good < 2.5s, Poor > 4s
    lcp:
      vitals.lcp === null
        ? "unknown"
        : vitals.lcp <= 2500
          ? "good"
          : vitals.lcp <= 4000
            ? "needs-improvement"
            : "poor",

    // FID: Good < 100ms, Poor > 300ms
    fid:
      vitals.fid === null
        ? "unknown"
        : vitals.fid <= 100
          ? "good"
          : vitals.fid <= 300
            ? "needs-improvement"
            : "poor",

    // CLS: Good < 0.1, Poor > 0.25
    cls:
      vitals.cls === null
        ? "unknown"
        : vitals.cls <= 0.1
          ? "good"
          : vitals.cls <= 0.25
            ? "needs-improvement"
            : "poor",
  };
}

/**
 * Toplu PageSpeed analizi (rate limit'e dikkat)
 */
export async function analyzeMultiplePages(
  urls: string[],
  strategy: "mobile" | "desktop" = "mobile",
  delayMs: number = 2000, // Rate limit için bekleme süresi
): Promise<PageSpeedResult[]> {
  const results: PageSpeedResult[] = [];

  for (const url of urls) {
    const result = await analyzePageSpeed(url, strategy);
    if (result) {
      results.push(result);
    }

    // Rate limit'i aşmamak için bekle
    if (urls.indexOf(url) < urls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
