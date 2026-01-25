/**
 * Performance Optimization Utilities
 * Core Web Vitals optimization helpers
 */

/**
 * Image optimization config
 * Next.js Image component için optimal ayarlar
 */
export const IMAGE_OPTIMIZATION = {
  // Responsive image sizes
  sizes: {
    mobile: "(max-width: 640px) 100vw",
    tablet: "(max-width: 1024px) 50vw",
    desktop: "33vw",
    full: "100vw",
    hero: "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px",
  },

  // Quality settings
  quality: {
    high: 90,
    medium: 75,
    low: 60,
  },

  // Formats
  formats: ["image/avif", "image/webp"],

  // Blur placeholder
  placeholder: "blur" as const,
};

/**
 * Font optimization
 * Google Fonts için optimal ayarlar
 */
export const FONT_OPTIMIZATION = {
  display: "swap" as const, // FOIT (Flash of Invisible Text) önler
  preload: true,
  fallback: ["system-ui", "arial"],
};

/**
 * Resource hints
 * Critical resources için preload/prefetch
 */
export function generateResourceHints() {
  return {
    // DNS prefetch - external domains
    dnsPrefetch: [
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
      "https://www.google-analytics.com",
    ],

    // Preconnect - critical external resources
    preconnect: ["https://fonts.googleapis.com", "https://fonts.gstatic.com"],

    // Preload - critical assets
    preload: [
      {
        href: "/fonts/inter-var.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
  };
}

/**
 * Lazy loading threshold
 * Viewport'tan ne kadar uzakta lazy load başlasın
 */
export const LAZY_LOAD_THRESHOLD = "200px";

/**
 * Cache headers
 * Static assets için optimal cache stratejisi
 */
export const CACHE_HEADERS = {
  // Immutable assets (hashed filenames)
  immutable: {
    "Cache-Control": "public, max-age=31536000, immutable",
  },

  // Static assets (images, fonts)
  static: {
    "Cache-Control":
      "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
  },

  // Dynamic content (HTML)
  dynamic: {
    "Cache-Control":
      "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  },

  // API responses
  api: {
    "Cache-Control":
      "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  },
};

/**
 * Critical CSS inline threshold
 * Bu boyutun altındaki CSS'ler inline edilmeli
 */
export const CRITICAL_CSS_THRESHOLD = 14 * 1024; // 14KB

/**
 * Bundle size limits
 * Webpack/Next.js bundle analyzer için
 */
export const BUNDLE_SIZE_LIMITS = {
  maxInitialSize: 244 * 1024, // 244KB
  maxAsyncSize: 244 * 1024, // 244KB
  maxPageSize: 512 * 1024, // 512KB
};

/**
 * Core Web Vitals thresholds
 * Google'ın önerdiği değerler
 */
export const CORE_WEB_VITALS = {
  // Largest Contentful Paint (LCP)
  LCP: {
    good: 2500, // ms
    needsImprovement: 4000,
  },

  // Interaction to Next Paint (INP) - FID'nin yerine geçti (2024)
  INP: {
    good: 200, // ms
    needsImprovement: 500,
  },

  // Cumulative Layout Shift (CLS)
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
  },

  // First Contentful Paint (FCP)
  FCP: {
    good: 1800, // ms
    needsImprovement: 3000,
  },

  // Time to First Byte (TTFB)
  TTFB: {
    good: 800, // ms
    needsImprovement: 1800,
  },
};

/**
 * Performance monitoring
 * Web Vitals tracking için
 */
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: "web-vital" | "custom";
}) {
  // Production'da analytics'e gönder
  if (process.env.NODE_ENV === "production") {
    // Google Analytics, Vercel Analytics, vb.
    console.log("Web Vital:", metric);

    // Örnek: Google Analytics
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", metric.name, {
        value: Math.round(
          metric.name === "CLS" ? metric.value * 1000 : metric.value,
        ),
        event_category: metric.label === "web-vital" ? "Web Vitals" : "Custom",
        event_label: metric.id,
        non_interaction: true,
      });
    }
  }
}

/**
 * Preload critical images
 * LCP için kritik görselleri preload et
 */
export function preloadImage(src: string, priority: "high" | "low" = "high") {
  if (typeof window === "undefined") return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = src;
  link.fetchPriority = priority;

  document.head.appendChild(link);
}
