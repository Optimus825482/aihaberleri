import { db } from "@/lib/db";
import { Eye, Clock, TrendingUp, Calendar, Flame } from "lucide-react";
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

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] opacity-40 pointer-events-none" />
      <div className="absolute top-40 -left-20 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] opacity-30 pointer-events-none" />

      <main className="flex-1 relative z-10">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl backdrop-blur-md border border-primary/10 shadow-lg">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  En Çok Okunanlar
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  {periodLabels[period]} en popüler AI haberleri
                </p>
              </div>
            </div>

            {/* Period Filter Tabs */}
            <div className="flex items-center gap-1 bg-secondary/50 backdrop-blur-sm p-1.5 rounded-xl border border-border/50 shadow-sm">
              {[
                { key: "today", label: "Bugün", icon: Flame },
                { key: "week", label: "Bu Hafta", icon: Calendar },
                { key: "month", label: "Bu Ay", icon: TrendingUp },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = period === item.key;
                return (
                  <Link
                    key={item.key}
                    href={`/en-cok-okunanlar?period=${item.key}`}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
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
                  className="group relative flex flex-col sm:flex-row gap-5 p-4 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/30 hover:bg-card/80 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                >
                  {/* Rank Badge */}
                  <div className="absolute top-4 left-4 z-20 sm:static sm:z-auto flex-shrink-0 flex items-start sm:items-center">
                    <span
                      className={`w-10 h-10 flex items-center justify-center font-bold rounded-full text-lg shadow-sm border border-border/50 ${
                        index < 3
                          ? "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 text-white shadow-orange-500/20 border-transparent relative overflow-hidden after:absolute after:inset-0 after:bg-white/20 after:animate-pulse-slow"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </div>

                  {/* Image */}
                  <Link
                    href={`/haber/${article.slug}`}
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
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      {/* Category */}
                      {article.category && (
                        <Link
                          href={`/kategori/${article.category.slug}`}
                          className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-primary/20 transition-colors w-fit"
                        >
                          {article.category.name}
                        </Link>
                      )}

                      {/* Mobile Rank (Hidden on Desktop) */}
                      <div className="sm:hidden text-xs text-muted-foreground">
                        #{index + 1} Sırada
                      </div>
                    </div>

                    {/* Title */}
                    <Link href={`/haber/${article.slug}`}>
                      <h2 className="text-lg md:text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h2>
                    </Link>

                    {/* Excerpt */}
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {article.excerpt}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center flex-wrap gap-4 text-xs text-muted-foreground mt-auto pt-3 border-t border-border/30">
                      <div className="flex items-center gap-1.5 bg-secondary/30 px-2 py-1 rounded-md">
                        <Eye className="w-3.5 h-3.5 text-primary/70" />
                        <span className="text-foreground font-medium">
                          {article.views.toLocaleString("tr-TR")}
                        </span>
                      </div>

                      {article.publishedAt && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
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
            <div className="text-center py-20 bg-card/30 backdrop-blur-sm rounded-3xl border border-dashed border-border">
              <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Henüz Veri Yok</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Seçili dönemde ({periodLabels[period]}) henüz yeterli okuma
                verisi bulunmuyor. Daha sonra tekrar deneyin.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
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
