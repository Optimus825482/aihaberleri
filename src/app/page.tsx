import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TrendingSidebar } from "@/components/TrendingSidebar";
import { CategoryFilters } from "@/components/CategoryFilters";
import Link from "next/link";

import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateJsonLd,
} from "@/lib/seo";
import {
  BidvertiserBanner,
  BidvertiserNative,
} from "@/components/ads/BidvertiserAd";

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
        // Query 3: Hero Slider (Latest 10 news with images)
        db.article.findMany({
          where: {
            status: "PUBLISHED",
            publishedAt: { not: null },
            imageUrl: { not: null }, // Hero must have images
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
          orderBy: { publishedAt: "desc" }, // Latest first
          take: 10,
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
        {/* Hero Carousel - Son 10 Haber (10 saniye aralıklarla otomatik geçiş) */}
        <HeroCarousel
          articles={featuredArticles}
          locale="tr"
          autoPlayInterval={10000}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Category Filter Chips */}
          <CategoryFilters categories={categories} locale="tr" />

          {/* Main Content Area - Two Column Layout */}
          <div className="flex flex-col gap-10 lg:gap-12 lg:flex-row mt-8 lg:mt-10">
            {/* Left Column - Latest News */}
            <div className="flex-1 min-w-0">
              {/* Section Header */}
              <div className="mb-6 sm:mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 rounded-full bg-gradient-to-b from-ai-primary to-ai-primary-hover"></div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Son Gelişmeler
                  </h2>
                </div>
                <Link
                  href="/news"
                  className="group flex items-center gap-1.5 text-sm font-semibold text-ai-primary hover:text-ai-primary-hover transition-colors duration-300"
                >
                  <span>Tümünü Gör</span>
                  <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              </div>

              {/* News Grid */}
              <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                {articles.map((article, index: number) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    priority={index < 4}
                  />
                ))}
              </div>

              {/* Bidvertiser Ad - Between articles and empty state */}
              {articles.length > 0 && (
                <div className="my-6 flex justify-center">
                  <BidvertiserBanner
                    slot="homepage-banner"
                    className="hidden md:flex"
                  />
                  <BidvertiserNative
                    slot="homepage-native"
                    cols={2}
                    rows={1}
                    mobileCols={1}
                    imageWidth={150}
                    className="md:hidden"
                  />
                </div>
              )}

              {articles.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-ai-surface-card rounded-xl lg:rounded-2xl border border-gray-200 dark:border-ai-surface-border shadow-sm">
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-ai-primary/20 to-ai-primary/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[36px] text-ai-primary">
                        article
                      </span>
                    </div>
                  </div>
                  <p className="text-ai-text-secondary font-medium">
                    Henüz haber yok. Otonom agent yakında haber yayınlamaya
                    başlayacak!
                  </p>
                </div>
              )}

              {/* Load More Button */}
              {articles.length > 0 && (
                <div className="mt-8 sm:mt-10 text-center">
                  <Link
                    href="/news"
                    className="inline-block group rounded-xl border-2 border-gray-300 dark:border-ai-surface-border bg-transparent px-6 sm:px-8 py-3 text-sm font-bold text-slate-700 dark:text-white hover:bg-gray-100 dark:hover:bg-ai-surface-border hover:border-ai-primary/50 dark:hover:border-ai-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="flex items-center gap-2">
                      <span>Daha Fazla Yükle</span>
                      <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-y-0.5">
                        expand_more
                      </span>
                    </span>
                  </Link>
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
