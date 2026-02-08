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
import { ArticleImage } from "@/components/ResponsiveImage";
import { ViewTracker } from "@/components/ViewTracker";
import {
  generateBreadcrumbSchema,
  generateJsonLd,
  combineSchemas,
} from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
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

  // View tracking is now handled client-side with ViewTracker component
  // This prevents duplicate counts on page refresh/bot crawls

  return {
    id: translation.article.id,
    title: translation.title,
    slug: translation.slug,
    excerpt: translation.excerpt,
    content: translation.content,
    metaTitle: translation.metaTitle,
    metaDescription: translation.metaDescription,
    imageUrl: translation.article.imageUrl,
    imageUrlMedium: translation.article.imageUrlMedium,
    imageUrlSmall: translation.article.imageUrlSmall,
    imageUrlThumb: translation.article.imageUrlThumb,
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
  const { slug } = await params;
  const article = await getArticle(slug);

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
      locale: "en_US",
      alternateLocale: ["tr_TR"],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt || "",
      images: article.imageUrl ? [article.imageUrl] : [],
    },
    alternates: {
      canonical: `https://aihaberleri.org/en/news/${article.slug}`,
      languages: {
        tr: `https://aihaberleri.org/news/${article.originalSlug}`,
        en: `https://aihaberleri.org/en/news/${article.slug}`,
      },
    },
  };
}

export default async function EnglishArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(
    article.category.id,
    article.id,
  );

  const baseUrl = "https://aihaberleri.org";
  const articleUrl = `${baseUrl}/en/news/${article.slug}`;

  // Structured Data (JSON-LD) for English article
  const newsArticleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: article.imageUrl
      ? {
          "@type": "ImageObject",
          url: article.imageUrl,
          width: 1200,
          height: 630,
        }
      : undefined,
    datePublished: article.publishedAt?.toISOString(),
    author: {
      "@type": "Organization",
      name: "AI News",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "AI News",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logos/brand/logo-primary.png`,
        width: 512,
        height: 128,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    articleSection: article.category.name,
    url: articleUrl,
    inLanguage: "en-US",
  };

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: `${baseUrl}/en` },
    {
      name: article.category.name,
      url: `${baseUrl}/en/category/${article.category.slug}`,
    },
    { name: article.title, url: articleUrl },
  ]);

  const combinedSchema = combineSchemas(newsArticleSchema, breadcrumbSchema);

  return (
    <main className="min-h-screen bg-ai-background-dark">
      {/* View Tracking - Client-side with session control */}
      <ViewTracker articleId={article.id} />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateJsonLd(combinedSchema)}
      />

      {/* Breadcrumb */}
      <div className="bg-ai-surface-dark border-b border-ai-surface-border">
        <div className="container mx-auto px-4 py-3">
          <nav className="text-sm text-ai-text-secondary flex items-center gap-2">
            <Link
              href="/en"
              className="hover:text-ai-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">
                home
              </span>
              Home
            </Link>
            <span className="text-ai-text-muted">/</span>
            <Link
              href={`/en/category/${article.category.slug}`}
              className="hover:text-ai-primary transition-colors"
            >
              {article.category.name}
            </Link>
            <span className="text-ai-text-muted">/</span>
            <span className="text-white truncate max-w-[200px]">
              {article.title}
            </span>
          </nav>
        </div>
      </div>

      <article className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Link
                href={`/en/category/${article.category.slug}`}
                className="bg-ai-primary text-white px-3 py-1 rounded-full text-sm font-medium hover:bg-ai-primary-hover transition-colors"
              >
                {article.category.name}
              </Link>
              <span className="text-ai-text-secondary text-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">
                  visibility
                </span>
                {article.views.toLocaleString()} views
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              {article.title}
            </h1>

            <p className="text-xl text-ai-text-secondary mb-4">
              {article.excerpt}
            </p>

            <div className="flex items-center gap-4 text-sm text-ai-text-secondary border-b border-ai-surface-border pb-6">
              {article.publishedAt && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">
                    calendar_today
                  </span>
                  <time dateTime={article.publishedAt.toISOString()}>
                    {formatDate(article.publishedAt)}
                  </time>
                </span>
              )}
              {article.author && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">
                    person
                  </span>
                  By {article.author.name || "AI News Team"}
                </span>
              )}
              <Link
                href={`/news/${article.originalSlug}`}
                className="text-ai-primary hover:text-ai-primary-hover transition-colors flex items-center gap-1 ml-auto"
              >
                <span className="text-lg">🇹🇷</span>
                Türkçe versiyonu
              </Link>
            </div>
          </header>

          {/* Featured Image with Responsive Sizes */}
          {article.imageUrl && (
            <div className="mb-8">
              <ArticleImage
                src={article.imageUrl}
                srcMedium={article.imageUrlMedium || undefined}
                srcSmall={article.imageUrlSmall || undefined}
                srcThumb={article.imageUrlThumb || undefined}
                alt={article.title}
                priority
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-lg prose-invert max-w-none mb-12 prose-headings:text-white prose-p:text-ai-text-secondary prose-a:text-ai-primary prose-strong:text-white"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Share */}
          <div className="border-t border-b border-ai-surface-border py-6 mb-12">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-ai-primary">
                  share
                </span>
                Share:
              </span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`https://aihaberleri.org/en/news/${article.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ai-text-secondary hover:text-ai-primary transition-colors"
              >
                Twitter
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://aihaberleri.org/en/news/${article.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ai-text-secondary hover:text-ai-primary transition-colors"
              >
                Facebook
              </a>
              <a
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(`https://aihaberleri.org/en/news/${article.slug}`)}&title=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ai-text-secondary hover:text-ai-primary transition-colors"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px] text-ai-primary">
                recommend
              </span>
              Related Articles
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/en/news/${related.slug}`}
                  className="bg-ai-surface-card rounded-xl overflow-hidden border border-ai-surface-border hover:border-ai-primary/40 transition-all group"
                >
                  {related.imageUrl && (
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={related.imageUrl}
                        alt={related.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        unoptimized={
                          related.imageUrl.includes("pollinations.ai") ||
                          related.imageUrl.includes("r2.dev") ||
                          related.imageUrl.includes("images.aihaberleri.org")
                        }
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold line-clamp-2 text-white group-hover:text-ai-primary transition-colors">
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
