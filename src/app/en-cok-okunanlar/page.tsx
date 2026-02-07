import { db } from "@/lib/db";
import { Eye, Clock, TrendingUp, Calendar, Flame } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { Metadata } from "next";
import { TrendScoreBadge } from "@/components/TrendScoreBadge";

export const metadata: Metadata = {
  title: "En Çok Okunan Haberler | AI Haberleri",
  description: "AI Haberleri'nde bu hafta en çok okunan yapay zeka haberleri. Teknoloji dünyasının en popüler AI gelişmeleri.",
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
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <TrendingUp className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">En Çok Okunanlar</h1>
                <p className="text-muted-foreground">
                  {periodLabels[period]} en popüler AI haberleri
                </p>
              </div>
            </div>

            {/* Period Filter Tabs */}
            <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg">
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
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
                  className="group flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all"
                >
                  {/* Rank Badge */}
                  <div className="flex-shrink-0 flex items-start sm:items-center">
                    <span
                      className={`w-10 h-10 flex items-center justify-center font-bold rounded-full text-lg ${
                        index < 3
                          ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </div>

                  {/* Image */}
                  <Link
                    href={`/haber/${article.slug}`}
                    className="relative flex-shrink-0 w-full sm:w-48 h-32 rounded-lg overflow-hidden"
                  >
                    {article.imageUrl ? (
                      <Image
                        src={article.imageUrl}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 640px) 100vw, 192px"
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
                  <div className="flex-1 flex flex-col gap-2">
                    {/* Category */}
                    {article.category && (
                      <Link
                        href={`/kategori/${article.category.slug}`}
                        className="text-xs font-medium text-primary hover:underline w-fit"
                      >
                        {article.category.name}
                      </Link>
                    )}

                    {/* Title */}
                    <Link href={`/haber/${article.slug}`}>
                      <h2 className="text-lg font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h2>
                    </Link>

                    {/* Excerpt */}
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center flex-wrap gap-3 text-xs text-muted-foreground mt-auto pt-2">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <strong className="text-foreground">{article.views.toLocaleString("tr-TR")}</strong> görüntülenme
                      </span>
                      {article.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(article.publishedAt)}
                        </span>
                      )}
                      <TrendScoreBadge trendScore={article.trendScore} size="sm" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-xl">
              <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Henüz Veri Yok</h3>
              <p className="text-muted-foreground">
                Seçili dönemde henüz yeterli okuma verisi bulunmuyor.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 text-primary hover:underline"
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
