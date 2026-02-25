"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTrendingArticles } from "@/hooks/use-trending";

interface TodayTrendingProps {
  locale?: "tr" | "en";
}

const texts = {
  tr: {
    title: "Bugünün Trendleri",
    seeAll: "Tümünü Gör",
    noNews: "Bugün henüz trend haber yok",
    trending: "Trend",
  },
  en: {
    title: "Today's Trends",
    seeAll: "See All",
    noNews: "No trending news today yet",
    trending: "Trending",
  },
};

function getTrendColor(score: number) {
  if (score >= 80) return "from-red-500 to-orange-500";
  if (score >= 60) return "from-green-500 to-emerald-500";
  if (score >= 40) return "from-yellow-500 to-amber-500";
  return "from-blue-500 to-cyan-500";
}

function getRankBg(index: number) {
  if (index === 0) return "from-yellow-400 to-amber-500";
  if (index === 1) return "from-gray-300 to-gray-400";
  if (index === 2) return "from-orange-400 to-orange-600";
  return "from-blue-400 to-blue-500";
}

export function TodayTrending({ locale = "tr" }: TodayTrendingProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const t = texts[locale];
  const { data, isLoading } = useTrendingArticles("today", 5, "trend", locale);
  const articles = data?.articles ?? [];

  const getLink = (slug: string) =>
    locale === "en" ? `/en/news/${slug}` : `/news/${slug}`;

  const trendingLink = locale === "en" ? "/en/trending" : "/trending";

  return (
    <section className="mb-8 lg:mb-10">
      {/* Header - Enhanced */}
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span className="material-symbols-outlined text-red-400 text-[26px] sm:text-[28px] animate-pulse">
              local_fire_department
            </span>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t.title}
          </h2>
        </div>
        <Link
          href={trendingLink}
          className="group flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-ai-primary hover:text-ai-primary-hover transition-colors bg-ai-primary/10 hover:bg-ai-primary/20 px-3 py-1.5 rounded-full"
        >
          {t.seeAll}
          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>

      {/* Trending Grid - Mobile: vertical stack, Desktop: horizontal */}
      {!mounted || isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`bg-ai-surface-card border border-ai-surface-border rounded-xl animate-pulse ${i === 0 ? "sm:col-span-2 lg:col-span-2 h-48 sm:h-56" : "h-36 sm:h-44"
                }`}
            />
          ))}
        </div>
      ) : articles.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {articles.map((article, index) => {
            const score = article.trendScore ?? 0;
            const isFirst = index === 0;

            return (
              <Link
                key={article.id}
                href={getLink(article.slug)}
                className={`group relative block ${isFirst
                    ? "col-span-2 sm:col-span-2 lg:col-span-2 row-span-1"
                    : ""
                  }`}
              >
                <div
                  className={`relative rounded-xl overflow-hidden border border-ai-surface-border/60 group-hover:border-ai-primary/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-ai-primary/10 ${isFirst ? "h-48 sm:h-56 lg:h-full" : "h-36 sm:h-44"
                    }`}
                >
                  {/* Background Image */}
                  {article.imageUrl ? (
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                      unoptimized={
                        article.imageUrl.includes("pollinations.ai") ||
                        article.imageUrl.includes("r2.dev") ||
                        article.imageUrl.includes("images.aihaberleri.org")
                      }
                    />
                  ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-ai-surface-card to-ai-surface-dark" />
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

                  {/* Rank Badge - Top Left */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span
                      className={`flex items-center justify-center text-white font-black shadow-lg ring-2 ring-white/20 bg-gradient-to-br ${getRankBg(index)} ${isFirst
                          ? "w-10 h-10 rounded-xl text-base"
                          : "w-7 h-7 rounded-lg text-xs"
                        }`}
                    >
                      {index + 1}
                    </span>
                  </div>

                  {/* Trend Score Badge - Top Right */}
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={`inline-flex items-center gap-1 font-black text-white backdrop-blur-md px-2 py-1 rounded-lg shadow-lg border border-white/10 ${isFirst ? "text-sm" : "text-xs"
                        }`}
                      style={{
                        background:
                          score >= 80
                            ? "rgba(239,68,68,0.7)"
                            : score >= 60
                              ? "rgba(34,197,94,0.7)"
                              : score >= 40
                                ? "rgba(234,179,8,0.7)"
                                : "rgba(59,130,246,0.7)",
                      }}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        trending_up
                      </span>
                      {score}
                    </span>
                  </div>

                  {/* Title - Bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <h3
                      className={`font-bold text-white leading-snug group-hover:text-ai-primary transition-colors ${isFirst
                          ? "text-base sm:text-lg line-clamp-3"
                          : "text-xs sm:text-sm line-clamp-2"
                        }`}
                    >
                      {article.title}
                    </h3>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        ) : (
          <div className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-6 text-center text-ai-text-secondary text-sm">
            {t.noNews}
          </div>
      )}
    </section>
  );
}
