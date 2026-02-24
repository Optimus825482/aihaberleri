/**
 * English version of the homepage
 * Route: /en
 */

export const dynamic = "force-dynamic";

import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TrendingSidebar } from "@/components/TrendingSidebar";
import { CategoryFilters } from "@/components/CategoryFilters";
import { TodayTrending } from "@/components/TodayTrending";
import { AdSlot } from "@/components/AdSlot";
import { AITermsGlossary } from "@/components/article/AITermsGlossary";
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
  try {
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
  } catch (error) {
    console.error("[EN_HOME] getEnglishArticles error:", error);
    return [];
  }
}

async function getCategories() {
  try {
    return await db.category.findMany({
      orderBy: { order: "asc" },
    });
  } catch (error) {
    console.error("[EN_HOME] getCategories error:", error);
    return [];
  }
}

async function getEnglishTopicHeatMap() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const topicFromDb = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: todayStart },
        topic: { not: null },
      },
      select: {
        topic: true,
        trendScore: true,
        publishedAt: true,
        title: true,
        titleEn: true,
        translations: {
          where: { locale: "en" },
          select: { title: true },
          take: 1,
        },
      },
      orderBy: { publishedAt: "asc" },
      take: 120,
    });

    const topicMap = new Map<string, { first: number; last: number; max: number; label: string }>();

    topicFromDb.forEach((item) => {
      if (!item.topic) return;
      const score = item.trendScore ?? 0;
      const label = item.translations[0]?.title || item.titleEn || item.title;
      const existing = topicMap.get(item.topic);

      if (!existing) {
        topicMap.set(item.topic, { first: score, last: score, max: score, label });
        return;
      }

      existing.last = score;
      existing.max = Math.max(existing.max, score);
      existing.label = label;
      topicMap.set(item.topic, existing);
    });

    return Array.from(topicMap.entries())
      .map(([topic, values]) => ({
        topic,
        score: values.max,
        rise: Math.max(0, values.last - values.first),
        label: values.label,
      }))
      .sort((a, b) => b.rise - a.rise || b.score - a.score)
      .slice(0, 5);
  } catch (error) {
    console.error("[EN_HOME] getEnglishTopicHeatMap error:", error);
    return [];
  }
}

export default async function EnglishHomePage() {
  // Structured Data
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  // Single query for articles — hero uses first 10, grid uses all 12
  const [articles, categories, topicHeatMap] = await Promise.all([
    getEnglishArticles(),
    getCategories(),
    getEnglishTopicHeatMap(),
  ]);

  const heroArticles = articles.slice(0, 10);

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
          <section className="mt-8 rounded-2xl border border-ai-surface-border bg-gradient-to-br from-ai-surface-card via-ai-surface-card to-ai-surface-dark p-5 sm:p-6">
            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[20px] text-orange-300">
                grid_view
              </span>
              <span className="bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300 bg-clip-text text-transparent">
                Topic Heat Map
              </span>
            </h2>
            <p className="text-xs text-ai-text-muted mb-4">
              Top 5 fastest-rising topics today (by trend score delta)
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {topicHeatMap.map((item, idx) => (
                <Link
                  key={item.topic}
                  href={`/search?q=${encodeURIComponent(item.label)}&mode=topic&topic=${encodeURIComponent(item.topic)}`}
                  className="group rounded-xl border border-ai-surface-border bg-ai-surface-dark/90 p-3.5 hover:border-ai-primary/40 hover:bg-ai-surface-card transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] text-ai-text-muted">#{idx + 1} rising topic</p>
                    <span className="rounded-full border border-ai-primary/30 bg-ai-primary/10 px-2 py-0.5 text-[10px] font-semibold text-ai-primary">
                      {item.rise > 0 ? "Rising" : "Stable"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-white line-clamp-2 group-hover:text-ai-primary transition-colors">
                    {item.label}
                  </p>

                  <p className="mt-2 text-xs text-ai-text-secondary">
                    {item.rise > 0 ? `Rise +${item.rise}` : "No rise"} · Score {item.score}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <AdSlot
            slot="6653849624"
            format="fluid"
            layoutKey="-5t+c9-b-4l+mn"
            minHeight={120}
            label="Sponsored"
            className="mt-6 rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
          />

          {/* Category Filter Chips */}
          <CategoryFilters categories={categories} locale="en" />

          {/* Today's Trending — Top 5 by trend score */}
          <div className="mt-8">
            <TodayTrending locale="en" />
          </div>

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
                    <React.Fragment key={article.id}>
                      <ArticleCard
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
                      {/* In-feed ad after every 4th article */}
                      {(index + 1) % 4 === 0 && index < articles.length - 1 && (
                        <div className="col-span-1 sm:col-span-2">
                          <AdSlot
                            slot="8493771212"
                            format="fluid"
                            layoutKey="-6t+ed+2i-1n-4w"
                            minHeight={100}
                            label="Sponsored"
                            className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
                          />
                        </div>
                      )}
                    </React.Fragment>
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

          <section className="mt-12 rounded-2xl border border-ai-surface-border bg-ai-surface-card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-ai-primary">
                  glossary
                </span>
                AI Terms Glossary
              </h2>
              <Link
                href="/en/ai-terms"
                className="text-xs font-semibold text-ai-primary hover:text-ai-primary-hover"
              >
                Open Glossary
              </Link>
            </div>

            <AITermsGlossary
              title="Trending AI Terms"
              maxTerms={12}
              glossaryPagePath="/en/ai-terms"
              viewAllLabel="View All"
              className="mb-0"
            />
          </section>
        </div>
      </main>
    </div>
  );
}
