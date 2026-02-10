import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { TrendInfoBox } from "@/components/TrendInfoBox";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trending News | AI News",
  description:
    "Today's most talked about AI news worldwide, ranked by trend score.",
  openGraph: {
    title: "Trending News | AI News",
    description: "Today's most talked about AI news worldwide.",
  },
};

function getTrendBadge(score: number) {
  if (score >= 80)
    return {
      label: "Viral",
      color: "bg-red-500/20 text-red-400 border-red-500/30",
    };
  if (score >= 60)
    return {
      label: "Trending",
      color: "bg-green-500/20 text-green-400 border-green-500/30",
    };
  if (score >= 40)
    return {
      label: "Popular",
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    };
  return {
    label: "Rising",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
}

export default async function TrendingPageEN() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Get today's articles with EN translations
  const translations = await db.articleTranslation.findMany({
    where: {
      locale: "en",
      article: {
        status: "PUBLISHED",
        publishedAt: { gte: todayStart },
      },
    },
    include: {
      article: {
        include: { category: { select: { name: true, slug: true } } },
      },
    },
    orderBy: { article: { trendScore: "desc" } },
  });

  const articles = translations.map((t: any) => ({
    id: t.article.id,
    title: t.title,
    slug: t.slug,
    excerpt: t.excerpt || "",
    imageUrl: t.article.imageUrl,
    views: t.article.views,
    trendScore: t.article.trendScore,
    publishedAt: t.article.publishedAt,
    category: t.article.category,
  }));

  return (
    <div className="min-h-screen bg-ai-background-dark">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30">
              <span className="material-symbols-outlined text-red-400 text-[28px]">
                local_fire_department
              </span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Today's Trending News
              </h1>
              <p className="text-ai-text-secondary mt-1">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {" · "}
                {articles.length} articles
              </p>
            </div>
          </div>
        </div>

        {/* How Trend Score Works — Dismissible */}
        <TrendInfoBox locale="en" />

        {articles.length > 0 ? (
          <div className="space-y-3 md:space-y-4">
            {articles.map((article, index) => {
              const score = article.trendScore ?? 0;
              const badge = getTrendBadge(score);
              const isRising = score >= 40;
              const isFalling = score < 20;
              return (
                <Link
                  key={article.id}
                  href={`/en/news/${article.slug}`}
                  className="group block p-3 md:p-5 bg-ai-surface-card border border-ai-surface-border rounded-xl hover:border-ai-primary/40 transition-all"
                >
                  <div className="flex gap-3 md:gap-6">
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-10 md:w-14">
                      <span
                        className={`text-2xl md:text-3xl font-black ${index < 3 ? "text-ai-primary" : "text-ai-text-muted"}`}
                      >
                        {index + 1}
                      </span>
                      <div
                        className={`flex items-center gap-0.5 mt-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg border font-black text-xs md:text-sm ${badge.color}`}
                      >
                        {isRising && (
                          <span className="material-symbols-outlined text-green-400 text-[12px] md:text-[16px]">
                            arrow_upward
                          </span>
                        )}
                        {isFalling && (
                          <span className="material-symbols-outlined text-red-400 text-[12px] md:text-[16px]">
                            arrow_downward
                          </span>
                        )}
                        {!isRising && !isFalling && (
                          <span className="material-symbols-outlined text-yellow-400 text-[12px] md:text-[16px]">
                            trending_flat
                          </span>
                        )}
                        {score}
                      </div>
                    </div>
                    {article.imageUrl && (
                      <div className="relative w-20 h-20 md:w-32 md:h-24 rounded-lg overflow-hidden flex-shrink-0 border border-ai-surface-border">
                        <Image
                          src={article.imageUrl}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          unoptimized={
                            article.imageUrl.includes("pollinations.ai") ||
                            article.imageUrl.includes("r2.dev") ||
                            article.imageUrl.includes("images.aihaberleri.org")
                          }
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-1 flex-wrap">
                        {article.category && (
                          <span className="text-[10px] md:text-[11px] font-semibold text-ai-primary bg-ai-primary/10 px-1.5 md:px-2 py-0.5 rounded border border-ai-primary/20">
                            {article.category.name}
                          </span>
                        )}
                        <span
                          className={`text-[9px] md:text-[10px] font-bold px-1 md:px-1.5 py-0.5 rounded border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        {isRising && (
                          <span className="text-[9px] md:text-[10px] font-bold text-green-400 items-center gap-0.5 hidden sm:flex">
                            <span className="material-symbols-outlined text-[12px]">
                              arrow_upward
                            </span>
                            Rising
                          </span>
                        )}
                        {isFalling && (
                          <span className="text-[9px] md:text-[10px] font-bold text-red-400 items-center gap-0.5 hidden sm:flex">
                            <span className="material-symbols-outlined text-[12px]">
                              arrow_downward
                            </span>
                            Falling
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm md:text-lg font-bold text-white group-hover:text-ai-primary transition-colors line-clamp-3 md:line-clamp-2 mb-1">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-sm text-ai-text-secondary line-clamp-1 hidden md:block">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2 text-[10px] md:text-xs text-ai-text-muted">
                        {article.publishedAt && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px] md:text-[12px]">
                              schedule
                            </span>
                            {formatDate(article.publishedAt)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px] md:text-[12px]">
                            visibility
                          </span>
                          {article.views.toLocaleString("en-US")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-ai-surface-card rounded-2xl border border-dashed border-ai-surface-border">
            <span className="material-symbols-outlined text-ai-text-muted text-5xl mb-3 block">
              local_fire_department
            </span>
            <h2 className="text-xl font-bold text-white mb-2">
              No trending news yet today
            </h2>
            <p className="text-ai-text-secondary mb-6">
              Our system is continuously scanning for new developments.
            </p>
            <Link
              href="/en/news"
              className="inline-flex items-center gap-2 text-ai-primary hover:underline font-medium"
            >
              Browse All News{" "}
              <span className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
