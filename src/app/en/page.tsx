/**
 * English version of the homepage
 * Route: /en
 */

export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { NewsletterForm } from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: "AI News - Latest Artificial Intelligence News",
  description:
    "Stay updated with the latest news from artificial intelligence, machine learning, and technology world.",
  alternates: {
    canonical: "https://aihaberleri.org/en",
    languages: {
      tr: "https://aihaberleri.org",
      en: "https://aihaberleri.org/en",
    },
  },
};

async function getEnglishArticles() {
  // Get articles with English translations
  const translations = await db.articleTranslation.findMany({
    where: {
      locale: "en",
      article: {
        status: "PUBLISHED",
      },
    },
    include: {
      article: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      article: {
        publishedAt: "desc",
      },
    },
    take: 12,
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

async function getCategories() {
  return db.category.findMany({
    orderBy: { order: "asc" },
  });
}

import { HeroCarousel } from "@/components/HeroCarousel";

async function getHeroArticles() {
  const translations = await db.articleTranslation.findMany({
    where: {
      locale: "en",
      article: {
        status: "PUBLISHED",
      },
    },
    include: {
      article: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      article: {
        publishedAt: "desc",
      },
    },
    take: 5,
  });

  return translations.map((t: any) => ({
    id: t.article.id,
    title: t.title,
    slug: t.slug,
    excerpt: t.excerpt || "",
    imageUrl: t.article.imageUrl,
    publishedAt: t.article.publishedAt,
    category: t.article.category,
  }));
}

export default async function EnglishHomePage() {
  const [articles, categories, heroArticles] = await Promise.all([
    getEnglishArticles(),
    getCategories(),
    getHeroArticles(),
  ]);

  return (
    <main className="min-h-screen">
      {/* Hero Carousel */}
      <HeroCarousel articles={heroArticles} locale="en" />

      {/* Latest News */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Latest News</h2>
            <Link
              href="/en/news"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              View All →
            </Link>
          </div>

          {articles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                English translations are being prepared. Please check back soon!
              </p>
              <Link
                href="/"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700"
              >
                View Turkish version →
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article: any) => (
                <ArticleCard
                  key={article.id}
                  article={{
                    ...article,
                    publishedAt: article.publishedAt || new Date(),
                    category: {
                      name: article.category.name,
                      slug: article.category.slug,
                    },
                  }}
                  locale="en"
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category: any) => (
              <Link
                key={category.id}
                href={`/en/category/${category.slug}`}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center hover:shadow-lg transition-shadow"
              >
                <h3 className="font-semibold">{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Get the latest AI news delivered to your inbox. We never share your
            email.
          </p>
          <div className="max-w-md mx-auto">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </main>
  );
}
