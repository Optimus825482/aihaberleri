import React from "react";
import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ad-slots";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findFirst({ where: { slug } });
  if (!category) return { title: "Kategori Bulunamadı" };

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  const title = `${category.name} Haberleri | AI Haberleri`;
  const description =
    category.description ||
    `${category.name} kategorisindeki en son yapay zeka haberleri ve gelişmeleri.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/category/${slug}`,
      languages: {
        tr: `${baseUrl}/category/${slug}`,
        en: `${baseUrl}/en/category/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/category/${slug}`,
      siteName: "AI Haberleri",
      type: "website",
      locale: "tr_TR",
      alternateLocale: ["en_US"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: "@aihaberleri",
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await db.category.findFirst({ where: { slug } });
  if (!category) notFound();

  const articles = await db.article.findMany({
    where: { status: "PUBLISHED", categoryId: category.id },
    include: { category: { select: { name: true, slug: true } } },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-10">
        <nav className="flex items-center gap-2 text-sm text-ai-text-muted mb-4">
          <Link href="/" className="hover:text-ai-primary transition-colors">
            Ana Sayfa
          </Link>
          <span>/</span>
          <span className="text-ai-text-primary font-medium">
            {category.name}
          </span>
        </nav>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          {category.name}
        </h1>
        {category.description && (
          <p className="text-muted-foreground text-lg">
            {category.description}
          </p>
        )}
        <p className="text-sm text-ai-text-muted mt-2">
          {articles.length} haber bulundu
        </p>
      </div>

      <AdSlot
        slot={AD_SLOTS.BANNER_TOP}
        format="auto"
        responsive
        minHeight={120}
        label="Sponsorlu"
        className="mb-8 rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
      />

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article, index) => (
            <React.Fragment key={article.id}>
              <ArticleCard article={article} />
              {(index + 1) % 6 === 0 && index < articles.length - 1 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <AdSlot
                    slot={AD_SLOTS.INFEED_NEWSLIST}
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
        <div className="text-center py-24 bg-muted/30 rounded-3xl border-2 border-dashed">
          <h2 className="text-2xl font-semibold mb-2">
            Bu kategoride henüz haber yok
          </h2>
          <p className="text-muted-foreground">
            Yakında yeni içerikler eklenecek.
          </p>
          <Link
            href="/"
            className="inline-flex items-center mt-6 text-primary hover:underline font-medium"
          >
            Anasayfaya Dön
          </Link>
        </div>
      )}

      {articles.length > 0 && (
        <div className="mt-10">
          <AdSlot
            slot={AD_SLOTS.MULTIPLEX_RELATED}
            format="autorelaxed"
            minHeight={200}
            label="Bunları da Okuyun"
            className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
          />
        </div>
      )}
    </div>
  );
}
