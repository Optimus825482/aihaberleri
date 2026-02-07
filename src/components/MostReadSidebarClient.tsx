"use client";

import { Eye, TrendingUp, Clock, Flame, Calendar } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

interface MostReadArticle {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  views: number;
  publishedAt: string | null;
  category?: {
    name: string;
    slug: string;
  } | null;
}

// Client Component - Sidebar variant for Most Read with Period Selection
export function MostReadSidebarClient() {
  const [period, setPeriod] = useState<"today" | "week">("week");
  const [articles, setArticles] = useState<MostReadArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/most-read?period=${period}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles || []);
        }
      } catch (error) {
        console.error("Failed to fetch most read articles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [period]);

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Az önce";
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return "Dün";
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  return (
    <aside className="bg-secondary/5 dark:bg-secondary/10 rounded-xl border border-border/50 p-5 sticky top-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
        <div className="p-2.5 bg-primary/10 rounded-lg">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold tracking-tight">En Çok Okunanlar</h3>
        </div>
      </div>

      {/* Period Toggle */}
      <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-lg mb-4">
        <button
          onClick={() => setPeriod("today")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            period === "today"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Flame className="w-4 h-4" />
          Bugün
        </button>
        <button
          onClick={() => setPeriod("week")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            period === "week"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Bu Hafta
        </button>
      </div>

      {/* Article List */}
      <div className="space-y-4">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-20 h-16 bg-muted rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))
        ) : articles.length > 0 ? (
          articles.map((article, index) => (
            <div key={article.id} className="group flex gap-3 relative">
              {/* Rank Number */}
              <span
                className={`absolute -left-1 -top-1 w-6 h-6 flex items-center justify-center font-bold rounded-full shadow-md z-10 text-sm ${
                  index < 3
                    ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {index + 1}
              </span>

              {/* Thumbnail */}
              <Link
                href={`/haber/${article.slug}`}
                className="block flex-shrink-0 overflow-hidden rounded-lg w-20 h-16 relative"
              >
                {article.imageUrl ? (
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="80px"
                    unoptimized={
                      article.imageUrl.includes("pollinations.ai") ||
                      article.imageUrl.includes("r2.dev") ||
                      article.imageUrl.includes("images.aihaberleri.org")
                    }
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
              </Link>

              {/* Content */}
              <div className="flex flex-col gap-1 min-w-0">
                <Link
                  href={`/haber/${article.slug}`}
                  className="group-hover:text-primary transition-colors"
                >
                  <h4
                    className="font-semibold text-sm leading-tight line-clamp-2"
                    title={article.title}
                  >
                    {article.title}
                  </h4>
                </Link>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {article.views.toLocaleString("tr-TR")}
                  </span>
                  {article.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(article.publishedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            {period === "today" ? "Bugün henüz veri yok" : "Bu hafta veri yok"}
          </div>
        )}
      </div>

      {/* View All Link */}
      <Link
        href={`/en-cok-okunanlar?period=${period}`}
        className="block mt-4 pt-3 border-t border-border/50 text-center text-sm font-medium text-primary hover:underline"
      >
        Tümünü Gör →
      </Link>
    </aside>
  );
}
