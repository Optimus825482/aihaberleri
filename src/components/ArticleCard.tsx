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
  };
  locale?: "tr" | "en";
  priority?: boolean;
}

const texts = {
  tr: {
    readingTime: "dk okuma",
    views: "görüntülenme",
    share: "Paylaş",
    linkCopied: "Link kopyalandı!",
  },
  en: {
    readingTime: "min read",
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
  const categoryPath = locale === "en" ? "en/category" : "category";
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

  return (
    <article className="group overflow-hidden rounded-xl bg-ai-surface-card border border-ai-surface-border hover:border-ai-surface-hover transition-all duration-300">
      <Link href={`/${newsPath}/${article.slug}`} className="block">
        {article.imageUrl && (
          <div className="relative h-48 w-full overflow-hidden">
            {/* Trending Badge */}
            {article.isTrending && (
              <div className="absolute top-3 left-3 z-10">
                <TrendingBadge
                  isTrending={true}
                  locale={locale}
                  score={article.trendScore ?? undefined}
                  size="sm"
                />
              </div>
            )}
            {/* Category Badge */}
            <div className="absolute top-3 right-3 z-10">
              <span className="px-2.5 py-1 text-xs font-medium bg-ai-primary/90 text-white rounded-md">
                {article.category.name}
              </span>
            </div>
            {article.imageUrl.includes("pollinations.ai") ||
            article.imageUrl.includes("r2.dev") ||
              article.imageUrl.includes("images.aihaberleri.org") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.imageUrl}
                alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
              />
            ) : (
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={priority}
              />
            )}
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-ai-surface-dark/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        )}
      </Link>

      <div className="p-5">
        <Link href={`/${newsPath}/${article.slug}`}>
          <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-ai-primary transition-colors duration-200">
            {article.title}
          </h3>
        </Link>

        <p className="mt-2 text-sm text-ai-text-secondary line-clamp-2">
          {article.excerpt}
        </p>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-ai-surface-border flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-ai-text-muted">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              <span>{readingTime} {t.readingTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">visibility</span>
              <span>{article.views.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {article.publishedAt && (
              <span className="text-xs text-ai-text-muted">
                {formatRelativeTime(article.publishedAt)}
              </span>
            )}
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-ai-surface-dark hover:bg-ai-surface-hover text-ai-text-secondary hover:text-ai-primary transition-colors"
              title={t.share}
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
