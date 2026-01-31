/**
 * SEO Utilities - Central Export
 * Tüm SEO fonksiyonlarını tek yerden export et
 */

// Structured Data
export {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateNewsArticleSchema,
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
  generateJsonLd,
  combineSchemas,
} from "./structured-data";

// IndexNow API
export {
  getOrCreateIndexNowKey,
  submitUrlToIndexNow,
  submitUrlsToIndexNow,
  submitArticleToIndexNow,
  submitAllArticlesToIndexNow,
  submitPendingArticlesToIndexNow,
  writeIndexNowKeyFile,
  pingSitemaps,
} from "./indexnow";

// Canonical URLs
export {
  generateCanonicalUrl,
  getArticleCanonicalUrl,
  getCategoryCanonicalUrl,
  getPaginatedCanonicalUrl,
  getPaginationLinks,
} from "./canonical";

// Performance
export {
  IMAGE_OPTIMIZATION,
  FONT_OPTIMIZATION,
  CACHE_HEADERS,
  CORE_WEB_VITALS,
  generateResourceHints,
  reportWebVitals,
  preloadImage,
} from "./performance";

// Meta Tags
export {
  generateArticleMetadata,
  generateCategoryMetadata,
  generateHomeMetadata,
  optimizeMetaDescription,
  optimizeMetaTitle,
  extractKeywords,
} from "./meta-tags";
