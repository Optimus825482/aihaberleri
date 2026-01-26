import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { formatDate } from "@/lib/utils";
import { Calendar, Tag, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const articles = await db.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { not: null },
    },
    include: {
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Tüm Haberler
          </h1>
          <p className="text-muted-foreground text-lg">
            Yapay zeka dünyasından en son gelişmeler ve derinlemesine
            incelemeler.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted-foreground">
            {articles.length} Haber bulundu
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {articles.length === 0 && (
        <div className="text-center py-24 bg-muted/30 rounded-3xl border-2 border-dashed">
          <Icons.bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">
            Henüz haber bulunmuyor
          </h2>
          <p className="text-muted-foreground">
            Otonom ajanımız şu an yeni haberler üzerinde çalışıyor. Lütfen daha
            sonra tekrar kontrol edin.
          </p>
          <Link
            href="/"
            className="inline-flex items-center mt-6 text-primary hover:underline font-medium"
          >
            Anasayfaya Dön <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      )}
    </div>
  );
}
