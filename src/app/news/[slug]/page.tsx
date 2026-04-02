import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCache } from "@/lib/cache";
import { toIsoDateString } from "@/lib/date-utils";
import { ShareButtons } from "@/components/ShareButtons";
import { formatDate, calculateReadingMinutes } from "@/lib/utils";
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
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ad-slots";
import { HighlightedText } from "@/components/audio/HighlightedText";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { ArticleImage } from "@/components/ResponsiveImage";
import { LikeButton } from "@/components/interactions/LikeButton";
import { StarRating } from "@/components/interactions/StarRating";
import { ViewTracker } from "@/components/ViewTracker";
import { ReadCount } from "@/components/ReadCount";
import { ReadingProgressBar } from "@/components/ReadingProgressBar";
import { AITermsGlossary } from "@/components/article/AITermsGlossary";
import { MobileArticleActionBar } from "@/components/article/MobileArticleActionBar";
import { SaveArticleButton } from "@/components/article/SaveArticleButton";
import { InlineRelatedArticles } from "@/components/article/InlineRelatedArticles";
import {
  ArticleInsightTopSections,
  ArticleTimelineSection,
} from "@/components/article/ArticleInsightSections";
import {
  buildSummaryPoints,
  buildTimelineItems,
  buildWhyImportantPoints,
  getArticleInsightDisplaySettings,
} from "@/lib/article-insights";
// AI Disclaimer is now embedded in article content footer (see content.service.ts)

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

function extractSourceCountFromContent(content: string, sourceUrl?: string | null): number {
  const uniqueSources = new Set<string>();

  if (sourceUrl) {
    uniqueSources.add(sourceUrl.trim());
  }

  const sourceLinkMatches = content.match(/<a[^>]+class=["'][^"']*source-link[^"']*["'][^>]*href=["']([^"']+)["']/gi) || [];
  for (const linkTag of sourceLinkMatches) {
    const hrefMatch = linkTag.match(/href=["']([^"']+)["']/i);
    if (hrefMatch?.[1]) {
      uniqueSources.add(hrefMatch[1].trim());
    }
  }

  const aiDisclosureBlocks = content.match(/<div[^>]+class=["'][^"']*ai-disclosure[^"']*["'][^>]*>[\s\S]*?<\/div>/gi) || [];
  for (const block of aiDisclosureBlocks) {
    const blockLinks = block.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
    for (const linkTag of blockLinks) {
      const hrefMatch = linkTag.match(/href=["']([^"']+)["']/i);
      if (hrefMatch?.[1]) {
        uniqueSources.add(hrefMatch[1].trim());
      }
    }
  }

  const plainTextSourceMatch = content.match(/(?:Kaynaklar|Sources):\s*([^<\n]+)/i);
  if (plainTextSourceMatch?.[1]) {
    plainTextSourceMatch[1]
      .split(/•|,|\||;/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .forEach((item) => uniqueSources.add(item));
  }

  return uniqueSources.size;
}

// React.cache() — per-request dedup: generateMetadata + page share same DB query
// Redis L2 cache (5 min TTL) sits inside to avoid repeated DB hits across requests
const getArticle = cache(async (slug: string) => {
  const cacheKey = `article:tr:${slug}`;
  const cacheInstance = getCache();

  const cached = await cacheInstance.get<Awaited<ReturnType<typeof db.article.findUnique>>>(cacheKey);
  if (cached) return cached;

  const article = await db.article.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (article) {
    await cacheInstance.set(cacheKey, article, {
      ttl: 300, // 5 minutes
      tags: ["articles", `article:${slug}`],
    });
  }

  return article;
});

const getInsightSettings = cache(async () =>
  getArticleInsightDisplaySettings(() =>
    db.setting.findMany({
      where: {
        key: {
          in: [
            "site_insight_summary",
            "site_insight_importance",
            "site_insight_timeline",
            "site_feature_glossary",
            "site_feature_mobile_action_bar",
            "site_feature_verification_panel",
          ],
        },
      },
      select: { key: true, value: true },
    }),
  ),
);

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug); // Uses React.cache — deduped with page

  if (!article) {
    return { title: "Haber Bulunamadı" };
  }

  // Parallel: metadata generation + EN translation lookup
  const [baseMetadata, enTranslation] = await Promise.all([
    Promise.resolve(generateArticleMetadata(article)),
    db.$queryRaw<{ slug: string }[]>`
      SELECT slug FROM "ArticleTranslation" 
      WHERE "articleId" = ${article.id} AND locale = 'en'
      LIMIT 1
    `,
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const hasEnglish = enTranslation.length > 0;

  return {
    ...baseMetadata,
    alternates: {
      canonical: `${baseUrl}/news/${article.slug}`,
      languages: hasEnglish
        ? {
            tr: `${baseUrl}/news/${article.slug}`,
            en: `${baseUrl}/en/news/${enTranslation[0].slug}`,
            // x-default → TR canonical (primary language of the site)
            "x-default": `${baseUrl}/news/${article.slug}`,
          }
        : {
            tr: `${baseUrl}/news/${article.slug}`,
            "x-default": `${baseUrl}/news/${article.slug}`,
          },
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticle(slug); // React.cache — deduped with generateMetadata

  if (!article || article.status !== "PUBLISHED") {
    notFound();
  }

  const relatedCandidateArticles = await db.article.findMany({
    where: {
      OR: [
        ...(article.topic ? [{ topic: article.topic }] : []),
        { categoryId: article.categoryId },
        ...(article.keywords.length > 0
          ? [{ keywords: { hasSome: article.keywords.slice(0, 8) } }]
          : []),
      ],
      id: { not: article.id },
      status: "PUBLISHED",
    },
    include: { category: true },
    take: 27,
    orderBy: { publishedAt: "desc" },
  });

  const dedupedRelated = new Map<string, (typeof relatedCandidateArticles)[0]>();
  for (const item of relatedCandidateArticles) {
    if (!dedupedRelated.has(item.id)) {
      dedupedRelated.set(item.id, item);
    }
  }

  // 9 ilgili makale: 3 sidebar + 3 inline (içerik ortası) + 3 alt grid
  let relatedArticles = Array.from(dedupedRelated.values()).slice(0, 9);

  if (relatedArticles.length < 9) {
    const fallbackArticles = await db.article.findMany({
      where: {
        id: {
          notIn: [article.id, ...relatedArticles.map((item) => item.id)],
        },
        status: "PUBLISHED",
      },
      include: { category: true },
      take: 9 - relatedArticles.length,
      orderBy: { publishedAt: "desc" },
    });

    relatedArticles = [...relatedArticles, ...fallbackArticles];
  }

  type RelatedArticle = (typeof relatedArticles)[0];
  const sidebarArticles = relatedArticles.slice(0, 3);
  const inlineArticles = relatedArticles.slice(3, 6);  // İçerik ortasına enjekte edilecek
  const bottomArticles = relatedArticles.slice(6, 9);  // Alt grid

  const readingTime = calculateReadingMinutes(article.content);
  const insightSettings = await getInsightSettings();
  const articleUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/news/${article.slug}`;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const articlePublishedTime = toIsoDateString(article.publishedAt);
  const summaryPoints = buildSummaryPoints(article.excerpt || "", article.content);

  const whyImportantPoints = buildWhyImportantPoints({
    locale: "tr",
    categoryName: article.category.name,
    trendScore: article.trendScore,
    readingTime,
  });

  const timelineItems = buildTimelineItems([article, ...relatedArticles.slice(0, 4)]);
  const sourceCount = extractSourceCountFromContent(article.content, article.sourceUrl);

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
      <ReadingProgressBar />

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
                    <time dateTime={articlePublishedTime}>
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
                <ReadCount slug={article.slug} fallbackViews={article.views} />
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
              {article.imageUrl && (article.imageUrl.startsWith("http://") || article.imageUrl.startsWith("https://")) && (
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
              <div id="article-audio-player" className="mb-8">
                <AudioPlayer title={article.title} text={article.content} />
              </div>

              <ArticleInsightTopSections
                locale="tr"
                summaryPoints={
                  insightSettings.showSummary ? summaryPoints : []
                }
                whyImportantPoints={
                  insightSettings.showImportance ? whyImportantPoints : []
                }
              />

              {/* Content Implementation */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <HighlightedText
                  htmlContent={firstPart}
                  articleTitle={article.title}
                />

                <AdSlot
                  slot={AD_SLOTS.ARTICLE_INLINE_TR}
                  format="fluid"
                  layout="in-article"
                  minHeight={140}
                  label="Sponsorlu İçerik"
                  className="my-6 rounded-xl border border-ai-surface-border bg-ai-surface-card p-3 not-prose text-center"
                />

                {/* İçerik ortasına inline internal link bölümü */}
                {/* SEO: okuyucu içeriğin tam ortasında iken bağlantılı sayfalara PageRank aktarımı */}
                <InlineRelatedArticles
                  articles={inlineArticles}
                  currentCategoryName={article.category.name}
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
                      // Tıklanabilir search linki — Internal link + kullanıcı keşfi
                      <Link
                        key={keyword}
                        href={`/search?q=${encodeURIComponent(keyword)}`}
                        className="px-3 py-1 bg-ai-surface-dark hover:bg-ai-primary/20 border border-ai-surface-border hover:border-ai-primary/40 text-ai-text-secondary hover:text-ai-primary rounded-full text-sm transition-colors"
                      >
                        #{keyword}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {insightSettings.showTimeline && (
                <ArticleTimelineSection
                  locale="tr"
                  items={timelineItems}
                  currentArticleId={article.id}
                />
              )}

              {insightSettings.showVerificationPanel && (
                <section className="mt-8 rounded-xl border border-ai-surface-border bg-ai-surface-card p-4">
                  <h3 className="mb-2 text-sm font-semibold text-white">Doğrulama Paneli</h3>
                  <div className="grid grid-cols-1 gap-2 text-xs text-ai-text-secondary sm:grid-cols-3">
                    <div className="rounded-lg border border-ai-surface-border bg-ai-surface-dark px-3 py-2">
                      <p className="text-ai-text-muted">Kaynak Sayısı</p>
                      <p className="font-semibold text-white">{sourceCount}</p>
                    </div>
                    <div className="rounded-lg border border-ai-surface-border bg-ai-surface-dark px-3 py-2">
                      <p className="text-ai-text-muted">İlk Yayın</p>
                      <p className="font-semibold text-white">
                        {article.publishedAt ? formatDate(article.publishedAt) : "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-ai-surface-border bg-ai-surface-dark px-3 py-2">
                      <p className="text-ai-text-muted">Son Güncelleme</p>
                      <p className="font-semibold text-white">{formatDate(article.updatedAt)}</p>
                    </div>
                  </div>
                </section>
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

                {/* Favorilere Ekle — Desktop */}
                <div className="bg-ai-surface-card rounded-xl p-6 border border-ai-surface-border">
                  <SaveArticleButton
                    variant="sidebar"
                    articleId={article.id}
                    title={article.title}
                    slug={article.slug}
                    imageUrl={article.imageUrl}
                    excerpt={article.excerpt ?? undefined}
                    category={article.category?.name}
                  />
                </div>

                {insightSettings.showGlossary && (
                  <AITermsGlossary
                    title="Bu Haberde Geçen AI Terimleri"
                    articleText={`${article.title} ${article.excerpt} ${article.content}`}
                    maxTerms={10}
                    compact
                    className="mb-0"
                  />
                )}

                {/* Sidebar Ad Slot — dedicated sidebar-display unit */}
                <AdSlot
                  slot={AD_SLOTS.SIDEBAR_DISPLAY}
                  format="vertical"
                  minHeight={250}
                  label="Sponsorlu"
                  className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
                />

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
                        {(related.imageUrl?.startsWith("http://") || related.imageUrl?.startsWith("https://")) ? (
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-ai-surface-border">
                            <Image
                              src={related.imageUrl}
                              alt={related.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform"
                              unoptimized={
                                related.imageUrl.includes("pollinations.ai") ||
                                related.imageUrl.includes("r2.dev") ||
                                related.imageUrl.includes("images.aihaberleri.org")
                              }
                            />
                          </div>
                        ) : (
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-ai-surface-border bg-ai-surface-dark flex items-center justify-center">
                            <span className="material-symbols-outlined text-[28px] text-ai-text-muted/60">article</span>
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
                    {sidebarArticles.length === 0 && (
                      <p className="text-sm text-ai-text-secondary">
                        Henüz öneri bulunamadı.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Article Bottom Ad — High-value placement */}
        <div className="container mx-auto px-4 mt-8">
          <AdSlot
            slot={AD_SLOTS.ARTICLE_BOTTOM}
            format="auto"
            responsive
            minHeight={120}
            label="Sponsorlu"
            className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
          />
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
                    {(related.imageUrl?.startsWith("http://") || related.imageUrl?.startsWith("https://")) ? (
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
                    ) : (
                      <div className="relative h-56 w-full overflow-hidden bg-ai-surface-dark flex items-center justify-center">
                        <span className="material-symbols-outlined text-[48px] text-ai-text-muted/40">article</span>
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
                          <time dateTime={toIsoDateString(related.publishedAt)}>
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

        {/* Multiplex Ad — Recommended content style */}
        <div className="container mx-auto px-4 py-8">
          <AdSlot
            slot={AD_SLOTS.MULTIPLEX_RELATED}
            format="autorelaxed"
            minHeight={180}
            label="Sponsorlu İçerikler"
            className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-3"
          />
        </div>
      </main>

      <AudioPromo />
      {insightSettings.showMobileActionBar && (
        <MobileArticleActionBar
          articleId={article.id}
          title={article.title}
          url={articleUrl}
          slug={article.slug}
          imageUrl={article.imageUrl}
          excerpt={article.excerpt ?? undefined}
          category={article.category?.name}
        />
      )}
    </div>
  );
}
