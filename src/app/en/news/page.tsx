import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ad-slots";
import { Metadata } from "next";
import React from "react";

export const dynamic = "force-dynamic";

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

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";

export const metadata: Metadata = {
  title: "All AI News | AI News",
  description:
    "Latest artificial intelligence news, machine learning breakthroughs, and tech updates. ChatGPT, Gemini, Claude and more.",
  alternates: {
    canonical: `${BASE_URL}/en/news`,
    languages: {
      tr: `${BASE_URL}/news`,
      en: `${BASE_URL}/en/news`,
    },
  },
  openGraph: {
    title: "All AI News | AI News",
    description:
      "Latest artificial intelligence news, machine learning breakthroughs, and tech updates.",
    url: `${BASE_URL}/en/news`,
    siteName: "AI News",
    type: "website",
    locale: "en_US",
    alternateLocale: ["tr_TR"],
  },
  twitter: {
    card: "summary_large_image",
    title: "All AI News | AI News",
    description:
      "Latest artificial intelligence news, machine learning breakthroughs, and tech updates.",
    site: "@aihaberleri",
  },
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

      <AdSlot
        slot={AD_SLOTS.BANNER_TOP}
        format="auto"
        responsive
        minHeight={120}
        label="Sponsored"
        className="mb-8 rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
      />

      {articles.length > 0 ? (
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
      ) : (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500">
            No news available at the moment.
          </p>
        </div>
      )}

      {articles.length > 0 && (
        <div className="mt-10">
          <AdSlot
            slot={AD_SLOTS.MULTIPLEX_RELATED}
            format="autorelaxed"
            minHeight={200}
            label="You May Also Like"
            className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
          />
        </div>
      )}
    </div>
  );
}
