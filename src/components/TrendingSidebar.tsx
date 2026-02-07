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
  const t = texts[locale];

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/most-read?period=week&limit=5`);
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
  }, []);

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
    <aside className="w-full lg:w-80 lg:shrink-0 flex flex-col gap-6">
      {/* Trending News Card */}
      <div className="rounded-xl bg-white dark:bg-ai-surface-card border border-gray-100 dark:border-ai-surface-border p-0 overflow-hidden sticky top-24">
        <div className="bg-gradient-to-r from-ai-primary/10 to-transparent p-4 border-b border-gray-100 dark:border-ai-surface-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-ai-primary">local_fire_department</span>
            {t.trendingNews}
          </h3>
          <span className="text-xs font-semibold text-ai-primary bg-ai-primary/10 px-2 py-1 rounded">
            {t.top5}
          </span>
        </div>

        <div className="flex flex-col">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="relative flex gap-4 p-4 border-b border-gray-100 dark:border-ai-surface-border animate-pulse">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : articles.length > 0 ? (
            articles.map((article, index) => (
              <Link
                key={article.id}
                href={getArticleLink(article.slug)}
                className="group relative flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-ai-surface-border last:border-b-0"
              >
                {/* Hover Left Border */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-ai-primary to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                {/* Rank Number */}
                <span className="text-3xl font-black text-gray-200 dark:text-gray-700/50 group-hover:text-ai-primary/20 transition-colors absolute right-2 top-0 -z-10">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="flex flex-col gap-1 z-10">
                  <div className="flex items-center gap-2 mb-1">
                    {index === 0 && (
                      <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-500/20">
                        {t.hot}
                      </span>
                    )}
                    {article.trendScore && (
                      <span className="text-xs text-ai-text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px] text-emerald-400">trending_up</span>
                        {article.trendScore.toFixed(1)} {t.score}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-ai-primary transition-colors line-clamp-2 leading-snug">
                    {article.title}
                  </h4>
                  <p className="mt-1 text-xs text-ai-text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                    {formatViews(article.views)}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-ai-text-secondary text-sm">
              <span className="material-symbols-outlined text-[32px] mb-2 block">trending_up</span>
              Henüz trend verisi yok
            </div>
          )}
        </div>
      </div>

      {/* AI Tools Card */}
      <div className="rounded-xl bg-white dark:bg-ai-surface-card border border-gray-100 dark:border-ai-surface-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-yellow-400">construction</span>
            {t.aiTools}
          </h3>
          <Link
            href="/category/ai-araclari"
            className="text-xs text-ai-primary hover:underline"
          >
            {t.all}
          </Link>
        </div>

        <div className="space-y-3">
          {aiTools.map((tool) => {
            const pricing = getPricingLabel(tool.pricingType);
            const initials = tool.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

            return (
              <div
                key={tool.id}
                className="flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-gray-300">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-ai-primary transition-colors">
                      {tool.name}
                    </p>
                    <p className="text-[10px] text-ai-text-secondary">{tool.category}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${pricing.color}`}>
                  {pricing.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Special Report Card */}
      <div>
        <div className="rounded-lg bg-gradient-to-br from-ai-primary to-blue-700 p-4 text-white">
          <h4 className="mb-2 font-bold">{t.specialReport}</h4>
          <p className="mb-3 text-xs opacity-90">{t.reportDesc}</p>
          <button className="w-full rounded bg-white py-2 text-xs font-bold text-ai-primary hover:bg-gray-50 transition-colors">
            {t.downloadReport}
          </button>
        </div>
      </div>
    </aside>
  );
}
