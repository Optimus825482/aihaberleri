import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Latest News",
  description: "Latest artificial intelligence news and updates",
};

async function getArticles() {
  const translations = await db.articleTranslation.findMany({
    where: {
      locale: "en",
      article: { status: "PUBLISHED" },
    },
    include: {
      article: { include: { category: true } },
    },
    orderBy: { article: { publishedAt: "desc" } },
    take: 20,
  });

  return translations.map((t: any) => ({
    id: t.article.id,
    title: t.title,
    slug: t.slug,
    excerpt: t.excerpt || "",
    imageUrl: t.article.imageUrl,
    publishedAt: t.article.publishedAt,
    category: t.article.category,
    views: t.article.views,
  }));
}

export default async function NewsPage() {
  const articles = await getArticles();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Latest News</h1>
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={{
                ...article,
                publishedAt: article.publishedAt || new Date(),
              }}
              locale="en"
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500">
            No news available at the moment.
          </p>
        </div>
      )}
    </div>
  );
}
