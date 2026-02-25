"use client";

import { useState } from "react";
import Link from "next/link";
import { useTrendingArticles } from "@/hooks/use-trending";
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ad-slots";

interface TrendingSidebarProps {
  locale?: "tr" | "en";
}

type TimePeriod = "week" | "month" | "all";

const texts = {
  tr: {
    trendingNews: "Trend Haberler",
    top5: "Top 5",
    hot: "HOT",
    score: "Score",
    views: "",
    seeAll: "Tümünü Gör",
    periods: {
      week: "Bu Hafta",
      month: "Bu Ay",
      all: "Tüm Zamanlar",
    },
    noNews: "Bu dönem için haber yok",
  },
  en: {
    trendingNews: "Trending News",
    top5: "Top 5",
    hot: "HOT",
    score: "Score",
    views: "",
    seeAll: "See All",
    periods: {
      week: "This Week",
      month: "This Month",
      all: "All Time",
    },
    noNews: "No news for this period",
  },
};

export function TrendingSidebar({ locale = "tr" }: TrendingSidebarProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");
  const t = texts[locale];

  // SWR: auto-dedup, caching, background revalidation, keepPreviousData
  // Sort by trend score instead of views — locale ile dile göre filtrele
  const { data, isLoading: loading } = useTrendingArticles(
    timePeriod,
    5,
    "trend",
    locale,
  );
  const articles = data?.articles ?? [];

  const getArticleLink = (slug: string) => {
    return locale === "en" ? `/en/news/${slug}` : `/news/${slug}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  return (
    <aside className="w-full lg:w-80 lg:shrink-0 flex flex-col gap-5 lg:gap-6">
      {/* Trending News Card */}
      <div className="rounded-xl lg:rounded-2xl bg-white dark:bg-ai-surface-card border border-gray-100 dark:border-ai-surface-border p-0 overflow-hidden shadow-md dark:shadow-none">
        <div className="bg-gradient-to-r from-ai-primary/15 via-ai-primary/5 to-transparent p-4 sm:p-5 border-b border-gray-100 dark:border-ai-surface-border flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-ai-primary text-[20px] sm:text-[22px]">
              local_fire_department
            </span>
            {t.trendingNews}
          </h3>
          <Link
            href={locale === "en" ? "/en/trending" : "/trending"}
            className="text-[10px] sm:text-xs font-bold text-ai-primary bg-gradient-to-r from-ai-primary/20 to-ai-primary/10 px-2.5 py-1 rounded-lg border border-ai-primary/20 shadow-sm hover:from-ai-primary/30 hover:to-ai-primary/20 transition-colors"
          >
            {t.seeAll}
          </Link>
        </div>

        {/* Time Period Tabs */}
        <div className="flex border-b border-gray-100 dark:border-ai-surface-border/60">
          {(Object.keys(t.periods) as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              type="button"
              className={`flex-1 px-2 sm:px-3 py-2.5 text-[11px] sm:text-xs font-semibold transition-all duration-300 relative ${
                timePeriod === period
                  ? "text-ai-primary bg-ai-primary/5"
                  : "text-ai-text-secondary hover:text-white hover:bg-white/5"
              }`}
            >
              {t.periods[period]}
              {timePeriod === period && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-ai-primary to-ai-primary-hover"></span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="relative flex gap-3 sm:gap-4 p-3.5 sm:p-4 border-b border-gray-100 dark:border-ai-surface-border/60 animate-pulse"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : articles.length > 0 ? (
            articles.map((article, index) => (
              <Link
                key={article.id}
                href={getArticleLink(article.slug)}
                className="group relative flex gap-3 sm:gap-4 p-3.5 sm:p-4 hover:bg-gradient-to-r hover:from-gray-50 dark:hover:from-white/5 hover:to-transparent transition-all duration-300 border-b border-gray-100 dark:border-ai-surface-border/60 last:border-b-0"
              >
                {/* Hover Left Border */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-ai-primary via-ai-primary-hover to-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>

                {/* Rank Number */}
                <span className="text-3xl sm:text-4xl font-black text-gray-200 dark:text-gray-700/40 group-hover:text-ai-primary/10 transition-colors absolute right-2 sm:right-3 top-2 -z-10">
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* Rank Badge */}
                <div className="flex-shrink-0 relative">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-black text-white shadow-lg ${
                      index === 0
                        ? "bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500"
                        : index === 1
                          ? "bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500"
                          : index === 2
                            ? "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800"
                            : "bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 dark:from-gray-600 dark:via-gray-700 dark:to-gray-800"
                    }`}
                  >
                    {index + 1}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 z-10 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    {index === 0 && (
                      <span className="bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-500/30 shadow-sm">
                        {t.hot}
                      </span>
                    )}
                    {article.trendScore && (
                      <span className="text-[11px] text-ai-text-secondary flex items-center gap-0.5 font-medium">
                        <span className="material-symbols-outlined text-[12px] text-emerald-400">
                          trending_up
                        </span>
                        {article.trendScore.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-ai-primary transition-colors duration-300 line-clamp-2 leading-snug">
                    {article.title}
                  </h4>
                  <p className="text-[11px] text-ai-text-secondary flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[12px]">
                      visibility
                    </span>
                    {formatViews(article.views)}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-ai-text-secondary text-sm">
              <span className="material-symbols-outlined text-[32px] mb-2 block">
                trending_up
              </span>
                  {t.noNews}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Ad Slot — Sticky-friendly */}
      <AdSlot
        slot={AD_SLOTS.SIDEBAR_DISPLAY}
        format="vertical"
        minHeight={250}
        label={locale === "en" ? "Sponsored" : "Sponsorlu"}
        className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
      />
    </aside>
  );
}
