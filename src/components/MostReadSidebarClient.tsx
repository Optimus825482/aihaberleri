"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { TrendScoreBadge } from "@/components/TrendScoreBadge";
import { useTrendingArticles } from "@/hooks/use-trending";

// Client Component - Sidebar variant for Most Read with Period Selection
export function MostReadSidebarClient() {
  const [period, setPeriod] = useState<"today" | "week">("week");

  // SWR: auto-dedup, caching, keepPreviousData
  const { data, isLoading: loading } = useTrendingArticles(period);
  const articles = data?.articles ?? [];

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Az önce";
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return "Dün";
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  return (
    <aside className="bg-ai-surface-card rounded-xl border border-ai-surface-border p-5 sticky top-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-ai-surface-border">
        <div className="p-2.5 bg-ai-primary/10 rounded-lg">
          <span className="material-symbols-outlined text-[24px] text-ai-primary">
            trending_up
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold tracking-tight text-white">
            En Çok Okunanlar
          </h3>
          <p className="text-xs text-ai-text-secondary">
            {period === "today" ? "Bugün" : "Bu hafta"} en popüler
          </p>
        </div>
      </div>

      {/* Period Toggle */}
      <div className="flex items-center gap-1 p-1 bg-ai-surface-dark rounded-lg mb-4">
        <button
          onClick={() => setPeriod("today")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            period === "today"
              ? "bg-ai-primary text-white shadow-sm"
              : "text-ai-text-secondary hover:text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            local_fire_department
          </span>
          Bugün
        </button>
        <button
          onClick={() => setPeriod("week")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            period === "week"
              ? "bg-ai-primary text-white shadow-sm"
              : "text-ai-text-secondary hover:text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            calendar_today
          </span>
          Bu Hafta
        </button>
      </div>

      {/* Article List */}
      <div className="space-y-4">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-20 h-16 bg-ai-surface-dark rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-ai-surface-dark rounded w-full" />
                <div className="h-4 bg-ai-surface-dark rounded w-3/4" />
                <div className="h-3 bg-ai-surface-dark rounded w-1/2" />
              </div>
            </div>
          ))
        ) : articles.length > 0 ? (
          articles.map((article, index) => (
            <div key={article.id} className="group flex gap-3 relative">
              {/* Rank Number */}
              <span
                className={`absolute -left-1 -top-1 w-6 h-6 flex items-center justify-center font-bold rounded-full shadow-md z-10 text-sm ${
                  index < 3
                    ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                    : "bg-ai-primary text-white"
                }`}
              >
                {index + 1}
              </span>

              {/* Thumbnail */}
              <Link
                href={`/news/${article.slug}`}
                className="block flex-shrink-0 overflow-hidden rounded-lg w-20 h-16 relative"
              >
                {article.imageUrl ? (
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="80px"
                    unoptimized={
                      article.imageUrl.includes("pollinations.ai") ||
                      article.imageUrl.includes("r2.dev") ||
                      article.imageUrl.includes("images.aihaberleri.org")
                    }
                  />
                ) : (
                  <div className="w-full h-full bg-ai-surface-dark flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px] text-ai-text-muted">
                      trending_up
                    </span>
                  </div>
                )}
              </Link>

              {/* Content */}
              <div className="flex flex-col gap-1 min-w-0">
                <Link
                  href={`/news/${article.slug}`}
                  className="group-hover:text-ai-primary transition-colors"
                >
                  <h4
                    className="font-semibold text-sm leading-tight line-clamp-2 text-white"
                    title={article.title}
                  >
                    {article.title}
                  </h4>
                </Link>

                <div className="flex items-center gap-2 text-xs text-ai-text-secondary mt-auto flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">
                      visibility
                    </span>
                    {article.views.toLocaleString("tr-TR")}
                  </span>
                  {article.publishedAt && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">
                        schedule
                      </span>
                      {formatDate(article.publishedAt)}
                    </span>
                  )}
                  <TrendScoreBadge trendScore={article.trendScore} size="sm" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-ai-text-secondary text-sm">
            {period === "today" ? "Bugün henüz veri yok" : "Bu hafta veri yok"}
          </div>
        )}
      </div>

      {/* View All Link */}
      <Link
        href={`/en-cok-okunanlar?period=${period}`}
        className="group block mt-4 pt-3 border-t border-ai-surface-border text-center text-sm font-medium text-ai-primary hover:text-ai-primary-hover transition-colors"
      >
        Tümünü Gör
        <span className="inline-block transition-transform group-hover:translate-x-1">
          →
        </span>
      </Link>
    </aside>
  );
}
