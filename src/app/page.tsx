import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { MostReadSidebarClient } from "@/components/MostReadSidebarClient";
import { Newspaper } from "lucide-react";

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
      <div className="min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={generateJsonLd({
            "@context": "https://schema.org",
            "@graph": [organizationSchema, websiteSchema],
          })}
        />
        <main className="flex-1">
          <section className="container mx-auto px-4 py-12">
            <h2 className="text-3xl font-bold mb-8">Son Haberler</h2>
            <div className="text-center py-12">
              <p className="text-muted-foreground">Yükleniyor...</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Fetch settings and articles in PARALLEL for better performance
  let settings = {
    heroCarouselCount: 5,
    heroCarouselInterval: 6000,
  };
  let articles: any[] = [];
  let heroArticles: any[] = [];

  try {
    // PARALLEL QUERIES - Much faster than sequential
    const [settingsFromDb, articlesFromDb, heroArticlesFromDb] =
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
          take: 5, // Use default instead of settings for faster query
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
  } catch (error) {
    console.error("Failed to fetch data:", error);
    // Fallbacks are already set
  }

  return (
    <div className="min-h-screen flex flex-col">
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

        {/* Main Content Area - Two Column Layout */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Latest News */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Newspaper className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Son Haberler</h2>
              </div>

              {/* Horizontal Scrolling News Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {articles.map((article, index: number) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    priority={index < 3}
                  />
                ))}
              </div>

              {articles.length === 0 && (
                <div className="text-center py-12 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground">
                    Henüz haber yok. Otonom agent yakında haber yayınlamaya
                    başlayacak!
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Most Read Sidebar */}
            <div className="w-full lg:w-96 xl:w-[420px] flex-shrink-0">
              <MostReadSidebarClient />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
