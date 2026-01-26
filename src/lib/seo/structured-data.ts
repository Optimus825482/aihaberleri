/**
 * Structured Data (JSON-LD) Generator
 * Schema.org implementasyonu - Google, Bing, Yandex için
 */

import type { Article, Category } from "@prisma/client";

interface ArticleWithCategory extends Article {
  category: Category;
}

/**
 * Organization Schema - Site genelinde kullanılır
 */
export function generateOrganizationSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "AI Haberleri";

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: baseUrl,
    logo: {
      "@type": "ImageObject",
      url: `${baseUrl}/logos/logo-512.png`,
      width: 512,
      height: 512,
    },
    sameAs: [
      // Sosyal medya linkleri buraya eklenebilir
      // "https://twitter.com/...",
      // "https://facebook.com/...",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: process.env.CONTACT_EMAIL || "info@example.com",
    },
  };
}

/**
 * WebSite Schema - Ana sayfa için
 */
export function generateWebSiteSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "AI Haberleri";

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * NewsArticle Schema - Haber sayfaları için
 * Google News için optimize edilmiş
 */
export function generateNewsArticleSchema(article: ArticleWithCategory) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "AI Haberleri";
  const articleUrl = `${baseUrl}/news/${article.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: article.imageUrl
      ? {
          "@type": "ImageObject",
          url: article.imageUrl,
          width: 1200,
          height: 630,
        }
      : undefined,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: {
      "@type": "Organization",
      name: siteName,
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logos/logo-512.png`,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    articleSection: article.category.name,
    keywords: article.keywords.join(", "),
    url: articleUrl,
    // Google News için ek alanlar
    inLanguage: "tr-TR",
    copyrightYear:
      article.publishedAt?.getFullYear() || new Date().getFullYear(),
    copyrightHolder: {
      "@type": "Organization",
      name: siteName,
    },
  };
}

/**
 * BreadcrumbList Schema - Breadcrumb navigation için
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * CollectionPage Schema - Kategori sayfaları için
 */
export function generateCollectionPageSchema(
  category: Category,
  articlesCount: number,
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const categoryUrl = `${baseUrl}/category/${category.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description:
      category.description || `${category.name} kategorisindeki haberler`,
    url: categoryUrl,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: articlesCount,
    },
  };
}

/**
 * JSON-LD script tag oluştur
 */
export function generateJsonLd(schema: object) {
  return {
    __html: JSON.stringify(schema),
  };
}

/**
 * FAQPage Schema - Sıkça Sorulan Sorular için
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Multiple schema'ları birleştir
 */
export function combineSchemas(...schemas: object[]) {
  return {
    "@context": "https://schema.org",
    "@graph": schemas,
  };
}
