"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TrendingArticle {
  id: string;
  title: string;
  slug: string;
  views: number;
  trendScore?: number | null;
}

interface AITool {
  id: string;
  name: string;
  category: string;
  pricingType: "free" | "paid" | "freemium";
}

interface TrendingSidebarProps {
  locale?: "tr" | "en";
}

type TimePeriod = "today" | "week" | "month" | "all";

const aiTools: AITool[] = [
  { id: "1", name: "ChatGPT Plus", category: "Chatbot", pricingType: "free" },
  { id: "2", name: "Midjourney", category: "Image Gen", pricingType: "paid" },
  { id: "3", name: "Notion AI", category: "Productivity", pricingType: "freemium" },
  { id: "4", name: "Claude", category: "Chatbot", pricingType: "freemium" },
  { id: "5", name: "GitHub Copilot", category: "Coding", pricingType: "paid" },
];

const texts = {
  tr: {
    trendingNews: "Trend Haberler",
    top5: "Top 5",
    hot: "HOT",
    score: "Score",
    views: "",
    aiTools: "Top 5 AI Araçları",
    all: "Tümü",
    specialReport: "Özel Rapor",
    reportDesc: "Yapay Zeka Sektör Raporu 2024 Yayında! Hemen indirin.",
    downloadReport: "Raporu İndir",
    periods: {
      today: "Bugün",
      week: "Bu Hafta",
      month: "Bu Ay",
      all: "Tüm Zamanlar",
    },
  },
  en: {
    trendingNews: "Trending News",
    top5: "Top 5",
    hot: "HOT",
    score: "Score",
    views: "",
    aiTools: "Top 5 AI Tools",
    all: "All",
    specialReport: "Special Report",
    reportDesc: "AI Sector Report 2024 is now available! Download now.",
    downloadReport: "Download Report",
    periods: {
      today: "Today",
      week: "This Week",
      month: "This Month",
      all: "All Time",
    },
  },
};

const getPricingLabel = (type: AITool["pricingType"]) => {
  const labels = {
    free: { text: "Free", color: "bg-emerald-500/10 text-emerald-500" },
    paid: { text: "Paid", color: "bg-blue-500/10 text-blue-500" },
    freemium: { text: "Freemium", color: "bg-yellow-500/10 text-yellow-500" },
  };
  return labels[type];
};

export function TrendingSidebar({ locale = "tr" }: TrendingSidebarProps) {
  const [articles, setArticles] = useState<TrendingArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");
  const t = texts[locale];

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const periodMap: Record<TimePeriod, string> = {
          today: "today",
          week: "week",
          month: "month",
          all: "all",
        };
        const res = await fetch(`/api/most-read?period=${periodMap[timePeriod]}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles || []);
        }
      } catch (error) {
        console.error("Failed to fetch trending articles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [timePeriod]);

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
      <div className="rounded-xl lg:rounded-2xl bg-white dark:bg-ai-surface-card border border-gray-100 dark:border-ai-surface-border p-0 overflow-hidden shadow-md dark:shadow-none sticky top-24">
        <div className="bg-gradient-to-r from-ai-primary/15 via-ai-primary/5 to-transparent p-4 sm:p-5 border-b border-gray-100 dark:border-ai-surface-border flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-ai-primary text-[20px] sm:text-[22px]">local_fire_department</span>
            {t.trendingNews}
          </h3>
          <span className="text-[10px] sm:text-xs font-bold text-ai-primary bg-gradient-to-r from-ai-primary/20 to-ai-primary/10 px-2.5 py-1 rounded-lg border border-ai-primary/20 shadow-sm">
            {t.top5}
          </span>
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
              <div key={i} className="relative flex gap-3 sm:gap-4 p-3.5 sm:p-4 border-b border-gray-100 dark:border-ai-surface-border/60 animate-pulse">
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
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-black text-white shadow-lg ${
                    index === 0
                      ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500'
                      : index === 1
                      ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500'
                      : index === 2
                      ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800'
                      : 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 dark:from-gray-600 dark:via-gray-700 dark:to-gray-800'
                  }`}>
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
                        <span className="material-symbols-outlined text-[12px] text-emerald-400">trending_up</span>
                        {article.trendScore.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-ai-primary transition-colors duration-300 line-clamp-2 leading-snug">
                    {article.title}
                  </h4>
                  <p className="text-[11px] text-ai-text-secondary flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                    {formatViews(article.views)}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-ai-text-secondary text-sm">
              <span className="material-symbols-outlined text-[32px] mb-2 block">trending_up</span>
              Bu dönem için haber yok
            </div>
          )}
        </div>
      </div>

      {/* AI Tools Card */}
      <div className="rounded-xl lg:rounded-2xl bg-white dark:bg-ai-surface-card border border-gray-100 dark:border-ai-surface-border p-5 shadow-md dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-yellow-500 text-[20px]">construction</span>
            {t.aiTools}
          </h3>
          <Link
            href="/category/ai-araclari"
            className="text-[11px] sm:text-xs font-semibold text-ai-primary hover:text-ai-primary-hover transition-colors"
          >
            {t.all}
          </Link>
        </div>

        <div className="space-y-2.5">
          {aiTools.map((tool) => {
            const pricing = getPricingLabel(tool.pricingType);
            const initials = tool.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

            return (
              <div
                key={tool.id}
                className="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-gray-300 shadow-inner">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-ai-primary transition-colors duration-300">
                      {tool.name}
                    </p>
                    <p className="text-[10px] text-ai-text-secondary font-medium">{tool.category}</p>
                  </div>
                </div>
                <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-lg ${pricing.color} shadow-sm`}>
                  {pricing.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Special Report Card */}
      <div>
        <div className="rounded-xl lg:rounded-2xl bg-gradient-to-br from-ai-primary via-ai-primary-hover to-blue-700 p-5 text-white shadow-xl shadow-ai-primary/30 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[24px]">description</span>
            <h4 className="font-bold text-base">{t.specialReport}</h4>
          </div>
          <p className="mb-4 text-xs sm:text-sm opacity-90 leading-relaxed">{t.reportDesc}</p>
          <button
            type="button"
            className="w-full rounded-xl bg-white py-2.5 text-xs sm:text-sm font-bold text-ai-primary hover:bg-gray-50 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
          >
            {t.downloadReport}
          </button>
        </div>
      </div>
    </aside>
  );
}
