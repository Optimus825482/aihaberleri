import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Footer } from "@/components/Footer";
import { ArticleCard } from "@/components/ArticleCard";
import { CategoryHero } from "@/components/CategoryHero";
import type { Metadata } from "next";

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findUnique({
    where: { slug },
  });

  if (!category) {
    return {
      title: "Kategori Bulunamadı",
    };
  }

  return {
    title: category.name,
    description:
      category.description ||
      `${category.name} kategorisindeki en son haberler ve makaleler`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await db.category.findUnique({
    where: { slug },
  });

  if (!category) {
    notFound();
  }

  const articles = await db.article.findMany({
    where: {
      categoryId: category.id,
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
    take: 24,
  });

  type ArticleWithCategory = (typeof articles)[0];

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Category Hero */}
        <CategoryHero
          title={category.name}
          description={category.description || undefined}
          articleCount={articles.length}
        />

        {/* Articles Grid */}
        <section className="container mx-auto px-4 py-12">
          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article: ArticleWithCategory) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Bu kategoride henüz haber yok.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
