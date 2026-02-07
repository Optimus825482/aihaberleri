import { db } from "@/lib/db";
import { Eye, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { TrendScoreBadge } from "@/components/TrendScoreBadge";

// Server Component - Sidebar variant for Most Read
export async function MostReadSidebar() {
  // Fetch articles published in the last 7 days sorted by views
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - 7);

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
    take: 5,
    select: {
      id: true,
      title: true,
      slug: true,
      imageUrl: true,
      views: true,
      publishedAt: true,
      trendScore: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  if (mostReadArticles.length === 0) return null;

  return (
    <aside className="bg-secondary/5 dark:bg-secondary/10 rounded-xl border border-border/50 p-5 sticky top-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
        <div className="p-2.5 bg-primary/10 rounded-lg">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold tracking-tight">
            En Çok Okunanlar
          </h3>
          <p className="text-xs text-muted-foreground">Bu hafta en popüler</p>
        </div>
      </div>

      {/* Article List */}
      <div className="space-y-4">
        {mostReadArticles.map((article, index) => (
          <div
            key={article.id}
            className="group flex gap-3 relative"
          >
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

              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto flex-wrap">
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
                <TrendScoreBadge trendScore={article.trendScore} size="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <Link
        href="/en-cok-okunanlar"
        className="block mt-4 pt-3 border-t border-border/50 text-center text-sm font-medium text-primary hover:underline"
      >
        Tümünü Gör →
      </Link>
    </aside>
  );
}
