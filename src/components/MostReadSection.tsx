import { db } from "@/lib/db";
import { Clock, Eye, TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { TrendScoreBadge } from "@/components/TrendScoreBadge";

// Server Component
export async function MostReadSection() {
  // Fetch articles published in the last 24 hours sorted by views
  // "Günün En Çok Okunanları" - Today's most read articles
  const dateLimit = new Date();
  dateLimit.setHours(dateLimit.getHours() - 24);

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
      trendScore: true, // Added for badges
      publishedAt: true,
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
    <section className="relative py-16 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl backdrop-blur-sm border border-primary/10 shadow-inner">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Günün En Çok Okunanları
              </h2>
              <p className="text-muted-foreground mt-1 text-lg">
                Okuyucularımızın bugün en çok ilgi gösterdiği haberler
              </p>
            </div>
          </div>

          <Link
            href="/en-cok-okunanlar"
            className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary/50 hover:bg-primary hover:text-primary-foreground border border-border/50 hover:border-primary transition-all duration-300 font-medium text-sm backdrop-blur-sm"
          >
            <span>Tümünü Gör</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {mostReadArticles.map((article, index) => (
            <div
              key={article.id}
              className="group relative flex flex-col h-full"
            >
              {/* Card Container */}
              <div className="flex flex-col h-full bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 transform hover:-translate-y-1">
                {/* Image Container */}
                <Link
                  href={`/haber/${article.slug}`}
                  className="relative aspect-[4/3] overflow-hidden"
                >
                  {/* Rank Badge */}
                  <div className="absolute top-3 left-3 z-30 flex items-center justify-center w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-sm font-bold text-sm tabular-nums">
                    {index + 1}
                  </div>

                  {article.imageUrl ? (
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
                      unoptimized={
                        article.imageUrl.includes("pollinations.ai") ||
                        article.imageUrl.includes("r2.dev") ||
                        article.imageUrl.includes("images.aihaberleri.org")
                      }
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <TrendingUp className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

                  {/* Category Tag (Bottom Left over Image) */}
                  <div className="absolute bottom-3 left-3 z-20">
                    <span className="px-2.5 py-1 rounded-md bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm">
                      {article.category.name}
                    </span>
                  </div>
                </Link>

                {/* Content */}
                <div className="flex flex-col flex-1 p-4 gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/haber/${article.slug}`}
                      className="group-hover:text-primary transition-colors duration-200"
                    >
                      <h3
                        className="font-bold text-base leading-snug line-clamp-3"
                        title={article.title}
                      >
                        {article.title}
                      </h3>
                    </Link>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/30">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div
                        className="flex items-center gap-1"
                        title={`${article.views} görüntülenme`}
                      >
                        <Eye className="w-3.5 h-3.5 text-primary/70" />
                        <span className="tabular-nums font-medium">
                          {article.views.toLocaleString("tr-TR")}
                        </span>
                      </div>
                      {/* 
                        {article.publishedAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <time dateTime={article.publishedAt.toISOString()}>
                              {formatDate(article.publishedAt)}
                            </time>
                          </div>
                        )}
                        */}
                    </div>

                    <TrendScoreBadge
                      trendScore={article.trendScore}
                      size="sm"
                      showIcon={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
