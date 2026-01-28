/**
 * English version of the homepage
 * Route: /en
 */

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

  return translations.map((t) => ({
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

export default async function EnglishHomePage() {
  const [articles, categories] = await Promise.all([
    getEnglishArticles(),
    getCategories(),
  ]);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">AI News</h1>
            <p className="text-xl md:text-2xl text-blue-200 mb-8">
              Latest news from artificial intelligence and technology
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/en"
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Latest News
              </Link>
              <Link
                href="/"
                className="bg-transparent border border-white/30 hover:bg-white/10 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                🇹🇷 Türkçe
              </Link>
            </div>
          </div>
        </div>
      </section>

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
              {articles.map((article) => (
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
            {categories.map((category) => (
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
