import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { MostReadSidebarClient } from "@/components/MostReadSidebarClient";
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

  // Fetch settings, articles, and categories in PARALLEL
  let settings = {
    heroCarouselCount: 5,
    heroCarouselInterval: 6000,
  };
  let articles: any[] = [];
  let heroArticles: any[] = [];
  let categories: any[] = [];

  try {
    const [settingsFromDb, articlesFromDb, heroArticlesFromDb, categoriesFromDb] =
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
        // Query 2: Latest articles
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
          take: 12,
        }),
        // Query 3: Hero articles
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
            category: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          orderBy: [{ publishedAt: "desc" }, { views: "desc" }],
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
      heroCarouselInterval: settingsMap.heroCarouselInterval || 6000,
    };

    articles = articlesFromDb;
    heroArticles = heroArticlesFromDb;
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
      <main className="flex-1">
        {/* Hero Carousel - Manşet Haberleri */}
        <HeroCarousel
          articles={heroArticles}
          autoPlayInterval={settings.heroCarouselInterval}
          locale="tr"
        />

        {/* Category Filter Chips */}
        <section className="border-b border-ai-surface-border bg-ai-surface-dark/50">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-ai-primary text-white text-sm font-medium whitespace-nowrap transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">apps</span>
                Tümü
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-ai-surface-card hover:bg-ai-surface-hover text-ai-text-secondary hover:text-white text-sm font-medium whitespace-nowrap transition-colors border border-ai-surface-border"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content Area - Two Column Layout */}
        <section className="container mx-auto px-4 py-10 lg:py-14 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
            {/* Left Column - Latest News */}
            <div className="flex-1">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-ai-primary/10">
                    <span className="material-symbols-outlined text-ai-primary text-[22px]">
                      newspaper
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Son Haberler</h2>
                    <p className="text-sm text-ai-text-muted">Güncel AI gelişmeleri</p>
                  </div>
                </div>
                <Link
                  href="/haberler"
                  className="flex items-center gap-1 text-sm text-ai-primary hover:text-ai-primary-hover transition-colors group"
                >
                  Tümünü Gör
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </Link>
              </div>

              {/* News Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {articles.map((article, index: number) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    priority={index < 4}
                  />
                ))}
              </div>

              {articles.length === 0 && (
                <div className="text-center py-16 bg-ai-surface-card rounded-xl border border-ai-surface-border">
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
                  <Link
                    href="/haberler"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-ai-surface-card hover:bg-ai-surface-hover border border-ai-surface-border rounded-xl text-white font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    Daha Fazla Haber
                  </Link>
                </div>
              )}
            </div>

            {/* Right Column - Sidebars */}
            <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 space-y-6">
              {/* Most Read Sidebar */}
              <MostReadSidebarClient />

              {/* AI Tools CTA Card */}
              <div className="bg-gradient-to-br from-ai-primary/20 to-ai-surface-card rounded-xl border border-ai-surface-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-ai-primary/20">
                    <span className="material-symbols-outlined text-ai-primary text-[22px]">
                      psychology
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">AI Araçları</h3>
                </div>
                <p className="text-sm text-ai-text-secondary mb-4">
                  En popüler yapay zeka araçlarını keşfedin ve üretkenliğinizi artırın.
                </p>
                <Link
                  href="/category/ai-araclari"
                  className="inline-flex items-center gap-2 text-sm text-ai-primary hover:text-ai-primary-hover font-medium transition-colors"
                >
                  Araçları İncele
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {/* Newsletter Card */}
              <div className="bg-ai-surface-card rounded-xl border border-ai-surface-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-ai-primary/20">
                    <span className="material-symbols-outlined text-ai-primary text-[22px]">
                      mail
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Haftalık Bülten</h3>
                </div>
                <p className="text-sm text-ai-text-secondary mb-4">
                  Her hafta en önemli AI haberlerini e-posta kutunuza alalım.
                </p>
                <Link
                  href="#newsletter"
                  className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 bg-ai-primary hover:bg-ai-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">notifications</span>
                  Abone Ol
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
