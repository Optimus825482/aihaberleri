import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    include: {
      _count: {
        select: { articles: { where: { status: "PUBLISHED" } } },
      },
    },
    orderBy: { order: "asc" },
  });

  return (
    <div className="min-h-screen bg-ai-background-dark">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2 text-white">
            Kategoriler
          </h1>
          <p className="text-ai-text-secondary text-lg">
            İlginizi çeken konulara göre haberlere göz atın.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link key={category.id} href={`/category/${category.slug}`}>
              <div className="h-full p-6 bg-ai-surface-card rounded-xl border border-ai-surface-border hover:border-ai-primary/50 hover:bg-ai-surface-hover transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 text-xs font-medium bg-ai-primary/10 text-ai-primary rounded-lg border border-ai-primary/20">
                    {category._count.articles} Haber
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-ai-text-muted group-hover:text-ai-primary transition-colors">chevron_right</span>
                </div>
                <h2 className="text-2xl font-semibold text-white group-hover:text-ai-primary transition-colors mb-2">
                  {category.name}
                </h2>
                <p className="text-ai-text-secondary line-clamp-2">
                  {category.description ||
                    `${category.name} dünyasındaki en son yapay zeka gelişmeleri.`}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-20 bg-ai-surface-card rounded-2xl border border-dashed border-ai-surface-border">
            <p className="text-ai-text-secondary">
              Şu an tanımlı kategori bulunmuyor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
