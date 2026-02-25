import React from "react";
import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot } from "@/components/AdSlot";
import { CategoryHero } from "@/components/CategoryHero";
import type { Metadata } from "next";

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// React.cache() — per-request dedup: generateMetadata + page share same DB query
const getCategory = cache(async (slug: string) => {
  return db.category.findUnique({ where: { slug } });
});

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug); // Deduped with page

  if (!category) {
    return { title: "Kategori Bulunamadı" };
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
  const category = await getCategory(slug); // React.cache — deduped with generateMetadata

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
    orderBy: { publishedAt: "desc" },
    take: 24,
  });

  type ArticleWithCategory = (typeof articles)[0];

  return (
    <div className="min-h-screen flex flex-col bg-ai-background-dark">
      <main className="flex-1">
        {/* Category Hero */}
        <CategoryHero
          title={category.name}
          description={category.description || undefined}
          articleCount={articles.length}
        />

        {/* Articles Grid */}
        <section className="container mx-auto px-4 py-12">
          {/* Top Ad */}
          <AdSlot
            slot="1563878275"
            format="auto"
            responsive
            minHeight={120}
            label="Sponsorlu"
            className="mb-8 rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
          />

          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article: ArticleWithCategory, index: number) => (
                <React.Fragment key={article.id}>
                  <ArticleCard article={article} />
                  {(index + 1) % 6 === 0 && index < articles.length - 1 && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                      <AdSlot
                        slot="1906988626"
                        format="fluid"
                        layout="in-feed"
                        layoutKey="-6t+ed+2i-1n-4w"
                        minHeight={100}
                        label="Sponsorlu"
                        className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-ai-text-secondary">
                Bu kategoride henüz haber yok.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
