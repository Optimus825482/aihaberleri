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
import { AdUnit } from "@/components/AdUnit";

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

  // Get related articles (now 6 for sidebar and bottom)
  const relatedArticles = await db.article.findMany({
    where: {
      categoryId: article.categoryId,
      id: { not: article.id },
      status: "PUBLISHED",
    },
    include: {
      category: true,
    },
    take: 6,
    orderBy: { publishedAt: "desc" },
  });

  type RelatedArticle = (typeof relatedArticles)[0];
  const sidebarArticles = relatedArticles.slice(0, 3);
  const bottomArticles = relatedArticles.slice(3, 6);

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

  // Split content for Ad Injection
  // We inject an ad after the 3rd paragraph
  const contentParts = article.content.split("</p>");
  const firstPart = contentParts.slice(0, 3).join("</p>") + "</p>";
  const secondPart = contentParts.slice(3).join("</p>");

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderWrapper />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateJsonLd(combinedSchema)}
      />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Top Ad Banner */}
          <div className="w-full flex justify-center mb-8">
            <AdUnit
              slotId="TOP_BANNER_SLOT_ID"
              format="auto"
              className="w-full max-w-[970px]"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content Column (8 cols) */}
            <article className="lg:col-span-8">
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

              {/* Title & Meta */}
              <h1 className="text-3xl md:text-5xl font-bold mb-6 text-foreground leading-tight">
                {article.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 border-b pb-6">
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

              {/* Featured Image - LCP Optimized */}
              {article.imageUrl && (
                <div className="relative w-full aspect-video mb-8 rounded-xl overflow-hidden shadow-lg">
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}

              {/* Share Buttons Mobile */}
              <div className="lg:hidden mb-8">
                <ShareButtons
                  title={article.title}
                  url={articleUrl}
                  description={article.excerpt}
                />
              </div>

              {/* Content Implementation */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: firstPart }} />

                {/* IN-CONTENT AD */}
                <div className="my-8 py-4 bg-muted/10 border-y border-muted flex flex-col items-center">
                  <AdUnit
                    slotId="IN_ARTICLE_SLOT_ID"
                    format="auto"
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
                    REKLAM
                  </p>
                </div>

                <div dangerouslySetInnerHTML={{ __html: secondPart }} />
              </div>

              {/* Tags */}
              {article.keywords.length > 0 && (
                <div className="mt-12 pt-6 border-t">
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                    KONULAR:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {article.keywords.map((keyword: string) => (
                      <span
                        key={keyword}
                        className="px-3 py-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full text-sm transition-colors cursor-pointer"
                      >
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Sidebar Column (4 cols) - Sticky */}
            <aside className="hidden lg:block lg:col-span-4 space-y-8">
              {/* Share Widget */}
              <div className="sticky top-24 space-y-8">
                <div className="bg-card rounded-xl p-6 shadow-sm border">
                  <h3 className="font-semibold mb-4">Paylaş</h3>
                  <ShareButtons
                    title={article.title}
                    url={articleUrl}
                    description={article.excerpt}
                  />
                </div>

                {/* Sidebar Ad */}
                <div className="bg-muted/10 rounded-xl p-4 min-h-[300px] flex items-center justify-center border border-muted/50">
                  <AdUnit slotId="SIDEBAR_SLOT_ID" format="rectangle" />
                </div>

                {/* Trending / Related */}
                <div className="bg-card rounded-xl p-6 shadow-sm border">
                  <h3 className="font-bold text-lg mb-4">İlginizi Çekebilir</h3>
                  <div className="space-y-4">
                    {sidebarArticles.map((related: RelatedArticle) => (
                      <Link
                        key={related.id}
                        href={`/news/${related.slug}`}
                        className="flex gap-3 group"
                      >
                        {related.imageUrl && (
                          <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={related.imageUrl}
                              alt={related.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform"
                            />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                            {related.title}
                          </h4>
                          <span className="text-xs text-muted-foreground mt-1 block">
                            {related.publishedAt
                              ? formatDate(related.publishedAt)
                              : ""}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Bottom Related Articles (Read Next) */}
        {bottomArticles.length > 0 && (
          <section className="bg-muted/10 py-16 mt-12 border-t">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold tracking-tight">
                  Bunları da Okuyun
                </h2>
                <Link
                  href={`/category/${article.category.slug}`}
                  className="text-primary hover:underline font-medium"
                >
                  {article.category.name} Haberleri &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {bottomArticles.map((related: RelatedArticle, idx) => (
                  <Link
                    key={related.id}
                    href={`/news/${related.slug}`}
                    className={`group bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border hover:border-primary/20 flex flex-col h-full ${
                      idx === 0 ? "md:col-span-2 lg:col-span-1" : ""
                    }`}
                  >
                    {related.imageUrl && (
                      <div className="relative h-56 w-full overflow-hidden">
                        <Image
                          src={related.imageUrl}
                          alt={related.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                        <span className="absolute bottom-4 left-4 bg-primary text-primary-foreground text-xs px-2 py-1 rounded font-medium">
                          {related.category.name}
                        </span>
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold leading-snug group-hover:text-primary transition-colors mb-3">
                        {related.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                        {related.excerpt}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground mt-auto pt-4 border-t">
                        <Calendar className="w-3 h-3 mr-1" />
                        {related.publishedAt
                          ? formatDate(related.publishedAt)
                          : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
