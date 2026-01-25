import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { HeaderWrapper } from "@/components/HeaderWrapper";
import { Footer } from "@/components/Footer";
import { ShareButtons } from "@/components/ShareButtons";
import { formatDate, calculateReadingTime } from "@/lib/utils";
import { Clock, Eye, Calendar } from "lucide-react";
import type { Metadata } from "next";
import {
  generateNewsArticleSchema,
  generateBreadcrumbSchema,
  generateJsonLd,
  combineSchemas,
  generateArticleMetadata,
} from "@/lib/seo";

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await db.article.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!article) {
    return {
      title: "Haber Bulunamadı",
    };
  }

  return generateArticleMetadata(article);
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await db.article.findUnique({
    where: { slug },
    include: {
      category: true,
    },
  });

  if (!article || article.status !== "PUBLISHED") {
    notFound();
  }

  // Increment view count
  await db.article.update({
    where: { id: article.id },
    data: { views: { increment: 1 } },
  });

  // Get related articles
  const relatedArticles = await db.article.findMany({
    where: {
      categoryId: article.categoryId,
      id: { not: article.id },
      status: "PUBLISHED",
    },
    include: {
      category: true,
    },
    take: 3,
    orderBy: { publishedAt: "desc" },
  });

  type RelatedArticle = (typeof relatedArticles)[0];

  const readingTime = calculateReadingTime(article.content);
  const articleUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/news/${article.slug}`;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Structured Data (JSON-LD)
  const newsArticleSchema = generateNewsArticleSchema(article);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Ana Sayfa", url: baseUrl },
    {
      name: article.category.name,
      url: `${baseUrl}/category/${article.category.slug}`,
    },
    { name: article.title, url: articleUrl },
  ]);
  const combinedSchema = combineSchemas(newsArticleSchema, breadcrumbSchema);

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderWrapper />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateJsonLd(combinedSchema)}
      />

      <main className="flex-1">
        <article className="container mx-auto px-4 py-12 max-w-4xl">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              Ana Sayfa
            </Link>
            {" / "}
            <Link
              href={`/category/${article.category.slug}`}
              className="hover:text-primary"
            >
              {article.category.name}
            </Link>
            {" / "}
            <span className="text-foreground">{article.title}</span>
          </nav>

          {/* Category Badge */}
          <Link
            href={`/category/${article.category.slug}`}
            className="inline-block text-sm font-semibold text-primary hover:underline mb-4"
          >
            {article.category.name}
          </Link>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {article.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
            {article.publishedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(article.publishedAt)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{readingTime} dk okuma</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{article.views} görüntülenme</span>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="mb-8">
            <ShareButtons
              title={article.title}
              url={articleUrl}
              description={article.excerpt}
            />
          </div>

          {/* Featured Image */}
          {article.imageUrl && (
            <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden">
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
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Disclaimer */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-muted">
            <p className="text-sm text-muted-foreground italic">
              * Bu haber, web'de yayınlanan çeşitli kaynaklardan derlenerek
              oluşturulmuştur.
            </p>
          </div>

          {/* Keywords */}
          {article.keywords.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold mb-2">Etiketler:</h3>
              <div className="flex flex-wrap gap-2">
                {article.keywords.map((keyword: string) => (
                  <span
                    key={keyword}
                    className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="container mx-auto px-4 py-12 max-w-6xl">
            <h2 className="text-3xl font-bold mb-8">İlgili Haberler</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((related: RelatedArticle) => (
                <Link
                  key={related.id}
                  href={`/news/${related.slug}`}
                  className="group"
                >
                  {related.imageUrl && (
                    <div className="relative h-48 w-full overflow-hidden rounded-lg mb-4">
                      <Image
                        src={related.imageUrl}
                        alt={related.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  )}
                  <h3 className="font-bold line-clamp-2 group-hover:text-primary transition-colors">
                    {related.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {related.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* AdSense Placeholder */}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <section className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="bg-muted rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">Reklam</p>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
