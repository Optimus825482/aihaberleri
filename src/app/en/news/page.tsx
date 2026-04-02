import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ad-slots";
import { Metadata } from "next";
import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

const PAGE_SIZE = 24;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl: string | null;
  publishedAt: Date | null;
  category: { id: string; name: string; slug: string } | null;
  views: number;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const isFirstPage = page === 1;

  const title = isFirstPage
    ? "All AI News | AI News"
    : `All AI News — Page ${page} | AI News`;

  const description =
    "Latest artificial intelligence news, machine learning breakthroughs, and tech updates. ChatGPT, Gemini, Claude and more.";

  return {
    title,
    description,
    alternates: {
      canonical: isFirstPage
        ? `${BASE_URL}/en/news`
        : `${BASE_URL}/en/news?page=${page}`,
      languages: {
        tr: `${BASE_URL}/news`,
        en: isFirstPage ? `${BASE_URL}/en/news` : `${BASE_URL}/en/news?page=${page}`,
        "x-default": `${BASE_URL}/news`,
      },
    },
    openGraph: {
      title,
      description,
      url: isFirstPage ? `${BASE_URL}/en/news` : `${BASE_URL}/en/news?page=${page}`,
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

export default async function NewsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [translations, totalCount] = await Promise.all([
    db.articleTranslation.findMany({
      where: {
        locale: "en",
        article: { status: "PUBLISHED" },
      },
      include: {
        article: { include: { category: true } },
      },
      orderBy: { article: { publishedAt: "desc" } },
      skip,
      take: PAGE_SIZE,
    }),
    db.articleTranslation.count({
      where: {
        locale: "en",
        article: { status: "PUBLISHED" },
      },
    }),
  ]);

  const articles: ArticleItem[] = translations.map((t: any) => ({
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

  const prevUrl =
    page === 2 ? `${BASE_URL}/en/news` : `${BASE_URL}/en/news?page=${page - 1}`;
  const nextUrl = `${BASE_URL}/en/news?page=${page + 1}`;

  return (
    <div className="container mx-auto px-4 py-12">
      {/* rel="prev" / rel="next" hints for Google */}
      {hasPrev && <link rel="prev" href={prevUrl} />}
      {hasNext && <link rel="next" href={nextUrl} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">All AI News</h1>
          <p className="text-muted-foreground text-lg">
            Latest artificial intelligence developments, research and analysis.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span>{totalCount} articles</span>
          {totalPages > 1 && (
            <span>· Page {page} / {totalPages}</span>
          )}
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article: ArticleItem, index: number) => (
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
                  href={page === 2 ? "/en/news" : `/en/news?page=${page - 1}`}
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
                    href={p === 1 ? "/en/news" : `/en/news?page=${p}`}
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
                  href={`/en/news?page=${page + 1}`}
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
        <div className="text-center py-20">
          <p className="text-xl text-gray-500">
            No news available at the moment.
          </p>
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
