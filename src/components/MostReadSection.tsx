import { db } from "@/lib/db";
import { Clock, Eye, TrendingUp } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";

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
    <section className="py-12 bg-secondary/5 dark:bg-secondary/10 border-y border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Günün En Çok Okunanları
            </h2>
            <p className="text-muted-foreground text-sm">
              Okuyucularımızın bugün en çok ilgi gösterdiği haberler
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {mostReadArticles.map((article, index) => (
            <div
              key={article.id}
              className="group relative flex flex-col gap-3"
            >
              {/* Rank Badge */}
              <span className="absolute -left-2 -top-2 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground font-bold rounded-full shadow-lg z-20 border-2 border-background text-lg tabular-nums">
                {index + 1}
              </span>

              <Link
                href={`/news/${article.slug}`}
                className="block overflow-hidden rounded-xl aspect-[4/3] relative shadow-sm hover:shadow-md transition-all"
              >
                {article.imageUrl ? (
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>

              <div className="flex flex-col gap-1.5 px-1">
                <Link
                  href={`/category/${article.category.slug}`}
                  className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline w-fit"
                >
                  {article.category.name}
                </Link>

                <Link
                  href={`/news/${article.slug}`}
                  className="group-hover:text-primary transition-colors"
                >
                  <h3
                    className="font-bold text-base leading-snug line-clamp-3"
                    title={article.title}
                  >
                    {article.title}
                  </h3>
                </Link>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-1">
                  <div
                    className="flex items-center gap-1"
                    title={`${article.views} görüntülenme`}
                  >
                    <Eye className="w-3 h-3" />
                    <span className="tabular-nums">
                      {article.views.toLocaleString("tr-TR")}
                    </span>
                  </div>
                  {article.publishedAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <time dateTime={article.publishedAt.toISOString()}>
                        {formatDate(article.publishedAt)}
                      </time>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
