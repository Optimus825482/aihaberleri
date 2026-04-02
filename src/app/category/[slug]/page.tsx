import React from "react";
import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ad-slots";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const isFirstPage = page === 1;

  const category = await db.category.findFirst({ where: { slug } });
  if (!category) return { title: "Kategori Bulunamadı" };

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

  const baseTitle = `${category.name} Haberleri | AI Haberleri`;
  const title = isFirstPage ? baseTitle : `${category.name} Haberleri — Sayfa ${page} | AI Haberleri`;
  const description =
    category.description ||
    `${category.name} kategorisindeki en son yapay zeka haberleri ve gelişmeleri.`;

  return {
    title,
    description,
    alternates: {
      canonical: isFirstPage
        ? `${baseUrl}/category/${slug}`
        : `${baseUrl}/category/${slug}?page=${page}`,
      languages: {
        tr: isFirstPage
          ? `${baseUrl}/category/${slug}`
          : `${baseUrl}/category/${slug}?page=${page}`,
        en: `${baseUrl}/en/category/${slug}`,
        "x-default": `${baseUrl}/category/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: isFirstPage
        ? `${baseUrl}/category/${slug}`
        : `${baseUrl}/category/${slug}?page=${page}`,
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

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const category = await db.category.findFirst({ where: { slug } });
  if (!category) notFound();

  const [articles, totalCount] = await Promise.all([
    db.article.findMany({
      where: { status: "PUBLISHED", categoryId: category.id },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { publishedAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.article.count({
      where: { status: "PUBLISHED", categoryId: category.id },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const prevUrl =
    page === 2
      ? `/category/${slug}`
      : `/category/${slug}?page=${page - 1}`;
  const nextUrl = `/category/${slug}?page=${page + 1}`;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

  return (
    <div className="container mx-auto px-4 py-12">
      {hasPrev && <link rel="prev" href={`${baseUrl}${prevUrl}`} />}
      {hasNext && <link rel="next" href={`${baseUrl}${nextUrl}`} />}

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
          {totalCount} haber bulundu
          {totalPages > 1 && ` · Sayfa ${page} / ${totalPages}`}
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
        <>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Sayfalama"
              className="mt-12 flex items-center justify-center gap-2 flex-wrap"
            >
              {hasPrev ? (
                <Link
                  href={prevUrl}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-ai-surface-card border border-ai-surface-border text-sm font-medium text-white hover:border-ai-primary/50 hover:text-ai-primary transition-colors"
                  rel="prev"
                >
                  ← Önceki
                </Link>
              ) : (
                <span className="flex items-center gap-1 px-4 py-2 rounded-lg bg-ai-surface-dark border border-ai-surface-border text-sm font-medium text-ai-text-muted cursor-not-allowed opacity-50">
                  ← Önceki
                </span>
              )}

              {getPaginationRange(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="px-3 py-2 text-sm text-ai-text-muted"
                  >
                    …
                  </span>
                ) : (
                  <Link
                    key={p}
                    href={
                      p === 1
                        ? `/category/${slug}`
                        : `/category/${slug}?page=${p}`
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      p === page
                        ? "bg-ai-primary border-ai-primary text-white"
                        : "bg-ai-surface-card border-ai-surface-border text-white hover:border-ai-primary/50 hover:text-ai-primary"
                    }`}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p}
                  </Link>
                ),
              )}

              {hasNext ? (
                <Link
                  href={nextUrl}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-ai-surface-card border border-ai-surface-border text-sm font-medium text-white hover:border-ai-primary/50 hover:text-ai-primary transition-colors"
                  rel="next"
                >
                  Sonraki →
                </Link>
              ) : (
                <span className="flex items-center gap-1 px-4 py-2 rounded-lg bg-ai-surface-dark border border-ai-surface-border text-sm font-medium text-ai-text-muted cursor-not-allowed opacity-50">
                  Sonraki →
                </span>
              )}
            </nav>
          )}

          <div className="mt-10">
            <AdSlot
              slot={AD_SLOTS.MULTIPLEX_RELATED}
              format="autorelaxed"
              minHeight={200}
              label="Bunları da Okuyun"
              className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
            />
          </div>
        </>
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
    </div>
  );
}

function getPaginationRange(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 2;
  const range: (number | "...")[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);
  if (left > 2) range.push("...");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push("...");
  range.push(total);

  return range;
}
