/**
 * Database Publisher Agent
 *
 * RESPONSIBILITIES:
 * 1. Save enriched articles with visuals to PostgreSQL
 * 2. Create both TR and EN versions
 * 3. Handle category assignment
 * 4. Generate SEO-friendly slugs
 * 5. Set publish status and timestamps
 * 6. Link to agent log for tracking
 *
 * This is the FINAL step in the multi-agent pipeline.
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { db } from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import type { ArticleWithVisuals } from "./visual-generator.agent";
import { submitArticleToIndexNow } from "@/lib/seo/indexnow";

export interface PublishedArticle {
  id: string;
  slug: string;
  title: string;
  status: "PUBLISHED";
}

export class DatabasePublisherAgent extends BaseAgent<
  ArticleWithVisuals[],
  PublishedArticle[]
> {
  protected config = {
    name: "database-publisher",
    queueName: "database-publisher",
    enableMetrics: true,
  };

  constructor() {
    super("database-publisher");
  }

  protected async process(
    job: Job<ArticleWithVisuals[]>,
  ): Promise<AgentResult<PublishedArticle[]>> {
    const articles = job.data;
    const startTime = Date.now();

    this.logger.info(`Publishing ${articles.length} articles to database...`);

    if (articles.length === 0) {
      return {
        success: true,
        data: [],
        skipNextQueue: true,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls: 0,
          itemsProcessed: 0,
        },
      };
    }

    try {
      const publishedArticles: PublishedArticle[] = [];

      for (const article of articles) {
        try {
          // Get or create category
          const categorySlug = article.suggestedCategory || "teknoloji";
          let category = await db.category.findUnique({
            where: { slug: categorySlug },
          });

          if (!category) {
            // Fallback to default category
            category = await db.category.findFirst({
              where: { slug: "teknoloji" },
            });

            if (!category) {
              throw new Error("Default category not found");
            }
          }

          // Generate slug
          const slug = generateSlug(article.synthesizedContent.tr.title);

          // Check if article already exists (duplicate check)
          const existing = await db.article.findFirst({
            where: {
              OR: [{ slug }, { sourceUrl: article.url }],
            },
          });

          if (existing) {
            this.logger.warn(
              `Article already exists: ${article.synthesizedContent.tr.title.substring(0, 50)}... (skipping)`,
            );
            continue;
          }

          // Create article in database
          const createdArticle = await db.article.create({
            data: {
              // Turkish version (primary)
              title: article.synthesizedContent.tr.title,
              slug,
              excerpt: article.synthesizedContent.tr.excerpt,
              content: article.synthesizedContent.tr.content,

              // English version
              titleEn: article.synthesizedContent.en.title,
              excerptEn: article.synthesizedContent.en.excerpt,
              contentEn: article.synthesizedContent.en.content,

              // SEO
              metaDescription: article.synthesizedContent.tr.metaDescription,
              metaDescriptionEn: article.synthesizedContent.en.metaDescription,
              keywords: article.synthesizedContent.tr.keywords,
              keywordsEn: article.synthesizedContent.en.keywords,

              // Images
              imageUrl: article.imageUrl,
              imageUrlMedium: article.imageUrlMedium,
              imageUrlSmall: article.imageUrlSmall,
              imageUrlThumb: article.imageUrlThumb,

              // Metadata
              sourceUrl: article.url,
              sourceTitle: article.title,
              sourceDescription: article.description,
              publishedAt: (article as any).publishedAt || new Date(),
              topic: article.topic,
              trendScore: article.trendScore,

              // Relations
              categoryId: category.id,
              agentLogId: (job.data[0] as any)?.agentLogId || null, // Get from first article

              // Status
              status: "PUBLISHED",
              views: 0,
            },
          });

          // Create Turkish translation in ArticleTranslation table (for i18n consistency)
          try {
            await db.articleTranslation.create({
              data: {
                articleId: createdArticle.id,
                locale: "tr",
                title: article.synthesizedContent.tr.title,
                slug: createdArticle.slug,
                excerpt: article.synthesizedContent.tr.excerpt || null,
                content: article.synthesizedContent.tr.content,
                metaTitle: article.synthesizedContent.tr.title,
                metaDescription:
                  article.synthesizedContent.tr.metaDescription || null,
              },
            });
            this.logger.info(
              `Turkish translation created: ${createdArticle.slug}`,
            );
          } catch (trError) {
            // Ignore if already exists
            if ((trError as any).code !== "P2002") {
              this.logger.warn(
                `Failed to create Turkish translation: ${(trError as Error).message}`,
              );
            }
          }

          // Create English translation in ArticleTranslation table
          let enSlugFinal = "";
          if (
            article.synthesizedContent.en?.title &&
            article.synthesizedContent.en?.content
          ) {
            const enSlug = generateSlug(article.synthesizedContent.en.title);
            enSlugFinal = enSlug;
            try {
              await db.articleTranslation.create({
                data: {
                  articleId: createdArticle.id,
                  locale: "en",
                  title: article.synthesizedContent.en.title,
                  slug: enSlug,
                  excerpt: article.synthesizedContent.en.excerpt || null,
                  content: article.synthesizedContent.en.content,
                  metaTitle: article.synthesizedContent.en.title,
                  metaDescription:
                    article.synthesizedContent.en.metaDescription || null,
                },
              });
              this.logger.info(`English translation created: ${enSlug}`);
            } catch (enError) {
              // If English slug already exists, create with unique suffix
              if ((enError as any).code === "P2002") {
                enSlugFinal = `${enSlug}-${createdArticle.id.slice(-6)}`;
                await db.articleTranslation.create({
                  data: {
                    articleId: createdArticle.id,
                    locale: "en",
                    title: article.synthesizedContent.en.title,
                    slug: enSlugFinal,
                    excerpt: article.synthesizedContent.en.excerpt || null,
                    content: article.synthesizedContent.en.content,
                    metaTitle: article.synthesizedContent.en.title,
                    metaDescription:
                      article.synthesizedContent.en.metaDescription || null,
                  },
                });
                this.logger.info(
                  `English translation created with unique slug: ${enSlugFinal}`,
                );
              } else {
                this.logger.warn(
                  `Failed to create English translation: ${(enError as Error).message}`,
                );
              }
            }
          }

          // Submit to IndexNow (Bing, Yandex) for both TR and EN URLs
          try {
            // Submit Turkish URL
            await submitArticleToIndexNow(createdArticle.slug);
            this.logger.info(`IndexNow: Turkish URL submitted`);

            // Submit English URL if available
            if (enSlugFinal) {
              const baseUrl =
                process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
              const enUrl = `${baseUrl}/en/news/${enSlugFinal}`;
              const { submitUrlToIndexNow } =
                await import("@/lib/seo/indexnow");
              await submitUrlToIndexNow(enUrl, createdArticle.id);
              this.logger.info(`IndexNow: English URL submitted`);
            }
          } catch (indexError) {
            this.logger.warn(
              `IndexNow submission failed: ${(indexError as Error).message}`,
            );
          }

          publishedArticles.push({
            id: createdArticle.id,
            slug: createdArticle.slug,
            title: createdArticle.title,
            status: "PUBLISHED",
          });

          this.logger.success(
            `Published: ${createdArticle.title.substring(0, 50)}... (${createdArticle.slug})`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to publish article: ${article.synthesizedContent.tr.title.substring(0, 50)}...`,
            this.serializeError(error),
          );
          // Continue with next article
        }
      }

      this.logger.success(
        `Database publishing complete: ${publishedArticles.length}/${articles.length} articles published`,
      );

      return {
        success: true,
        data: publishedArticles,
        skipNextQueue: true, // This is the final step
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls: 0,
          itemsProcessed: publishedArticles.length,
        },
      };
    } catch (error) {
      this.logger.error(
        "Database publishing failed:",
        this.serializeError(error),
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls: 0,
          itemsProcessed: 0,
        },
      };
    }
  }
}
