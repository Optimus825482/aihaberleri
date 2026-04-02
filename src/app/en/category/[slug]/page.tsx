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
  if (!category) return { title: "Category Not Found" };

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

  const baseTitle = `${category.name} News | AI News`;
  const title = isFirstPage ? baseTitle : `${category.name} News — Page ${page} | AI News`;
  const description =
    category.description ||
    `Latest artificial intelligence news and updates in the ${category.name} category.`;

  return {
    title,
    description,
    alternates: {
      canonical: isFirstPage
        ? `${baseUrl}/en/category/${slug}`
        : `${baseUrl}/en/category/${slug}?page=${page}`,
      languages: {
        tr: `${baseUrl}/category/${slug}`,
        en: isFirstPage
          ? `${baseUrl}/en/category/${slug}`
          : `${baseUrl}/en/category/${slug}?page=${page}`,
        "x-default": `${baseUrl}/category/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: isFirstPage
        ? `${baseUrl}/en/category/${slug}`
        : `${baseUrl}/en/category/${slug}?page=${page}`,
      siteName: "AI News",
      type: "website",
      locale: "en_US",
      alternateLocale: ["tr_TR"],
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

  const [translations, totalCount] = await Promise.all([
    db.articleTranslation.findMany({
      where: {
        locale: "en",
        article: { status: "PUBLISHED", categoryId: category.id },
      },
      include: { article: { include: { category: true } } },
      orderBy: { article: { publishedAt: "desc" } },
      skip,
      take: PAGE_SIZE,
    }),
    db.articleTranslation.count({
      where: {
        locale: "en",
        article: { status: "PUBLISHED", categoryId: category.id },
      },
    }),
  ]);

  const articles = translations.map((t: any) => ({
    id: t.article.id,
    title: t.title,
    slug: t.slug,
    excerpt: t.excerpt || "",
    imageUrl: t.article.imageUrl,
    publishedAt: t.article.publishedAt,
    category: t.article.category,
    views: t.article.views,
  }));

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  const prevUrl =
    page === 2
      ? `/en/category/${slug}`
      : `/en/category/${slug}?page=${page - 1}`;
  const nextUrl = `/en/category/${slug}?page=${page + 1}`;

  return (
    <div className="container mx-auto px-4 py-12">
      {hasPrev && <link rel="prev" href={`${baseUrl}${prevUrl}`} />}
      {hasNext && <link rel="next" href={`${baseUrl}${nextUrl}`} />}

      <div className="mb-10">
        <nav className="flex items-center gap-2 text-sm text-ai-text-muted mb-4">
          <Link href="/en" className="hover:text-ai-primary transition-colors">
            Home
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
          {totalCount} articles found
          {totalPages > 1 && ` · Page ${page} / ${totalPages}`}
        </p>
      </div>

      <AdSlot
        slot={AD_SLOTS.BANNER_TOP}
        format="auto"
        responsive
        minHeight={120}
        label="Sponsored"
        className="mb-8 rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
      />

      {articles.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article: any, index: number) => (
              <React.Fragment key={article.id}>
                <ArticleCard
                  article={{
                    ...article,
                    publishedAt: article.publishedAt || new Date(),
                    category: article.category || {
                      name: "General",
                      slug: "general",
                    },
                  }}
                  locale="en"
                />
                {(index + 1) % 6 === 0 && index < articles.length - 1 && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-3">
                    <AdSlot
                      slot={AD_SLOTS.INFEED_NEWSLIST}
                      format="fluid"
                      layout="in-feed"
                      layoutKey="-6t+ed+2i-1n-4w"
                      minHeight={100}
                      label="Sponsored"
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
              aria-label="Pagination"
              className="mt-12 flex items-center justify-center gap-2 flex-wrap"
            >
              {hasPrev ? (
                <Link
                  href={prevUrl}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-ai-surface-card border border-ai-surface-border text-sm font-medium text-white hover:border-ai-primary/50 hover:text-ai-primary transition-colors"
                  rel="prev"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="flex items-center gap-1 px-4 py-2 rounded-lg bg-ai-surface-dark border border-ai-surface-border text-sm font-medium text-ai-text-muted cursor-not-allowed opacity-50">
                  ← Previous
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
                        ? `/en/category/${slug}`
                        : `/en/category/${slug}?page=${p}`
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
                  Next →
                </Link>
              ) : (
                <span className="flex items-center gap-1 px-4 py-2 rounded-lg bg-ai-surface-dark border border-ai-surface-border text-sm font-medium text-ai-text-muted cursor-not-allowed opacity-50">
                  Next →
                </span>
              )}
            </nav>
          )}

          <div className="mt-10">
            <AdSlot
              slot={AD_SLOTS.MULTIPLEX_RELATED}
              format="autorelaxed"
              minHeight={200}
              label="You May Also Like"
              className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
            />
          </div>
        </>
      ) : (
        <div className="text-center py-24 bg-muted/30 rounded-3xl border-2 border-dashed">
          <h2 className="text-2xl font-semibold mb-2">
            No articles in this category yet
          </h2>
          <p className="text-muted-foreground">
            New content will be added soon.
          </p>
          <Link
            href="/en"
            className="inline-flex items-center mt-6 text-primary hover:underline font-medium"
          >
            Back to Home
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
