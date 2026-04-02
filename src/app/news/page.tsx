import React from "react";
import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot } from "@/components/AdSlot";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { AD_SLOTS } from "@/lib/ad-slots";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

const PAGE_SIZE = 24; // Articles per page (multiple of 3 for grid layout)

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const isFirstPage = page === 1;

  const title = isFirstPage
    ? "Tüm Haberler | AI Haberleri"
    : `Tüm Haberler — Sayfa ${page} | AI Haberleri`;

  const description =
    "Yapay zeka dünyasından en son gelişmeler, araştırmalar ve derinlemesine analizler. ChatGPT, Gemini, Claude ve daha fazlası.";

  return {
    title,
    description,
    // Paginated pages: canonical always points to the page itself (not page 1)
    // Google recommends self-referencing canonical on paginated pages
    alternates: {
      canonical: isFirstPage ? `${BASE_URL}/news` : `${BASE_URL}/news?page=${page}`,
      languages: {
        tr: isFirstPage ? `${BASE_URL}/news` : `${BASE_URL}/news?page=${page}`,
        en: `${BASE_URL}/en/news`,
        "x-default": `${BASE_URL}/news`,
      },
    },
    openGraph: {
      title,
      description,
      url: isFirstPage ? `${BASE_URL}/news` : `${BASE_URL}/news?page=${page}`,
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
    // noindex on paginated pages beyond page 1 (optional — keeps index clean)
    // Uncomment if you want only page 1 indexed:
    // robots: isFirstPage ? undefined : { index: false, follow: true },
  };
}

export default async function NewsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [articles, totalCount] = await Promise.all([
    db.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { publishedAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.article.count({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Build prev/next URLs for rel links (used in <head> by Next.js via metadata above)
  const prevUrl = page === 2 ? `${BASE_URL}/news` : `${BASE_URL}/news?page=${page - 1}`;
  const nextUrl = `${BASE_URL}/news?page=${page + 1}`;

  return (
    <div className="container mx-auto px-4 py-12">
      {/* rel="prev" / rel="next" link hints for Google */}
      {hasPrev && <link rel="prev" href={prevUrl} />}
      {hasNext && <link rel="next" href={nextUrl} />}

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
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span>{totalCount} haber</span>
          {totalPages > 1 && (
            <span>· Sayfa {page} / {totalPages}</span>
          )}
        </div>
      </div>

      {/* Top Ad */}
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
                {/* In-feed ad after every 6th article */}
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
              {/* Previous */}
              {hasPrev ? (
                <Link
                  href={page === 2 ? "/news" : `/news?page=${page - 1}`}
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

              {/* Page numbers */}
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
                    href={p === 1 ? "/news" : `/news?page=${p}`}
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

              {/* Next */}
              {hasNext ? (
                <Link
                  href={`/news?page=${page + 1}`}
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

          {/* Multiplex — sayfa sonu öneriler */}
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

/**
 * Returns a compact pagination range with ellipsis.
 * e.g. page=7, total=20 → [1, "...", 5, 6, 7, 8, 9, "...", 20]
 */
function getPaginationRange(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 2; // pages on each side of current
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
