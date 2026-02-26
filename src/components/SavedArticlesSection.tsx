"use client";

import Link from "next/link";
import Image from "next/image";
import { useSavedArticles } from "@/hooks/useSavedArticles";

export function SavedArticlesSection() {
  const { savedArticles, savedCount } = useSavedArticles();

  if (savedCount === 0) return null;

  const latest3 = savedArticles.slice(0, 3);

  return (
    <section className="mb-8 rounded-2xl border border-ai-surface-border bg-ai-surface-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-ai-primary">
            bookmark
          </span>
          Kaydettiğin Haberler
        </h2>
        <Link
          href="/favoriler"
          className="text-xs font-semibold text-ai-primary hover:text-ai-primary-hover transition-colors"
        >
          Tümünü Gör ({savedCount})
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {latest3.map((article) => (
          <Link
            key={article.id}
            href={`/news/${article.slug}`}
            className="group flex gap-3 rounded-xl border border-ai-surface-border bg-ai-surface-dark/60 p-3 transition-all hover:border-ai-primary/40 hover:bg-ai-surface-dark sm:flex-col sm:gap-0"
          >
            {/* Image */}
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg sm:mb-3 sm:h-32 sm:w-full">
              {article.imageUrl ? (
                <Image
                  src={article.imageUrl}
                  alt={article.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 64px, 200px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-ai-surface-card">
                  <span className="material-symbols-outlined text-[24px] text-ai-text-muted">
                    image
                  </span>
                </div>
              )}
            </div>

            {/* Text */}
            <div className="min-w-0">
              {article.category && (
                <span className="mb-1 inline-block rounded-md bg-ai-primary/20 px-1.5 py-0.5 text-[9px] font-semibold text-ai-primary">
                  {article.category}
                </span>
              )}
              <h3 className="line-clamp-2 text-xs font-bold text-white group-hover:text-ai-primary transition-colors sm:text-sm">
                {article.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
