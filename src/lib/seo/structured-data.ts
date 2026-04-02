/**
 * Structured Data (JSON-LD) Generator
 * Schema.org implementasyonu - Google, Bing, Yandex için
 */

import type { Article, Category } from "@prisma/client";
import { getDateYear, toIsoDateString } from "@/lib/date-utils";

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
    "@id": `${baseUrl}/#organization`,
    name: siteName,
    url: baseUrl,
    // Google Haberler Mart 2025: favicon = logo. Kare format zorunlu.
    logo: {
      "@type": "ImageObject",
      url: `${baseUrl}/icons/Icon-512.png`,
      width: 512,
      height: 512,
    },
    sameAs: [
      `https://twitter.com/${process.env.TWITTER_HANDLE?.replace("@", "") || "aihaberleri"}`,
      `https://bsky.app/profile/${process.env.NEXT_PUBLIC_SITE_URL?.replace("https://", "") || "aihaberleri.org"}`,
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: process.env.CONTACT_EMAIL || "info@aihaberleri.org",
      availableLanguage: "Turkish",
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
 * E-E-A-T uyumlu - AI tarafından oluşturulduğu belirtilir
 */
export function generateNewsArticleSchema(article: ArticleWithCategory) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "AI Haberleri";
  const articleUrl = `${baseUrl}/news/${article.slug}`;

  const publishedTime = toIsoDateString(article.publishedAt);
  const modifiedTime = toIsoDateString(article.updatedAt);

  // Publisher Organization (sabit)
  const publisherOrg = {
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: siteName,
    url: baseUrl,
    // Google Haberler Mart 2025: favicon = logo. Kare format zorunlu.
    logo: {
      "@type": "ImageObject",
      url: `${baseUrl}/icons/Icon-512.png`,
      width: 512,
      height: 512,
    },
    sameAs: [
      `https://twitter.com/${process.env.TWITTER_HANDLE?.replace("@", "") || "aihaberleri"}`,
    ],
  };

  // Author - Person + Organization (E-E-A-T için)
  // AI tarafından oluşturulduğu "description" ile belirtilir
  const authorInfo = [
    {
      "@type": "Person",
      name: "AI Haberleri Editörü",
      url: `${baseUrl}/hakkimizda`,
      description: "Yapay zeka destekli içerik editörü",
      worksFor: {
        "@type": "Organization",
        name: siteName,
      },
    },
    publisherOrg,
  ];

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
    datePublished: publishedTime,
    dateModified: modifiedTime,
    // E-E-A-T: Çoklu author desteği (Person + Organization)
    author: authorInfo,
    publisher: publisherOrg,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    articleSection: article.category.name,
    keywords: article.keywords.join(", "),
    url: articleUrl,
    // Google News için ek alanlar
    inLanguage: "tr-TR",
    copyrightYear: getDateYear(article.publishedAt) || new Date().getFullYear(),
    copyrightHolder: publisherOrg,
    // Google Discover + Google Haberler için speakable schema
    // Hangi kısımların özet olarak kullanılacağını belirtir
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [
        "h1",
        ".article-title",
        ".article-excerpt",
        "[data-speakable]",
      ],
    },
    // AI tarafından oluşturulduğunu belirten ek meta
    // Schema.org'da resmi bir "AI generated" alanı yok,
    // ancak "creativeWorkStatus" ile belirtilebilir
    creativeWorkStatus: "AI-Assisted Content",
    // Orijinal kaynak varsa belirt
    ...(article.sourceUrl && {
      isBasedOn: {
        "@type": "WebPage",
        url: article.sourceUrl,
      },
    }),
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
