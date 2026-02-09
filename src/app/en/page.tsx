/**
 * English version of the homepage
 * Route: /en
 */

export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TrendingSidebar } from "@/components/TrendingSidebar";
import { CategoryFilters } from "@/components/CategoryFilters";
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI News - Latest Artificial Intelligence News",
  description:
    "Stay updated with the latest news from artificial intelligence, machine learning, and technology world.",
  alternates: {
    canonical: "https://aihaberleri.org/en",
    languages: {
      tr: "https://aihaberleri.org",
      en: "https://aihaberleri.org/en",
    },
  },
};

async function getEnglishArticles() {
  // Get articles with English translations
  const translations = await db.articleTranslation.findMany({
    where: {
      locale: "en",
      article: {
        status: "PUBLISHED",
      },
    },
    include: {
      article: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      article: {
        publishedAt: "desc",
      },
    },
    take: 12,
  });

  return translations.map((t: any) => ({
    id: t.article.id,
    title: t.title,
    slug: t.slug,
    excerpt: t.excerpt || "",
    imageUrl: t.article.imageUrl,
    publishedAt: t.article.publishedAt,
    category: t.article.category,
    views: t.article.views,
  }));
}

async function getCategories() {
  return db.category.findMany({
    orderBy: { order: "asc" },
  });
}

async function getHeroArticles() {
  const translations = await db.articleTranslation.findMany({
    where: {
      locale: "en",
      article: {
        status: "PUBLISHED",
      },
    },
    include: {
      article: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      article: {
        publishedAt: "desc",
      },
    },
    take: 10,
  });

  return translations.map((t: any) => ({
    id: t.article.id,
    title: t.title,
    slug: t.slug,
    excerpt: t.excerpt || "",
    imageUrl: t.article.imageUrl,
    publishedAt: t.article.publishedAt,
    category: t.article.category,
  }));
}

export default async function EnglishHomePage() {
  // Structured Data
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  const [articles, categories, heroArticles] = await Promise.all([
    getEnglishArticles(),
    getCategories(),
    getHeroArticles(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-ai-background-dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateJsonLd({
          "@context": "https://schema.org",
          "@graph": [organizationSchema, websiteSchema],
        })}
      />
      <main className="flex-grow">
        {/* Hero Carousel - Latest 10 News (10 seconds auto-play) */}
        <HeroCarousel
          articles={heroArticles}
          locale="en"
          autoPlayInterval={10000}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Category Filter Chips */}
          <CategoryFilters categories={categories} locale="en" />

          {/* Main Content Area - Two Column Layout */}
          <div className="flex flex-col gap-10 lg:gap-12 lg:flex-row mt-8 lg:mt-10">
            {/* Left Column - Latest News */}
            <div className="flex-1 min-w-0">
              {/* Section Header */}
              <div className="mb-6 sm:mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 rounded-full bg-gradient-to-b from-ai-primary to-ai-primary-hover"></div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Latest Updates
                  </h2>
                </div>
                <Link
                  href="/en/news"
                  className="group flex items-center gap-1.5 text-sm font-semibold text-ai-primary hover:text-ai-primary-hover transition-colors duration-300"
                >
                  <span>View All</span>
                  <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              </div>

              {/* News Grid */}
              {articles.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-ai-surface-card rounded-xl lg:rounded-2xl border border-gray-200 dark:border-ai-surface-border shadow-sm">
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-ai-primary/20 to-ai-primary/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[36px] text-ai-primary">
                        translate
                      </span>
                    </div>
                  </div>
                  <p className="text-ai-text-secondary font-medium mb-4">
                    English translations are being prepared.
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-ai-primary hover:text-ai-primary-hover font-semibold transition-colors"
                  >
                    <span>View Turkish version</span>
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              ) : (
                  <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                    {articles.map((article: any, index: number) => (
                      <ArticleCard
                        key={article.id}
                        article={{
                          ...article,
                          publishedAt: article.publishedAt || new Date(),
                          category: {
                            name: article.category.name,
                            slug: article.category.slug,
                          },
                        }}
                        locale="en"
                      priority={index < 4}
                    />
                  ))}
                </div>
              )}

              {/* Load More Button */}
              {articles.length > 0 && (
                <div className="mt-8 sm:mt-10 text-center">
                  <Link
                    href="/en/news"
                    className="inline-block group rounded-xl border-2 border-gray-300 dark:border-ai-surface-border bg-transparent px-6 sm:px-8 py-3 text-sm font-bold text-slate-700 dark:text-white hover:bg-gray-100 dark:hover:bg-ai-surface-border hover:border-ai-primary/50 dark:hover:border-ai-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="flex items-center gap-2">
                      <span>Load More</span>
                      <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-y-0.5">
                        expand_more
                      </span>
                    </span>
                  </Link>
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <TrendingSidebar locale="en" />
          </div>
        </div>
      </main>
    </div>
  );
}
