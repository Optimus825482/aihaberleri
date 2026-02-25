import React from "react";
import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TrendingSidebar } from "@/components/TrendingSidebar";
import { CategoryFilters } from "@/components/CategoryFilters";
import { TodayTrending } from "@/components/TodayTrending";
import Link from "next/link";
import Image from "next/image";
import { AudioPlayer } from "@/components/AudioPlayer";
import { AdSlot } from "@/components/AdSlot";
import { AITermsGlossary } from "@/components/article/AITermsGlossary";
import { getArticleInsightDisplaySettings } from "@/lib/article-insights";

import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const formatTopicLabel = (topic: string) => {
    return topic
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((word) =>
        word.length <= 2
          ? word.toUpperCase()
          : word.charAt(0).toUpperCase() + word.slice(1),
      )
      .join(" ");
  };

  const getHeatLabel = (rise: number) => {
    if (rise >= 15) return "Sıcak";
    if (rise >= 6) return "Yükselişte";
    if (rise >= 1) return "Hareketli";
    return "Stabil";
  };

  const getHeatBarWidthClass = (score: number) => {
    if (score >= 50) return "w-full";
    if (score >= 45) return "w-11/12";
    if (score >= 40) return "w-5/6";
    if (score >= 35) return "w-2/3";
    if (score >= 30) return "w-1/2";
    return "w-1/3";
  };

  const getHeatTone = (idx: number) => {
    if (idx === 0) {
      return {
        badge: "border-rose-400/40 bg-rose-500/15 text-rose-300",
        bar: "bg-rose-400",
      };
    }
    if (idx === 1) {
      return {
        badge: "border-orange-400/40 bg-orange-500/15 text-orange-300",
        bar: "bg-orange-400",
      };
    }
    if (idx === 2) {
      return {
        badge: "border-amber-400/40 bg-amber-500/15 text-amber-300",
        bar: "bg-amber-400",
      };
    }
    if (idx === 3) {
      return {
        badge: "border-cyan-400/40 bg-cyan-500/15 text-cyan-300",
        bar: "bg-cyan-400",
      };
    }
    return {
      badge: "border-violet-400/40 bg-violet-500/15 text-violet-300",
      bar: "bg-violet-400",
    };
  };

  const companyBadgeMap: Record<
    string,
    { monogram: string; bgClass: string; ringClass: string; logoPath?: string }
  > = {
    OpenAI: {
      monogram: "OA",
      bgClass: "bg-emerald-500/20 text-emerald-300",
      ringClass: "ring-emerald-500/30",
      logoPath: "/logos/companies/openai.svg",
    },
    Google: {
      monogram: "G",
      bgClass: "bg-blue-500/20 text-blue-300",
      ringClass: "ring-blue-500/30",
      logoPath: "/logos/companies/google.svg",
    },
    Anthropic: {
      monogram: "AN",
      bgClass: "bg-amber-500/20 text-amber-300",
      ringClass: "ring-amber-500/30",
      logoPath: "/logos/companies/anthropic.svg",
    },
    Meta: {
      monogram: "M",
      bgClass: "bg-sky-500/20 text-sky-300",
      ringClass: "ring-sky-500/30",
      logoPath: "/logos/companies/meta.svg",
    },
    Microsoft: {
      monogram: "MS",
      bgClass: "bg-indigo-500/20 text-indigo-300",
      ringClass: "ring-indigo-500/30",
      logoPath: "/logos/companies/microsoft.svg",
    },
    NVIDIA: {
      monogram: "NV",
      bgClass: "bg-lime-500/20 text-lime-300",
      ringClass: "ring-lime-500/30",
      logoPath: "/logos/companies/nvidia.svg",
    },
  };

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
  let briefingArticles: Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    trendScore: number | null;
    category: { name: string; slug: string };
  }> = [];
  let topicHeatMap: Array<{
    topic: string;
    score: number;
    rise: number;
    label: string;
  }> = [];
  let modelTagCards: Array<{ label: string; count: number }> = [];
  let featureSettings = {
    showDailyBriefing: true,
    showGlossary: true,
    showModelCards: true,
    showHeatMap: true,
  };

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      settingsFromDb,
      articlesFromDb,
      featuredFromDb,
      categoriesFromDb,
      briefingFromDb,
      topicFromDb,
      modelTagSource,
    ] = await Promise.all([
      // Query 1: Settings
      db.setting.findMany({
        where: {
          key: {
            in: [
              "heroCarouselCount",
              "heroCarouselInterval",
              "site_feature_daily_briefing",
              "site_feature_glossary",
              "site_feature_model_cards",
              "site_feature_heat_map",
            ],
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
      // Query 5: Daily briefing set
      db.article.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: { gte: todayStart },
        },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          trendScore: true,
          category: { select: { name: true, slug: true } },
        },
        orderBy: [{ trendScore: "desc" }, { publishedAt: "desc" }],
        take: 8,
      }),
      // Query 6: Topic heat map source (today)
      db.article.findMany({
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
        },
        orderBy: { publishedAt: "asc" },
        take: 120,
      }),
      // Query 7: Model/company cards source
      db.article.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: { not: null },
        },
        select: {
          title: true,
          excerpt: true,
        },
        orderBy: { publishedAt: "desc" },
        take: 120,
      }),
    ]);

    featureSettings = await getArticleInsightDisplaySettings(
      async () => settingsFromDb,
    );

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
    briefingArticles = briefingFromDb;

    const topicMap = new Map<
      string,
      { first: number; last: number; max: number; label: string }
    >();
    topicFromDb.forEach((item) => {
      if (!item.topic) return;
      const score = item.trendScore ?? 0;
      const existing = topicMap.get(item.topic);

      if (!existing) {
        topicMap.set(item.topic, {
          first: score,
          last: score,
          max: score,
          label: item.title,
        });
        return;
      }

      existing.last = score;
      existing.max = Math.max(existing.max, score);
      existing.label = item.title;
      topicMap.set(item.topic, existing);
    });

    topicHeatMap = Array.from(topicMap.entries())
      .map(([topic, values]) => ({
        topic,
        score: values.max,
        rise: Math.max(0, values.last - values.first),
        label: values.label,
      }))
      .sort((a, b) => b.rise - a.rise || b.score - a.score)
      .slice(0, 5);

    const modelLabels = [
      "OpenAI",
      "Google",
      "Anthropic",
      "Meta",
      "Microsoft",
      "NVIDIA",
    ];
    modelTagCards = modelLabels.map((label) => {
      const count = modelTagSource.filter((item) => {
        const haystack = `${item.title} ${item.excerpt ?? ""}`.toLowerCase();
        return haystack.includes(label.toLowerCase());
      }).length;

      return { label, count };
    });
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }

  const briefingTop5 = briefingArticles.slice(0, 5);
  const briefingText = briefingTop5
    .map(
      (article, index) =>
        `${index + 1}. ${article.title}. ${article.excerpt || "Kısa özet mevcut değil."}`,
    )
    .join(" ");

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
          {featureSettings.showDailyBriefing && (
            <section className="mb-8 rounded-2xl border border-ai-surface-border bg-ai-surface-card p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-ai-primary">
                    overview
                  </span>
                  Günlük Brifing Modu · 5 dakikada özet
                </h2>
                <Link
                  href="/trending"
                  className="text-xs font-semibold text-ai-primary hover:text-ai-primary-hover"
                >
                  Trendleri Aç
                </Link>
              </div>

              {briefingTop5.length > 0 ? (
                <>
                  <ul className="space-y-2 mb-4">
                    {briefingTop5.map((article, idx) => (
                      <li
                        key={article.id}
                        className="text-sm text-ai-text-secondary flex items-start gap-2"
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ai-primary/20 text-[11px] font-bold text-ai-primary">
                          {idx + 1}
                        </span>
                        <Link
                          href={`/news/${article.slug}`}
                          className="hover:text-white transition-colors"
                        >
                          {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <details className="group">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-ai-primary">
                      İsteğe bağlı sesli brifingi aç
                    </summary>
                    <div className="mt-3">
                      <AudioPlayer
                        title="Günlük Brifing"
                        text={
                          briefingText ||
                          "Bugün için öne çıkan haber bulunamadı."
                        }
                      />
                    </div>
                  </details>
                </>
              ) : (
                <p className="text-sm text-ai-text-secondary">
                  Bugün için brifing verisi henüz oluşmadı.
                </p>
              )}
            </section>
          )}

          {/* Today's Trending — Top 5 by trend score (VURGULU - önce göster) */}
          <TodayTrending locale="tr" />

          {featureSettings.showModelCards && (
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modelTagCards.map((item) => {
                const badge = companyBadgeMap[item.label] || {
                  monogram: item.label.slice(0, 2).toUpperCase(),
                  bgClass: "bg-zinc-500/20 text-zinc-200",
                  ringClass: "ring-zinc-500/30",
                };

                return (
                  <Link
                    key={item.label}
                    href={`/search?q=${encodeURIComponent(item.label)}&mode=company`}
                    className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-4 hover:border-ai-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black ring-1 ${badge.bgClass} ${badge.ringClass}`}
                      >
                        {badge.logoPath ? (
                          <Image
                            src={badge.logoPath}
                            alt={`${item.label} logo`}
                            width={24}
                            height={24}
                            className="h-6 w-6"
                          />
                        ) : (
                          badge.monogram
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-ai-text-muted">
                          Model/Şirket Kartı
                        </p>
                        <p className="text-base font-bold text-white truncate">
                          {item.label}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-ai-text-secondary mt-3">
                      {item.count} ilgili haber kümesi
                    </p>
                  </Link>
                );
              })}
            </section>
          )}

          {featureSettings.showHeatMap && (
            <section className="mt-8 rounded-2xl border border-ai-surface-border bg-gradient-to-br from-ai-surface-card via-ai-surface-card to-ai-surface-dark p-5 sm:p-6">
              <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[20px] text-orange-300">
                  grid_view
                </span>
                <span className="bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300 bg-clip-text text-transparent">
                  Gündem Isı Haritası
                </span>
              </h2>
              <p className="text-xs text-ai-text-muted mb-4">
                Bugün en hızlı yükselen 5 konu (trendScore farkı bazlı)
              </p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {topicHeatMap.map((item, idx) => {
                  const tone = getHeatTone(idx);

                  return (
                    <Link
                      key={item.topic}
                      href={`/search?q=${encodeURIComponent(item.label || formatTopicLabel(item.topic))}&mode=topic&topic=${encodeURIComponent(item.topic)}`}
                      className="group rounded-xl border border-ai-surface-border bg-ai-surface-dark/90 p-3.5 hover:border-ai-primary/40 hover:bg-ai-surface-card transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] text-ai-text-muted">
                          #{idx + 1} yükselen konu
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}
                        >
                          {getHeatLabel(item.rise)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-semibold text-white line-clamp-2 group-hover:text-ai-primary transition-colors">
                        {item.label || formatTopicLabel(item.topic)}
                      </p>

                      <div className="mt-3 space-y-2">
                        <div className="h-1.5 w-full rounded-full bg-ai-surface-border overflow-hidden">
                          <div
                            className={`h-full rounded-full ${tone.bar} ${getHeatBarWidthClass(item.score)}`}
                          />
                        </div>
                        <p className="text-xs text-ai-text-secondary">
                          {item.rise > 0 ? `Artış +${item.rise}` : "Artış yok"}{" "}
                          · Skor {item.score}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <AdSlot
            slot="3977540197"
            minHeight={120}
            label="Sponsorlu"
            className="mt-6 rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
          />

          {/* Category Filter Chips (kompakt) */}
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
                  <React.Fragment key={article.id}>
                    <ArticleCard article={article} priority={index < 4} />
                    {/* In-feed ad after every 4th article */}
                    {(index + 1) % 4 === 0 && index < articles.length - 1 && (
                      <div className="col-span-1 sm:col-span-2">
                        <AdSlot
                          slot="2042719998"
                          format="fluid"
                          layout="in-feed"
                          layoutKey="-6t+ed+2i-1n-4w"
                          minHeight={100}
                          label="Sponsorlu"
                          className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

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

          {featureSettings.showGlossary && (
            <section className="mt-12 rounded-2xl border border-ai-surface-border bg-ai-surface-card p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-ai-primary">
                    glossary
                  </span>
                  AI Terimler Sözlüğü
                </h2>
                <Link
                  href="/ai-terimler"
                  className="text-xs font-semibold text-ai-primary hover:text-ai-primary-hover"
                >
                  Tüm Sözlüğe Git
                </Link>
              </div>

              <AITermsGlossary
                title="Gündemdeki AI Terimleri"
                maxTerms={12}
                className="mb-0"
              />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
