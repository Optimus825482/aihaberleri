"use client";

import Link from "next/link";
import Image from "next/image";
import { formatRelativeTime, calculateReadingTime } from "@/lib/utils";
import { TrendingBadge } from "@/components/TrendingBadge";

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    imageUrl: string | null;
    publishedAt: Date | null;
    views: number;
    content?: string;
    isTrending?: boolean;
    trendScore?: number | null;
    category: {
      name: string;
      slug: string;
    };
    author?: {
      name: string;
      avatar?: string | null;
    } | null;
  };
  locale?: "tr" | "en";
  priority?: boolean;
}

const texts = {
  tr: {
    readingTime: "dk",
    views: "görüntülenme",
    share: "Paylaş",
    linkCopied: "Link kopyalandı!",
  },
  en: {
    readingTime: "min",
    views: "views",
    share: "Share",
    linkCopied: "Link copied!",
  },
};

export function ArticleCard({
  article,
  locale = "tr",
  priority = false,
}: ArticleCardProps) {
  const readingTime = article.content
    ? calculateReadingTime(article.content)
    : 3;
  const t = texts[locale];

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const newsPath = locale === "en" ? "en/news" : "news";
  const articleUrl = `${baseUrl}/${newsPath}/${article.slug}`;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: articleUrl,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      try {
        await navigator.clipboard.writeText(articleUrl);
        alert(t.linkCopied);
      } catch (error) {
        console.error("Copy error:", error);
      }
    }
  };

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Az önce";
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return "Dün";
    if (diffDays < 7) return `${diffDays} gün önce`;
    return formatRelativeTime(date);
  };

  // Generate star rating based on trend score (0-10 scale -> 0-5 stars)
  const getStarRating = (score: number | null) => {
    const rating = score ? (score / 2) : 3.5;
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return { fullStars, hasHalf };
  };

  const { fullStars, hasHalf } = getStarRating(article.trendScore);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl bg-white dark:bg-ai-surface-card shadow-sm border border-gray-100 dark:border-ai-surface-border hover:shadow-lg dark:hover:border-ai-primary/50 transition-all duration-300">
      {/* Image Section */}
      <Link href={`/${newsPath}/${article.slug}`} className="block relative aspect-video overflow-hidden bg-gray-200 dark:bg-gray-800">
        {article.imageUrl ? (
          article.imageUrl.includes("pollinations.ai") ||
          article.imageUrl.includes("r2.dev") ||
          article.imageUrl.includes("images.aihaberleri.org") ||
          article.imageUrl.includes("googleusercontent.com") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.imageUrl}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          ) : (
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ai-primary/20 to-ai-surface-border flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-ai-text-muted">article</span>
          </div>
        )}

        {/* Category Badge */}
        <span className="absolute left-3 top-3 rounded bg-black/50 px-2 py-1 text-xs font-semibold text-white backdrop-blur-md">
          {article.category.name}
        </span>

        {/* Trend Score & Reading Time */}
        <div className="absolute right-3 bottom-3 flex gap-2">
          {article.trendScore && article.trendScore > 7 && (
            <span className="flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
              <span className="material-symbols-outlined text-[12px] text-emerald-400">trending_up</span>
              {article.trendScore.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-md">
            {readingTime} {t.readingTime}
          </span>
        </div>
      </Link>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-5">
        {/* Meta Info */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-ai-text-secondary">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>
          {/* Star Rating */}
          {article.trendScore && (
            <div className="flex text-yellow-400">
              {Array.from({ length: fullStars }).map((_, i) => (
                <span key={`full-${i}`} className="material-symbols-outlined text-[16px] fill-current">star</span>
              ))}
              {hasHalf && (
                <span className="material-symbols-outlined text-[16px] fill-current">star_half</span>
              )}
              {Array.from({ length: 5 - fullStars - (hasHalf ? 1 : 0) }).map((_, i) => (
                <span key={`empty-${i}`} className="material-symbols-outlined text-[16px]">star_border</span>
              ))}
            </div>
          )}
        </div>

        {/* Title */}
        <Link href={`/${newsPath}/${article.slug}`}>
          <h3 className="mb-2 text-lg font-bold leading-tight text-slate-900 dark:text-white group-hover:text-ai-primary transition-colors">
            {article.title}
          </h3>
        </Link>

        {/* Excerpt */}
        <p className="mb-4 line-clamp-2 text-sm text-slate-600 dark:text-gray-400">
          {article.excerpt}
        </p>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-ai-surface-border">
          <div className="flex items-center justify-between">
            {/* Author */}
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {article.author?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.author.avatar} alt={article.author.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                    {article.author?.name?.charAt(0).toUpperCase() || "A"}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-gray-300">
                {article.author?.name || "AI Haberleri"}
              </span>
            </div>
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="text-ai-text-secondary hover:text-ai-primary transition-colors"
              title={t.share}
            >
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
