/**
 * Enhanced Meta Tags Generator
 * Open Graph, Twitter Cards, ve diğer meta tags
 */

import type { Metadata } from "next";
import type { Article, Category } from "@prisma/client";

interface ArticleWithCategory extends Article {
  category: Category;
}

/**
 * Article için complete metadata
 */
export function generateArticleMetadata(
  article: ArticleWithCategory,
): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "AI Haberleri";
  const articleUrl = `${baseUrl}/news/${article.slug}`;

  return {
    title: article.metaTitle || article.title,
    description: article.metaDescription || article.excerpt,
    keywords: article.keywords,

    // Canonical URL
    alternates: {
      canonical: articleUrl,
    },

    // Open Graph
    openGraph: {
      type: "article",
      url: articleUrl,
      title: article.title,
      description: article.excerpt,
      siteName,
      locale: "tr_TR",
      images: article.imageUrl
        ? [
            {
              url: article.imageUrl,
              width: 1200,
              height: 630,
              alt: article.title,
            },
          ]
        : [],
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: [siteName],
      section: article.category.name,
      tags: article.keywords,
    },

    // Twitter Card
    twitter: {
      card: "summary_large_image",
      site: process.env.TWITTER_HANDLE || "@aihaberleri",
      creator: process.env.TWITTER_HANDLE || "@aihaberleri",
      title: article.title,
      description: article.excerpt,
      images: article.imageUrl ? [article.imageUrl] : [],
    },

    // Robots
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    // Additional meta tags
    other: {
      "article:published_time": article.publishedAt?.toISOString() || "",
      "article:modified_time": article.updatedAt.toISOString(),
      "article:author": siteName,
      "article:section": article.category.name,
      "article:tag": article.keywords.join(","),
    },
  };
}

/**
 * Category için metadata
 */
export function generateCategoryMetadata(
  category: Category,
  articlesCount: number,
): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "AI Haberleri";
  const categoryUrl = `${baseUrl}/category/${category.slug}`;

  const description =
    category.description ||
    `${category.name} kategorisindeki ${articlesCount} haber. ${siteName}'de ${category.name} ile ilgili güncel gelişmeleri takip edin.`;

  return {
    title: `${category.name} Haberleri`,
    description,

    // Canonical URL
    alternates: {
      canonical: categoryUrl,
    },

    // Open Graph
    openGraph: {
      type: "website",
      url: categoryUrl,
      title: `${category.name} Haberleri`,
      description,
      siteName,
      locale: "tr_TR",
    },

    // Twitter Card
    twitter: {
      card: "summary",
      site: process.env.TWITTER_HANDLE || "@aihaberleri",
      title: `${category.name} Haberleri`,
      description,
    },

    // Robots
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  };
}

/**
 * Homepage için metadata
 */
export function generateHomeMetadata(): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "AI Haberleri";
  const description =
    "Yapay zeka dünyasındaki gelişmeleri yakından takip edin. Güncel AI haberleri, makine öğrenimi, derin öğrenme ve teknoloji haberleri.";

  return {
    title: {
      default: `${siteName} - Yapay Zeka Dünyasından Güncel Haberler`,
      template: `%s | ${siteName}`,
    },
    description,

    // Canonical URL
    alternates: {
      canonical: baseUrl,
    },

    // Open Graph
    openGraph: {
      type: "website",
      url: baseUrl,
      title: `${siteName} - Yapay Zeka Dünyasından Güncel Haberler`,
      description,
      siteName,
      locale: "tr_TR",
      images: [
        {
          url: `${baseUrl}/logos/og-image.png`,
          width: 1200,
          height: 630,
          alt: siteName,
        },
      ],
    },

    // Twitter Card
    twitter: {
      card: "summary_large_image",
      site: process.env.TWITTER_HANDLE || "@aihaberleri",
      title: `${siteName} - Yapay Zeka Dünyasından Güncel Haberler`,
      description,
      images: [`${baseUrl}/logos/og-image.png`],
    },

    // Robots
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

/**
 * Meta description optimize et
 * Max 160 karakter, keyword-rich
 */
export function optimizeMetaDescription(text: string, maxLength = 160): string {
  if (text.length <= maxLength) return text;

  // Son nokta veya virgülde kes
  const truncated = text.substring(0, maxLength);
  const lastPunctuation = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf(","),
    truncated.lastIndexOf("!"),
  );

  if (lastPunctuation > maxLength * 0.8) {
    return truncated.substring(0, lastPunctuation + 1);
  }

  // Son boşlukta kes ve "..." ekle
  const lastSpace = truncated.lastIndexOf(" ");
  return truncated.substring(0, lastSpace) + "...";
}

/**
 * Meta title optimize et
 * Max 60 karakter, keyword-rich
 */
export function optimizeMetaTitle(title: string, maxLength = 60): string {
  if (title.length <= maxLength) return title;

  // Son kelimede kes ve "..." ekle
  const truncated = title.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(" ");
  return truncated.substring(0, lastSpace) + "...";
}

/**
 * Keywords extract et (content'ten)
 */
export function extractKeywords(content: string, maxKeywords = 10): string[] {
  // HTML tags'leri temizle
  const cleanContent = content.replace(/<[^>]*>/g, " ");

  // Kelime frekansı analizi (basit)
  const words = cleanContent
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3); // 3 karakterden uzun kelimeler

  const frequency: Record<string, number> = {};
  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // En sık geçen kelimeleri al
  const sortedWords = Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);

  return sortedWords;
}
