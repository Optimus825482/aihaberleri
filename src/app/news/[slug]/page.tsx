import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { ShareButtons } from "@/components/ShareButtons";
import { formatDate, calculateReadingTime } from "@/lib/utils";
import type { Metadata } from "next";
import {
  generateNewsArticleSchema,
  generateBreadcrumbSchema,
  generateJsonLd,
  combineSchemas,
  generateArticleMetadata,
} from "@/lib/seo";
import { AudioPlayer } from "@/components/AudioPlayer";
import { AudioPromo } from "@/components/AudioPromo";
import { HighlightedText } from "@/components/audio/HighlightedText";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { ArticleImage } from "@/components/ResponsiveImage";
import { LikeButton } from "@/components/interactions/LikeButton";
import { StarRating } from "@/components/interactions/StarRating";
import { ViewTracker } from "@/components/ViewTracker";
// AI Disclaimer is now embedded in article content footer (see content.service.ts)

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
    include: {
      category: true,
    },
  });

  if (!article) {
    return {
      title: "Haber Bulunamadı",
    };
  }

  const baseMetadata = generateArticleMetadata(article);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Find English translation for hreflang using raw query
  const enTranslation = await db.$queryRaw<{ slug: string }[]>`
    SELECT slug FROM "ArticleTranslation" 
    WHERE "articleId" = ${article.id} AND locale = 'en'
    LIMIT 1
  `;

  const hasEnglish = enTranslation.length > 0;

  return {
    ...baseMetadata,
    alternates: {
      canonical: `${baseUrl}/news/${article.slug}`,
      languages: hasEnglish
        ? {
            tr: `${baseUrl}/news/${article.slug}`,
            en: `${baseUrl}/en/news/${enTranslation[0].slug}`,
          }
        : {
            tr: `${baseUrl}/news/${article.slug}`,
          },
    },
  };
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

  // View tracking is now handled client-side with ViewTracker component
  // This prevents duplicate counts on page refresh/bot crawls

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
      {/* View Tracking - Client-side with session control */}
      <ViewTracker articleId={article.id} />

      {/* Analytics Tracking */}
      <AnalyticsTracker articleId={article.id} />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateJsonLd(combinedSchema)}
      />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content Column (8 cols) */}
            <article className="lg:col-span-8">
              {/* Breadcrumb */}
              <nav className="mb-6 text-sm text-ai-text-secondary flex items-center gap-2">
                <Link
                  href="/"
                  className="hover:text-ai-primary transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    home
                  </span>
                  Ana Sayfa
                </Link>
                <span className="text-ai-text-muted">/</span>
                <Link
                  href={`/category/${article.category.slug}`}
                  className="hover:text-ai-primary transition-colors"
                >
                  {article.category.name}
                </Link>
                <span className="text-ai-text-muted">/</span>
                <span className="text-white truncate max-w-[200px]">
                  {article.title}
                </span>
              </nav>

              {/* Title & Meta */}
              <h1 className="text-3xl md:text-5xl font-bold mb-6 text-white leading-tight">
                {article.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-ai-text-secondary mb-6 border-b border-ai-surface-border pb-6">
                {article.publishedAt && (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      calendar_today
                    </span>
                    <time dateTime={article.publishedAt.toISOString()}>
                      {formatDate(article.publishedAt)}
                    </time>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">
                    schedule
                  </span>
                  <span>{readingTime} dk okuma</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">
                    visibility
                  </span>
                  <span>
                    {article.views.toLocaleString("tr-TR")} görüntülenme
                  </span>
                </div>
                <div className="flex items-center gap-1 border-l border-ai-surface-border pl-4 ml-2">
                  <LikeButton
                    articleId={article.id}
                    initialLikes={(article as any).likes || 0}
                    size="sm"
                  />
                </div>
                {/* Trend Score Badge */}
                {(article.trendScore ?? 0) > 0 && (
                  <div className="flex items-center gap-1 border-l border-ai-surface-border pl-4 ml-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 font-bold tabular-nums rounded-md border ${
                        (article.trendScore ?? 0) >= 80
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : (article.trendScore ?? 0) >= 60
                            ? "bg-lime-500/20 text-lime-400 border-lime-500/30"
                            : (article.trendScore ?? 0) >= 40
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        trending_up
                      </span>
                      {article.trendScore}
                    </span>
                  </div>
                )}
              </div>

              {/* Featured Image - LCP Optimized with Responsive Sizes */}
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

              {/* Share Buttons Mobile */}
              <div className="lg:hidden mb-8">
                <ShareButtons
                  title={article.title}
                  url={articleUrl}
                  description={article.excerpt}
                />
              </div>

              {/* Audio Player Integration */}
              <div className="mb-8">
                <AudioPlayer title={article.title} text={article.content} />
              </div>

              {/* Content Implementation */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <HighlightedText
                  htmlContent={firstPart}
                  articleTitle={article.title}
                />

                <HighlightedText
                  htmlContent={secondPart}
                  articleTitle={article.title}
                />
              </div>

              {/* Rating Section */}
              <div className="my-8 p-6 bg-ai-surface-card rounded-xl border border-ai-surface-border">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-[20px] text-ai-primary">
                    star
                  </span>
                  Bu haberi nasıl buldunuz?
                </h3>
                <StarRating
                  articleId={article.id}
                  initialRating={(article as any).rating || 0}
                  initialCount={(article as any).ratingCount || 0}
                />
              </div>

              {/* Tags */}
              {article.keywords.length > 0 && (
                <div className="mt-12 pt-6 border-t border-ai-surface-border">
                  <h3 className="text-sm font-semibold mb-3 text-ai-text-secondary uppercase tracking-wider">
                    KONULAR:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {article.keywords.map((keyword: string) => (
                      <span
                        key={keyword}
                        className="px-3 py-1 bg-ai-surface-dark hover:bg-ai-surface-hover border border-ai-surface-border text-ai-text-secondary hover:text-white rounded-full text-sm transition-colors cursor-pointer"
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
                <div className="bg-ai-surface-card rounded-xl p-6 border border-ai-surface-border">
                  <h3 className="font-semibold mb-4 text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-ai-primary">
                      share
                    </span>
                    Paylaş
                  </h3>
                  <ShareButtons
                    title={article.title}
                    url={articleUrl}
                    description={article.excerpt}
                  />
                </div>

                {/* Trending / Related */}
                <div className="bg-ai-surface-card rounded-xl p-6 border border-ai-surface-border">
                  <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-ai-primary">
                      recommend
                    </span>
                    İlginizi Çekebilir
                  </h3>
                  <div className="space-y-4">
                    {sidebarArticles.map((related: RelatedArticle) => (
                      <Link
                        key={related.id}
                        href={`/news/${related.slug}`}
                        className="flex gap-3 group"
                      >
                        {related.imageUrl && (
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-ai-surface-border">
                            <Image
                              src={related.imageUrl}
                              alt={related.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform"
                              unoptimized={
                                related.imageUrl.includes("pollinations.ai") ||
                                related.imageUrl.includes("r2.dev") ||
                                related.imageUrl.includes(
                                  "images.aihaberleri.org",
                                )
                              }
                            />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-ai-primary transition-colors text-white">
                            {related.title}
                          </h4>
                          <span className="text-xs text-ai-text-muted mt-1 block">
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
          <section className="bg-ai-surface-dark py-16 mt-12 border-t border-ai-surface-border">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                  <span className="material-symbols-outlined text-[32px] text-ai-primary">
                    auto_stories
                  </span>
                  Bunları da Okuyun
                </h2>
                <Link
                  href={`/category/${article.category.slug}`}
                  className="text-ai-primary hover:text-ai-primary-hover font-medium flex items-center gap-1 transition-colors"
                >
                  {article.category.name} Haberleri
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {bottomArticles.map((related: RelatedArticle, idx) => (
                  <Link
                    key={related.id}
                    href={`/news/${related.slug}`}
                    className={`group bg-ai-surface-card rounded-2xl overflow-hidden border border-ai-surface-border hover:border-ai-primary/40 transition-all duration-300 flex flex-col h-full ${
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
                          unoptimized={
                            related.imageUrl.includes("pollinations.ai") ||
                            related.imageUrl.includes("r2.dev") ||
                            related.imageUrl.includes("images.aihaberleri.org")
                          }
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ai-background-dark/80 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                        <span className="absolute bottom-4 left-4 bg-ai-primary text-white text-xs px-2 py-1 rounded font-medium">
                          {related.category.name}
                        </span>
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold leading-snug group-hover:text-ai-primary transition-colors mb-3 text-white">
                        {related.title}
                      </h3>
                      <p className="text-sm text-ai-text-secondary line-clamp-3 mb-4 flex-1">
                        {related.excerpt}
                      </p>
                      <div className="flex items-center text-xs text-ai-text-muted mt-auto pt-4 border-t border-ai-surface-border">
                        <span className="material-symbols-outlined text-[14px] mr-1">
                          calendar_today
                        </span>
                        {related.publishedAt && (
                          <time dateTime={related.publishedAt.toISOString()}>
                            {formatDate(related.publishedAt)}
                          </time>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <AudioPromo />
    </div>
  );
}
