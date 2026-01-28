/**
 * English article detail page
 * Route: /en/news/[slug]
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

interface Props {
  params: { slug: string };
}

async function getArticle(slug: string) {
  const translation = await db.articleTranslation.findFirst({
    where: {
      slug,
      locale: "en",
      article: {
        status: "PUBLISHED",
      },
    },
    include: {
      article: {
        include: {
          category: true,
          author: true,
        },
      },
    },
  });

  if (!translation) {
    return null;
  }

  // Update view count
  await db.article.update({
    where: { id: translation.article.id },
    data: { views: { increment: 1 } },
  });

  return {
    id: translation.article.id,
    title: translation.title,
    slug: translation.slug,
    excerpt: translation.excerpt,
    content: translation.content,
    metaTitle: translation.metaTitle,
    metaDescription: translation.metaDescription,
    imageUrl: translation.article.imageUrl,
    publishedAt: translation.article.publishedAt,
    views: translation.article.views,
    category: translation.article.category,
    author: translation.article.author,
    // Original Turkish slug for hreflang
    originalSlug: translation.article.slug,
  };
}

async function getRelatedArticles(categoryId: string, excludeId: string) {
  const translations = await db.articleTranslation.findMany({
    where: {
      locale: "en",
      article: {
        status: "PUBLISHED",
        categoryId,
        id: { not: excludeId },
      },
    },
    include: {
      article: {
        include: {
          category: true,
        },
      },
    },
    take: 3,
    orderBy: {
      article: {
        publishedAt: "desc",
      },
    },
  });

  return translations.map((t) => ({
    id: t.article.id,
    title: t.title,
    slug: t.slug,
    excerpt: t.excerpt,
    imageUrl: t.article.imageUrl,
    publishedAt: t.article.publishedAt,
    category: t.article.category,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle(params.slug);

  if (!article) {
    return {
      title: "Article Not Found",
    };
  }

  return {
    title: article.metaTitle || article.title,
    description: article.metaDescription || article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt || "",
      images: article.imageUrl ? [article.imageUrl] : [],
      type: "article",
      publishedTime: article.publishedAt?.toISOString(),
    },
    alternates: {
      canonical: `https://aihaberleri.org/en/news/${article.slug}`,
      languages: {
        tr: `https://aihaberleri.org/haber/${article.originalSlug}`,
        en: `https://aihaberleri.org/en/news/${article.slug}`,
      },
    },
  };
}

export default async function EnglishArticlePage({ params }: Props) {
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(
    article.category.id,
    article.id,
  );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="text-sm text-gray-500">
            <Link href="/en" className="hover:text-blue-600">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/en/category/${article.category.slug}`}
              className="hover:text-blue-600"
            >
              {article.category.name}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 dark:text-white">
              {article.title}
            </span>
          </nav>
        </div>
      </div>

      <article className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Link
                href={`/en/category/${article.category.slug}`}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                {article.category.name}
              </Link>
              <span className="text-gray-500 text-sm">
                {article.views} views
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {article.title}
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
              {article.excerpt}
            </p>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              {article.publishedAt && (
                <time dateTime={article.publishedAt.toISOString()}>
                  {formatDate(article.publishedAt)}
                </time>
              )}
              {article.author && (
                <span>By {article.author.name || "AI News Team"}</span>
              )}
              <Link
                href={`/haber/${article.originalSlug}`}
                className="text-blue-600 hover:text-blue-700"
              >
                🇹🇷 Türkçe versiyonu
              </Link>
            </div>
          </header>

          {/* Featured Image */}
          {article.imageUrl && (
            <div className="relative aspect-video mb-8 rounded-xl overflow-hidden">
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-lg dark:prose-invert max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Share */}
          <div className="border-t border-b py-6 mb-12">
            <div className="flex items-center gap-4">
              <span className="font-semibold">Share:</span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`https://aihaberleri.org/en/news/${article.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-blue-500"
              >
                Twitter
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://aihaberleri.org/en/news/${article.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-blue-600"
              >
                Facebook
              </a>
              <a
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(`https://aihaberleri.org/en/news/${article.slug}`)}&title=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-blue-700"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/en/news/${related.slug}`}
                  className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow"
                >
                  {related.imageUrl && (
                    <div className="relative aspect-video">
                      <Image
                        src={related.imageUrl}
                        alt={related.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold line-clamp-2">
                      {related.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
