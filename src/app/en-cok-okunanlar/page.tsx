import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { Metadata } from "next";
import { TrendScoreBadge } from "@/components/TrendScoreBadge";

export const metadata: Metadata = {
  title: "En Çok Okunan Haberler | AI Haberleri",
  description:
    "AI Haberleri'nde bu hafta en çok okunan yapay zeka haberleri. Teknoloji dünyasının en popüler AI gelişmeleri.",
  openGraph: {
    title: "En Çok Okunan AI Haberleri",
    description: "Bu hafta en çok okunan yapay zeka haberleri",
  },
};

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SearchParams {
  period?: string;
}

export default async function MostReadPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const period = params.period || "week";

  // Calculate date limit based on period
  const dateLimit = new Date();
  if (period === "today") {
    dateLimit.setHours(0, 0, 0, 0); // Start of today
  } else if (period === "week") {
    dateLimit.setDate(dateLimit.getDate() - 7);
  } else if (period === "month") {
    dateLimit.setDate(dateLimit.getDate() - 30);
  }

  const mostReadArticles = await db.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: {
        gte: dateLimit,
      },
    },
    orderBy: {
      views: "desc",
    },
    take: 20,
    select: {
      id: true,
      title: true,
      slug: true,
      imageUrl: true,
      views: true,
      publishedAt: true,
      trendScore: true,
      excerpt: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  const periodLabels: Record<string, string> = {
    today: "Bugün",
    week: "Bu Hafta",
    month: "Bu Ay",
  };

  const periodIcons: Record<string, string> = {
    today: "local_fire_department",
    week: "calendar_today",
    month: "trending_up",
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-ai-background-dark">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-ai-primary/10 via-ai-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-ai-primary/10 rounded-full blur-[100px] opacity-40 pointer-events-none" />
      <div className="absolute top-40 -left-20 w-[400px] h-[400px] bg-ai-primary/10 rounded-full blur-[80px] opacity-30 pointer-events-none" />

      <main className="flex-1 relative z-10">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-ai-primary/20 rounded-2xl border border-ai-primary/10 shadow-lg">
                <span className="material-symbols-outlined text-[32px] text-ai-primary">
                  trending_up
                </span>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                  En Çok Okunanlar
                </h1>
                <p className="text-ai-text-secondary mt-2 text-lg">
                  {periodLabels[period]} en popüler AI haberleri
                </p>
              </div>
            </div>

            {/* Period Filter Tabs */}
            <div className="flex items-center gap-1 bg-ai-surface-dark p-1.5 rounded-xl border border-ai-surface-border shadow-sm">
              {[
                { key: "today", label: "Bugün", icon: "local_fire_department" },
                { key: "week", label: "Bu Hafta", icon: "calendar_today" },
                { key: "month", label: "Bu Ay", icon: "trending_up" },
              ].map((item) => {
                const isActive = period === item.key;
                return (
                  <Link
                    key={item.key}
                    href={`/en-cok-okunanlar?period=${item.key}`}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-ai-primary text-white shadow-md"
                        : "text-ai-text-secondary hover:text-white hover:bg-ai-surface-hover"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {item.icon}
                    </span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Articles Grid */}
          {mostReadArticles.length > 0 ? (
            <div className="grid gap-6">
              {mostReadArticles.map((article, index) => (
                <article
                  key={article.id}
                  className="group relative flex flex-col sm:flex-row gap-5 p-4 bg-ai-surface-card rounded-2xl border border-ai-surface-border hover:border-ai-primary/30 hover:bg-ai-surface-hover transition-all duration-300"
                >
                  {/* Rank Badge */}
                  <div className="absolute top-4 left-4 z-20 sm:static sm:z-auto flex-shrink-0 flex items-start sm:items-center">
                    <span
                      className={`w-10 h-10 flex items-center justify-center font-bold rounded-full text-lg shadow-sm border ${
                        index < 3
                          ? "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 text-white shadow-orange-500/20 border-transparent"
                          : "bg-ai-surface-dark text-ai-text-secondary border-ai-surface-border"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </div>

                  {/* Image */}
                  <Link
                    href={`/news/${article.slug}`}
                    className="relative flex-shrink-0 w-full sm:w-56 h-48 sm:h-36 rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow"
                  >
                    {article.imageUrl ? (
                      <Image
                        src={article.imageUrl}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 224px"
                        unoptimized={
                          article.imageUrl.includes("pollinations.ai") ||
                          article.imageUrl.includes("r2.dev") ||
                          article.imageUrl.includes("images.aihaberleri.org")
                        }
                      />
                    ) : (
                      <div className="w-full h-full bg-ai-surface-dark flex items-center justify-center">
                        <span className="material-symbols-outlined text-[32px] text-ai-text-muted">
                          trending_up
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      {/* Category */}
                      {article.category && (
                        <Link
                          href={`/category/${article.category.slug}`}
                          className="px-2.5 py-1 rounded-md bg-ai-primary/10 text-ai-primary text-[10px] font-bold uppercase tracking-wider hover:bg-ai-primary/20 transition-colors w-fit"
                        >
                          {article.category.name}
                        </Link>
                      )}

                      {/* Mobile Rank (Hidden on Desktop) */}
                      <div className="sm:hidden text-xs text-ai-text-secondary">
                        #{index + 1} Sırada
                      </div>
                    </div>

                    {/* Title */}
                    <Link href={`/news/${article.slug}`}>
                      <h2 className="text-lg md:text-xl font-bold leading-tight text-white group-hover:text-ai-primary transition-colors line-clamp-2">
                        {article.title}
                      </h2>
                    </Link>

                    {/* Excerpt */}
                    {article.excerpt && (
                      <p className="text-sm text-ai-text-secondary line-clamp-2 leading-relaxed">
                        {article.excerpt}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center flex-wrap gap-4 text-xs text-ai-text-secondary mt-auto pt-3 border-t border-ai-surface-border/30">
                      <div className="flex items-center gap-1.5 bg-ai-surface-dark px-2 py-1 rounded-md">
                        <span className="material-symbols-outlined text-[14px] text-ai-primary/70">
                          visibility
                        </span>
                        <span className="text-white font-medium">
                          {article.views.toLocaleString("tr-TR")}
                        </span>
                      </div>

                      {article.publishedAt && (
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">
                            schedule
                          </span>
                          <span>{formatDate(article.publishedAt)}</span>
                        </div>
                      )}

                      <div className="ml-auto">
                        <TrendScoreBadge
                          trendScore={article.trendScore}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-ai-surface-card rounded-3xl border border-dashed border-ai-surface-border">
              <div className="w-20 h-20 bg-ai-surface-dark rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-[40px] text-ai-text-muted">
                  trending_up
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">
                Henüz Veri Yok
              </h3>
              <p className="text-ai-text-secondary max-w-md mx-auto mb-8">
                Seçili dönemde ({periodLabels[period]}) henüz yeterli okuma
                verisi bulunmuyor. Daha sonra tekrar deneyin.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ai-primary text-white font-medium hover:bg-ai-primary-hover transition-all shadow-lg shadow-ai-primary/20"
              >
                Ana Sayfaya Dön
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
