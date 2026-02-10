import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
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

        {/* How Trend Score Works */}
        <div className="mb-10 bg-ai-surface-card border border-ai-surface-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-ai-primary text-[20px]">
              info
            </span>
            How is the Trend Score calculated?
          </h2>
          <p className="text-sm text-ai-text-secondary leading-relaxed mb-4">
            Our automated research system scans hundreds of sources worldwide
            every 15 minutes to identify newsworthy AI developments. Each
            article is evaluated across 7 signals to receive a trend score from
            0 to 100.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                icon: "psychology",
                label: "AI Relevance",
                desc: "How related to AI",
              },
              {
                icon: "schedule",
                label: "Freshness",
                desc: "How recent the news is",
              },
              {
                icon: "verified",
                label: "Source Authority",
                desc: "Source prestige",
              },
              {
                icon: "title",
                label: "Title Quality",
                desc: "News value & specificity",
              },
              {
                icon: "article",
                label: "Content Depth",
                desc: "Detail & analysis level",
              },
              {
                icon: "new_releases",
                label: "Novelty",
                desc: "First-time announcements",
              },
              {
                icon: "trending_up",
                label: "Engagement",
                desc: "Reader interest & impact",
              },
              {
                icon: "visibility",
                label: "Views & Likes",
                desc: "Real user engagement",
              },
            ].map((signal) => (
              <div
                key={signal.label}
                className="p-3 bg-ai-surface-dark rounded-lg border border-ai-surface-border"
              >
                <span className="material-symbols-outlined text-ai-primary text-[16px] mb-1 block">
                  {signal.icon}
                </span>
                <p className="text-xs font-semibold text-white">
                  {signal.label}
                </p>
                <p className="text-[11px] text-ai-text-muted mt-0.5">
                  {signal.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article, index) => {
              const score = article.trendScore ?? 0;
              const badge = getTrendBadge(score);
              return (
                <Link
                  key={article.id}
                  href={`/en/news/${article.slug}`}
                  className="group flex gap-4 md:gap-6 p-4 md:p-5 bg-ai-surface-card border border-ai-surface-border rounded-xl hover:border-ai-primary/40 transition-all"
                >
                  <div className="flex-shrink-0 flex flex-col items-center justify-center w-12">
                    <span
                      className={`text-2xl font-black ${index < 3 ? "text-ai-primary" : "text-ai-text-muted"}`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border mt-1 ${badge.color}`}
                    >
                      {score}
                    </span>
                  </div>
                  {article.imageUrl && (
                    <div className="relative w-24 h-24 md:w-32 md:h-24 rounded-lg overflow-hidden flex-shrink-0 border border-ai-surface-border">
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
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {article.category && (
                        <span className="text-[11px] font-semibold text-ai-primary bg-ai-primary/10 px-2 py-0.5 rounded border border-ai-primary/20">
                          {article.category.name}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-white group-hover:text-ai-primary transition-colors line-clamp-2 mb-1.5">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm text-ai-text-secondary line-clamp-1 hidden md:block">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-ai-text-muted">
                      {article.publishedAt && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            schedule
                          </span>
                          {formatDate(article.publishedAt)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">
                          visibility
                        </span>
                        {article.views.toLocaleString("en-US")}
                      </span>
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
