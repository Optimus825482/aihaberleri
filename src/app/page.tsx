import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { HeroSection } from "@/components/HeroSection";
import { TrendingSidebar } from "@/components/TrendingSidebar";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import { CategoryFilters } from "@/components/CategoryFilters";
import Link from "next/link";

import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateJsonLd,
} from "@/lib/seo";

// Force dynamic rendering - database queries require runtime
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  // Structured Data
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  // Skip database queries during build
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return (
      <div className="min-h-screen flex flex-col bg-ai-background-dark">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={generateJsonLd({
            "@context": "https://schema.org",
            "@graph": [organizationSchema, websiteSchema],
          })}
        />
        <main className="flex-1">
          <section className="container mx-auto px-4 py-12 max-w-7xl">
            <h2 className="text-3xl font-bold mb-8 text-white">Son Haberler</h2>
            <div className="text-center py-12">
              <p className="text-ai-text-secondary">Yükleniyor...</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Fetch data
  let settings = {
    heroCarouselCount: 5,
    heroCarouselInterval: 8000,
  };
  let articles: any[] = [];
  let featuredArticles: any[] = [];
  let categories: any[] = [];

  try {
    const [settingsFromDb, articlesFromDb, featuredFromDb, categoriesFromDb] =
      await Promise.all([
        // Query 1: Settings
        db.setting.findMany({
          where: {
            key: {
              in: ["heroCarouselCount", "heroCarouselInterval"],
            },
          },
          select: {
            key: true,
            value: true,
          },
        }),
        // Query 2: Latest articles (excluding featured)
        db.article.findMany({
          where: {
            status: "PUBLISHED",
            publishedAt: { not: null },
          },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            imageUrl: true,
            publishedAt: true,
            views: true,
            trendScore: true,
            category: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          orderBy: {
            publishedAt: "desc",
          },
          take: 8,
        }),
        // Query 3: Featured articles (multiple for slider)
        db.article.findMany({
          where: {
            status: "PUBLISHED",
            publishedAt: { not: null },
          },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            imageUrl: true,
            publishedAt: true,
            views: true,
            trendScore: true,
            category: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
          take: 5,
        }),
        // Query 4: Categories for filter chips
        db.category.findMany({
          orderBy: { order: "asc" },
          take: 8,
        }),
      ]);

    // Process settings
    const settingsMap = settingsFromDb.reduce(
      (acc, setting) => {
        acc[setting.key] = parseInt(setting.value);
        return acc;
      },
      {} as Record<string, number>,
    );

    settings = {
      heroCarouselCount: settingsMap.heroCarouselCount || 5,
      heroCarouselInterval: settingsMap.heroCarouselInterval || 8000,
    };

    articles = articlesFromDb;
    featuredArticles = featuredFromDb;
    categories = categoriesFromDb;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }

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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Hero Section - Öne Çıkan Haberler (Slider) */}
          <HeroSection
            featuredArticles={featuredArticles}
            locale="tr"
          />

          {/* Newsletter CTA Cards */}
          <NewsletterCTA locale="tr" />

          {/* Category Filter Chips */}
          <CategoryFilters
            categories={categories}
            locale="tr"
          />

          {/* Main Content Area - Two Column Layout */}
          <div className="flex flex-col gap-12 lg:flex-row">
            {/* Left Column - Latest News */}
            <div className="flex-1">
              {/* Section Header */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Son Gelişmeler
                </h2>
                <Link
                  href="/haberler"
                  className="text-sm font-medium text-ai-primary hover:text-ai-primary/80"
                >
                  Tümünü Gör →
                </Link>
              </div>

              {/* News Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
                {articles.map((article, index: number) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    priority={index < 4}
                  />
                ))}
              </div>

              {articles.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-ai-surface-card rounded-xl border border-gray-200 dark:border-ai-surface-border">
                  <span className="material-symbols-outlined text-[48px] text-ai-text-muted mb-4">
                    article
                  </span>
                  <p className="text-ai-text-secondary">
                    Henüz haber yok. Otonom agent yakında haber yayınlamaya başlayacak!
                  </p>
                </div>
              )}

              {/* Load More Button */}
              {articles.length > 0 && (
                <div className="mt-8 text-center">
                  <button className="rounded-lg border border-gray-300 dark:border-ai-surface-border bg-transparent px-6 py-3 text-sm font-bold text-slate-700 dark:text-white hover:bg-gray-100 dark:hover:bg-ai-surface-border transition-colors">
                    Daha Fazla Yükle
                  </button>
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <TrendingSidebar locale="tr" />
          </div>
        </div>
      </main>
    </div>
  );
}
