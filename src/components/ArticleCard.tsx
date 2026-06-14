"use client";

import { memo, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { calculateReadingTime, formatRelativeTime } from "@/lib/utils";
import { TrendingBadge } from "@/components/TrendingBadge";

import { TrendScoreBadge } from "@/components/TrendScoreBadge";
import { SaveArticleButton } from "@/components/article/SaveArticleButton";

/**
 * Build a Cloudflare Image Resizing URL for images hosted on images.aihaberleri.org.
 */
function getCfImageUrl(src: string, width: number): string {
  if (!src.includes("images.aihaberleri.org")) return src;
  try {
    const url = new URL(src);
    return `https://${url.hostname}/cdn-cgi/image/width=${width},quality=82,format=webp${url.pathname}`;
  } catch {
    return src;
  }
}

/**
 * Generate a deterministic fallback image from picsum.photos when CDN fails.
 * Properly decodes URL-encoded strings to produce readable seeds.
 */
function getFallbackSrc(src: string): string {
  try {
    const decoded = decodeURIComponent(src);
    const seed = decoded
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "")
      ?.replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 12) || "ainews";
    return `https://picsum.photos/seed/${seed}/1200/630`;
  } catch {
    return "https://picsum.photos/seed/ainews/1200/630";
  }
}

/**
 * Domains whose image URLs require server-side auth and will always 401 in the browser.
 */
const AUTH_REQUIRED_DOMAINS = [
  "gen.pollinations.ai",
];

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
    trendScore?: number | null | undefined;
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

export const ArticleCard = memo(function ArticleCard({
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

  // Track image load state — auto-fallback for auth-required domains (gen.pollinations.ai etc.)
  const requiresAuthDomain = AUTH_REQUIRED_DOMAINS.some((d) =>
    article.imageUrl?.includes(d),
  );
  const [imageSrc, setImageSrc] = useState<string>(() => {
    if (requiresAuthDomain) {
      console.warn(
        `[ArticleCard] Auth-required domain detected, skipping: ${(article.imageUrl || "").slice(0, 60)}`,
      );
      return getFallbackSrc(article.imageUrl || "");
    }
    return article.imageUrl || "";
  });
  const [imageFailed, setImageFailed] = useState(requiresAuthDomain);

  const handleImageError = useCallback(() => {
    if (!imageFailed) {
      // First fallback: try picsum
      setImageFailed(true);
      const fallback = getFallbackSrc(article.imageUrl || "");
      console.warn(
        `[ArticleCard] Image failed, falling back: ${(article.imageUrl || "").slice(0, 60)}`,
      );
      setImageSrc(fallback);
    } else {
      // Second fallback also failed — clear src to show gradient placeholder
      console.warn(
        `[ArticleCard] Fallback image also failed, showing placeholder`,
      );
      setImageSrc("");
    }
  }, [article.imageUrl, imageFailed]);

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
    <article
      className="group flex flex-col overflow-hidden rounded-xl lg:rounded-2xl bg-white dark:bg-ai-surface-card shadow-md dark:shadow-none border border-gray-100 dark:border-ai-surface-border hover:shadow-xl dark:hover:shadow-2xl dark:hover:border-ai-primary/40 transition-all duration-300 hover:-translate-y-1"
      suppressHydrationWarning={true}
    >
      {/* Image Section */}
      <Link
        href={`/${newsPath}/${article.slug}`}
        className="block relative aspect-video overflow-hidden bg-gray-200 dark:bg-gray-800"
      >
        {imageSrc ? (
          imageSrc.includes("pollinations.ai") ||
          imageSrc.includes("r2.dev") ||
          imageSrc.includes("images.aihaberleri.org") ||
          imageSrc.includes("googleusercontent.com") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              srcSet={
                imageSrc.includes("images.aihaberleri.org")
                  ? `${getCfImageUrl(imageSrc, 400)} 400w, ${getCfImageUrl(imageSrc, 700)} 700w, ${getCfImageUrl(imageSrc, 1024)} 1024w`
                  : undefined
              }
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              alt={article.title}
              width={1024}
              height={576}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              onError={handleImageError}
            />
          ) : (
            <Image
              src={imageSrc}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
              onError={handleImageError}
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ai-primary/15 via-ai-primary/10 to-ai-surface-border flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-ai-text-muted/70">
              article
            </span>
          </div>
        )}

        {/* Image Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* Category Badge */}
        <span className="absolute left-3 top-3 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] sm:text-xs font-bold text-white border border-white/10 shadow-lg">
          {article.category.name}
        </span>

        {/* Reading Time (Bottom Right) */}
        <div className="absolute right-3 bottom-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
          <span className="flex items-center gap-1 rounded-lg bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold text-white border border-white/10 shadow-lg">
            <span className="material-symbols-outlined text-[12px]">
              schedule
            </span>
            {readingTime} {t.readingTime}
          </span>
        </div>
      </Link>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Meta Info: Published Time + Views + Trend Score */}
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {/* Published Time */}
          {article.publishedAt && (
            <div className="flex items-center gap-1 text-xs text-ai-text-secondary">
              <span className="material-symbols-outlined text-[14px]">
                schedule
              </span>
              <span className="font-medium" suppressHydrationWarning>
                {formatRelativeTime(article.publishedAt)}
              </span>
            </div>
          )}

          {/* Trend Score */}
          {article.trendScore ? (
            <TrendScoreBadge trendScore={article.trendScore} size="sm" />
          ) : null}
        </div>

        {/* Views Count (Moved below published time) */}
        <div className="mb-2.5 flex items-center gap-1 text-xs text-ai-text-secondary">
          <span className="material-symbols-outlined text-[14px]">
            visibility
          </span>
          <span className="font-medium">
            {article.views >= 1000
              ? `${(article.views / 1000).toFixed(1)}k`
              : article.views}{" "}
            {t.views}
          </span>
        </div>

        {/* Title */}
        <Link href={`/${newsPath}/${article.slug}`}>
          <h3 className="mb-2 text-base sm:text-lg font-bold leading-tight text-slate-900 dark:text-white group-hover:text-ai-primary transition-colors duration-300">
            {article.title}
          </h3>
        </Link>

        {/* Excerpt */}
        <p className="mb-4 line-clamp-2 text-xs sm:text-sm text-slate-600 dark:text-gray-400 leading-relaxed">
          {article.excerpt}
        </p>

        {/* Footer */}
        <div className="mt-auto pt-3.5 sm:pt-4 border-t border-gray-100 dark:border-ai-surface-border/80">
          <div className="flex items-center justify-between">
            {/* Author */}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden shadow-inner">
                {article.author?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.author.avatar}
                    alt={article.author.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                    {article.author?.name?.charAt(0).toUpperCase() || "A"}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                {article.author?.name || "AI Haberleri"}
              </span>
            </div>
            {/* Save & Share Buttons */}
            <div className="flex items-center gap-1">
              <SaveArticleButton
                variant="card"
                articleId={article.id}
                title={article.title}
                slug={article.slug}
                imageUrl={article.imageUrl}
                excerpt={article.excerpt}
                category={article.category.name}
              />
              <button
                type="button"
                onClick={handleShare}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-ai-text-secondary hover:text-ai-primary hover:bg-ai-primary/10 transition-all duration-300"
                title={t.share}
                aria-label={`${t.share}: ${article.title}`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  share
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});

ArticleCard.displayName = "ArticleCard";
