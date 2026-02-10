"use client";

import Link from "next/link";
import Image from "next/image";
import { useTrendingArticles } from "@/hooks/use-trending";

interface TodayTrendingProps {
  locale?: "tr" | "en";
}

const texts = {
  tr: {
    title: "Bugünün Trendleri",
    seeAll: "Tümünü Gör",
    noNews: "Bugün henüz trend haber yok",
  },
  en: {
    title: "Today's Trends",
    seeAll: "See All",
    noNews: "No trending news today yet",
  },
};

function getTrendColor(score: number) {
  if (score >= 80) return "from-red-500 to-orange-500";
  if (score >= 60) return "from-green-500 to-emerald-500";
  if (score >= 40) return "from-yellow-500 to-amber-500";
  return "from-blue-500 to-cyan-500";
}

export function TodayTrending({ locale = "tr" }: TodayTrendingProps) {
  const t = texts[locale];
  const { data, isLoading } = useTrendingArticles("today", 5, "trend");
  const articles = data?.articles ?? [];

  // Don't render if no articles and not loading
  if (!isLoading && articles.length === 0) return null;

  const getLink = (slug: string) =>
    locale === "en" ? `/en/news/${slug}` : `/news/${slug}`;

  const trendingLink = locale === "en" ? "/en/trending" : "/trending";

  return (
    <section className="mb-8 lg:mb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-red-400 text-[24px]">
            local_fire_department
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {t.title}
          </h2>
        </div>
        <Link
          href={trendingLink}
          className="group flex items-center gap-1 text-xs sm:text-sm font-semibold text-ai-primary hover:text-ai-primary-hover transition-colors"
        >
          {t.seeAll}
          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>

      {/* Horizontal scroll list */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-64 sm:w-72 h-36 bg-ai-surface-card border border-ai-surface-border rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {articles.map((article, index) => {
            const score = article.trendScore ?? 0;
            return (
              <Link
                key={article.id}
                href={getLink(article.slug)}
                className="group flex-shrink-0 w-64 sm:w-72 snap-start"
              >
                <div className="relative h-36 rounded-xl overflow-hidden border border-ai-surface-border group-hover:border-ai-primary/40 transition-all">
                  {/* Background */}
                  {article.imageUrl ? (
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized={
                        article.imageUrl.includes("pollinations.ai") ||
                        article.imageUrl.includes("r2.dev") ||
                        article.imageUrl.includes("images.aihaberleri.org")
                      }
                    />
                  ) : (
                    <div className="absolute inset-0 bg-ai-surface-card" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  {/* Rank badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white bg-gradient-to-br ${getTrendColor(score)} shadow-lg`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-[10px] font-bold text-white/90 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
                      <span className="material-symbols-outlined text-[10px] align-middle mr-0.5">
                        trending_up
                      </span>
                      {score}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-ai-primary transition-colors">
                      {article.title}
                    </h3>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
