/**
 * Database Publisher Agent
 *
 * RESPONSIBILITIES:
 * 1. Save enriched articles with visuals to PostgreSQL
 * 2. Create both TR and EN versions (ArticleTranslation table)
 * 3. Handle category assignment
 * 4. Generate SEO-friendly slugs
 * 5. Set publish status and timestamps
 * 6. Link to agent log for tracking
 * 7. Send push notifications (Firebase)
 * 8. Notify search engines (IndexNow)
 *
 * This is the FINAL step in the multi-agent pipeline.
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { db } from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import type { ArticleWithVisuals } from "./visual-generator.agent";
import { notifyBothLanguages } from "@/lib/seo/indexing-tracker";
import {
  recordShareSuccess,
  recordShareFailure,
} from "@/services/social-share.service";
import { calculateTrendScore } from "@/lib/trend-scoring";

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

    // Get targetCount from DB settings to enforce publish limit
    // UPDATED 2026-02-10: Default increased to guarantee 1+ article per pipeline run
    let maxPublish = articles.length; // default: publish all
    try {
      const setting = await db.setting.findUnique({
        where: { key: "agent.articlesPerRun" },
      });
      if (setting) {
        maxPublish = Math.max(2, parseInt(setting.value)); // Minimum 2 articles per run
      }
    } catch {
      // Fallback to publishing all articles
    }

    this.logger.info(
      `Publishing ${articles.length} articles (limit: ${maxPublish})...`,
    );

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
        // Enforce targetCount limit — stop publishing after reaching max
        if (publishedArticles.length >= maxPublish) {
          this.logger.info(
            `Target reached (${maxPublish}) — skipping remaining ${articles.length - articles.indexOf(article)} articles`,
          );
          break;
        }

        try {
          // Get or create category
          const categorySlug = article.suggestedCategory || "yapay-zeka";
          let category = await db.category.findUnique({
            where: { slug: categorySlug },
          });

          if (!category) {
            // Fallback to default category
            category = await db.category.findFirst({
              where: { slug: "yapay-zeka" },
            });

            if (!category) {
              // Auto-create default category if missing
              this.logger.warn(
                `⚠️ Default category "yapay-zeka" not found — creating it automatically`,
              );
              category = await db.category.create({
                data: {
                  name: "Yapay Zeka",
                  slug: "yapay-zeka",
                  description: "Yapay zeka haberleri ve gelişmeleri",
                },
              });
              this.logger.success(`✅ Default category created: yapay-zeka`);
            }
          }

          // Validate required fields before DB insert
          const trContent = article.synthesizedContent?.tr;
          const enContent = article.synthesizedContent?.en;

          if (!trContent?.title || !trContent?.content || !trContent?.excerpt) {
            this.logger.warn(
              `⛔ CONTENT REJECTED at publisher: "${article.url.substring(0, 60)}" — missing TR fields: title=${!!trContent?.title}, content=${!!trContent?.content}, excerpt=${!!trContent?.excerpt}`,
            );
            continue;
          }

          // Generate slug
          const slug = generateSlug(trContent.title);

          // Check if article already exists (duplicate check)
          const existing = await db.article.findFirst({
            where: {
              OR: [{ slug }, { sourceUrl: article.url }],
            },
          });

          if (existing) {
            const matchType = existing.slug === slug ? "slug" : "sourceUrl";
            this.logger.warn(
              `⛔ DUPLICATE REJECTED at publisher: "${trContent.title.substring(0, 60)}..." — matched by ${matchType} (existing ID: ${existing.id})`,
            );
            continue;
          }

          // Calculate content-based trend score if pipeline didn't provide one
          const pipelineTrendScore = article.trendScore || 0;
          let finalTrendScore = pipelineTrendScore;

          if (pipelineTrendScore === 0) {
            const contentScore = calculateTrendScore({
              title: trContent.title,
              description: trContent.excerpt || article.description || "",
              publishedAt: (article as any).publishedAt || new Date(),
              url: article.url,
            });
            finalTrendScore = contentScore.total;
            this.logger.info(
              `📊 Content-based trend score: ${finalTrendScore} (AI:${contentScore.aiRelevance} F:${contentScore.freshness} S:${contentScore.sourceAuthority} T:${contentScore.titleQuality})`,
            );
          }

          // Create article in database
          const createdArticle = await db.article.create({
            data: {
              // Turkish version (primary)
              title: trContent.title,
              slug,
              excerpt: trContent.excerpt,
              content: trContent.content,

              // English version
              titleEn: enContent?.title || null,
              excerptEn: enContent?.excerpt || null,
              contentEn: enContent?.content || null,

              // SEO
              metaDescription: trContent.metaDescription || null,
              metaDescriptionEn: enContent?.metaDescription || null,
              keywords: trContent.keywords || [],
              keywordsEn: enContent?.keywords || [],

              // Images
              imageUrl: article.imageUrl,
              imageUrlMedium: article.imageUrlMedium,
              imageUrlSmall: article.imageUrlSmall,
              imageUrlThumb: article.imageUrlThumb,

              // Metadata
              sourceUrl: article.url,
              publishedAt: (article as any).publishedAt || new Date(),
              topic: article.topic,
              trendScore: finalTrendScore,
              isTrending: finalTrendScore >= 50,
              score: trContent.score || finalTrendScore || 0,

              // Relations
              categoryId: category.id,
              agentLogId: (article as any)?.agentLogId || null, // Get from current article

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
                title: trContent.title,
                slug: createdArticle.slug,
                excerpt: trContent.excerpt || null,
                content: trContent.content,
                metaTitle: trContent.title,
                metaDescription: trContent.metaDescription || null,
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
          if (enContent?.title && enContent?.content) {
            const enSlug = generateSlug(enContent.title);
            enSlugFinal = enSlug;
            try {
              await db.articleTranslation.create({
                data: {
                  articleId: createdArticle.id,
                  locale: "en",
                  title: enContent.title,
                  slug: enSlug,
                  excerpt: enContent.excerpt || null,
                  content: enContent.content,
                  metaTitle: enContent.title,
                  metaDescription: enContent.metaDescription || null,
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
                    title: enContent.title,
                    slug: enSlugFinal,
                    excerpt: enContent.excerpt || null,
                    content: enContent.content,
                    metaTitle: enContent.title,
                    metaDescription: enContent.metaDescription || null,
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

          // Submit to IndexNow + Google Indexing API (both TR and EN)
          // Uses indexing-tracker which handles DB status updates automatically
          try {
            notifyBothLanguages(
              createdArticle.id,
              createdArticle.slug,
              enSlugFinal || undefined,
            )
              .then((results) => {
                const trSuccess = results.turkish.filter(
                  (r) => r.success,
                ).length;
                const enSuccess = results.english.filter(
                  (r) => r.success,
                ).length;
                this.logger.info(
                  `🔍 Indexing: TR ${trSuccess}/${results.turkish.length}, EN ${enSuccess}/${results.english.length}`,
                );
              })
              .catch((err) =>
                this.logger.warn(
                  `Indexing notification failed: ${err.message}`,
                ),
              );
          } catch (indexError) {
            this.logger.warn(
              `Indexing setup failed: ${(indexError as Error).message}`,
            );
          }

          // Send push notification (async - don't block publishing)
          try {
            const { sendPushNotification } = await import("@/lib/push");
            const articleUrl = `https://aihaberleri.org/news/${createdArticle.slug}`;
            sendPushNotification(
              createdArticle.title,
              trContent.excerpt || createdArticle.title.substring(0, 100),
              articleUrl,
            )
              .then(() => this.logger.info(`📱 Push notification sent`))
              .catch((err) =>
                this.logger.warn(`Push notification failed: ${err.message}`),
              );
          } catch (pushError) {
            this.logger.warn(
              `Push notification setup failed: ${(pushError as Error).message}`,
            );
          }

          // Post to Twitter (async - don't block publishing)
          try {
            const { postTweet } = await import("@/lib/social/twitter");
            postTweet({
              title: createdArticle.title,
              slug: createdArticle.slug,
              excerpt: trContent.excerpt || "",
              categoryName: category.name,
            })
              .then(() => this.logger.info(`🐦 Tweet posted`))
              .catch((err) => this.logger.warn(`Tweet failed: ${err.message}`));
          } catch (twitterError) {
            this.logger.warn(
              `Twitter setup failed: ${(twitterError as Error).message}`,
            );
          }

          // Post to Facebook (async - don't block publishing)
          try {
            const { postToFacebook } = await import("@/lib/social/facebook");
            postToFacebook({
              title: createdArticle.title,
              slug: createdArticle.slug,
              excerpt: trContent.excerpt || "",
              imageUrl: article.imageUrl,
              categoryName: category.name,
            })
              .then(async (postId) => {
                if (postId) {
                  await recordShareSuccess(
                    createdArticle.id,
                    "FACEBOOK",
                    "tr",
                    postId,
                  );
                }
                this.logger.info(`📘 Facebook post created`);
              })
              .catch(async (err) => {
                await recordShareFailure(
                  createdArticle.id,
                  "FACEBOOK",
                  "tr",
                  err?.message || "Unknown error",
                );
                this.logger.warn(`Facebook post failed: ${err.message}`);
              });
          } catch (facebookError) {
            this.logger.warn(
              `Facebook setup failed: ${(facebookError as Error).message}`,
            );
          }

          // Post to Bluesky (async - don't block publishing)
          try {
            const { postToBluesky } = await import("@/lib/social/bluesky");
            postToBluesky({
              title: createdArticle.title,
              slug: createdArticle.slug,
              excerpt: trContent.excerpt || "",
              imageUrl: article.imageUrl,
              categoryName: category.name,
            })
              .then(async (postId) => {
                if (postId) {
                  await recordShareSuccess(
                    createdArticle.id,
                    "BLUESKY",
                    "tr",
                    postId,
                  );
                }
                this.logger.info(`🦋 Bluesky post created`);
              })
              .catch(async (err) => {
                await recordShareFailure(
                  createdArticle.id,
                  "BLUESKY",
                  "tr",
                  err?.message || "Unknown error",
                );
                this.logger.warn(`Bluesky post failed: ${err.message}`);
              });
          } catch (blueskyError) {
            this.logger.warn(
              `Bluesky setup failed: ${(blueskyError as Error).message}`,
            );
          }

          // Post to Mastodon (async - don't block publishing)
          try {
            const { postToMastodon } = await import("@/lib/social/mastodon");
            postToMastodon({
              title: createdArticle.title,
              slug: createdArticle.slug,
              excerpt: trContent.excerpt || "",
              imageUrl: article.imageUrl,
              categoryName: category.name,
            })
              .then(async (postId) => {
                if (postId) {
                  await recordShareSuccess(
                    createdArticle.id,
                    "MASTODON",
                    "tr",
                    postId,
                  );
                }
                this.logger.info(`🐘 Mastodon post created`);
              })
              .catch(async (err) => {
                await recordShareFailure(
                  createdArticle.id,
                  "MASTODON",
                  "tr",
                  err?.message || "Unknown error",
                );
                this.logger.warn(`Mastodon post failed: ${err.message}`);
              });
          } catch (mastodonError) {
            this.logger.warn(
              `Mastodon setup failed: ${(mastodonError as Error).message}`,
            );
          }

          // ✅ Social media sharing completed (Facebook, Bluesky, Mastodon)
          this.logger.info(
            `✅ Social media sharing completed for article: ${createdArticle.id}`,
          );

          // ============================================================
          // ENGLISH SOCIAL MEDIA SHARES
          // ============================================================
          if (enSlugFinal && enContent?.title) {
            const enExcerpt = enContent.excerpt || "";
            const enTitle = enContent.title;

            // Post to Bluesky EN (async)
            try {
              const { postToBluesky } = await import("@/lib/social/bluesky");
              postToBluesky({
                title: enTitle,
                slug: `en/news/${enSlugFinal}`,
                excerpt: enExcerpt,
                imageUrl: article.imageUrl,
                categoryName: "AI News",
              })
                .then(async (postId) => {
                  if (postId) {
                    await recordShareSuccess(
                      createdArticle.id,
                      "BLUESKY",
                      "en",
                      postId,
                    );
                    this.logger.info(`🦋 Bluesky EN post created`);
                  } else {
                    this.logger.info(`🦋 Bluesky EN skipped (disabled)`);
                  }
                })
                .catch(async (err) => {
                  await recordShareFailure(
                    createdArticle.id,
                    "BLUESKY",
                    "en",
                    err?.message || "Unknown error",
                  );
                  this.logger.warn(`Bluesky EN post failed: ${err.message}`);
                });
            } catch (blueskyEnError) {
              this.logger.warn(
                `Bluesky EN setup failed: ${(blueskyEnError as Error).message}`,
              );
            }

            // Post to Mastodon EN (async)
            try {
              const { postToMastodon } = await import("@/lib/social/mastodon");
              postToMastodon({
                title: enTitle,
                slug: `en/news/${enSlugFinal}`,
                excerpt: enExcerpt,
                imageUrl: article.imageUrl,
                categoryName: "AI News",
              })
                .then(async (postId) => {
                  if (postId) {
                    await recordShareSuccess(
                      createdArticle.id,
                      "MASTODON",
                      "en",
                      postId,
                    );
                    this.logger.info(`🐘 Mastodon EN post created`);
                  } else {
                    this.logger.info(`🐘 Mastodon EN skipped (disabled)`);
                  }
                })
                .catch(async (err) => {
                  await recordShareFailure(
                    createdArticle.id,
                    "MASTODON",
                    "en",
                    err?.message || "Unknown error",
                  );
                  this.logger.warn(`Mastodon EN post failed: ${err.message}`);
                });
            } catch (mastodonEnError) {
              this.logger.warn(
                `Mastodon EN setup failed: ${(mastodonEnError as Error).message}`,
              );
            }

            // ✅ EN social media sharing completed (Facebook, Bluesky, Mastodon)
            this.logger.info(
              `✅ EN social media sharing completed for article: ${createdArticle.id}`,
            );

            // Post to Facebook EN (async)
            try {
              const { postToFacebookEN } =
                await import("@/lib/social/facebook");
              postToFacebookEN({
                title: enTitle,
                slug: `en/news/${enSlugFinal}`,
                excerpt: enExcerpt,
                imageUrl: article.imageUrl,
                categoryName: "AI News",
              })
                .then(async (postId) => {
                  if (postId) {
                    await recordShareSuccess(
                      createdArticle.id,
                      "FACEBOOK_EN",
                      "en",
                      postId,
                    );
                    this.logger.info(`📘 Facebook EN post created`);
                  } else {
                    this.logger.info(`📘 Facebook EN skipped (disabled)`);
                  }
                })
                .catch(async (err) => {
                  await recordShareFailure(
                    createdArticle.id,
                    "FACEBOOK_EN",
                    "en",
                    err?.message || "Unknown error",
                  );
                  this.logger.warn(`Facebook EN post failed: ${err.message}`);
                });
            } catch (facebookEnError) {
              this.logger.warn(
                `Facebook EN setup failed: ${(facebookEnError as Error).message}`,
              );
            }
          }

          // Invalidate cache (async - don't block)
          try {
            const { getCache } = await import("@/lib/cache");
            const cache = getCache();
            cache.invalidateByTag("articles").catch(() => {});
            this.logger.info(`🗑️ Cache invalidated`);
          } catch (cacheError) {
            // Cache invalidation is not critical
          }

          // Queue SEO calculation (async - don't block)
          try {
            const { queueSEOCalculation } =
              await import("@/agents/seo-calculator.agent");
            queueSEOCalculation({
              articleId: createdArticle.id,
              slug: createdArticle.slug,
              title: createdArticle.title,
              priority: "high",
            }).catch((err) => {
              this.logger.warn(`SEO queue failed: ${err.message}`);
            });
          } catch (seoError) {
            // SEO calculation is not critical
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
          const errDetail =
            error instanceof Error ? error.message : String(error);
          const errName = error instanceof Error ? error.name : "UnknownError";
          this.logger.error(
            `Failed to publish article: ${article.synthesizedContent?.tr?.title?.substring(0, 50) || "unknown"}... [${errName}]: ${errDetail}`,
          );
          // Log Prisma-specific details
          if ((error as any)?.code) {
            this.logger.error(
              `Prisma error code: ${(error as any).code}, meta: ${JSON.stringify((error as any).meta || {})}`,
            );
          }
          // Continue with next article
        }
      }

      this.logger.success(
        `Database publishing complete: ${publishedArticles.length}/${articles.length} articles published`,
      );

      // After all articles published, trigger sitemap pings (once per batch)
      if (publishedArticles.length > 0) {
        try {
          const { pingSitemaps } = await import("@/lib/seo/indexnow");
          const pingResults = await pingSitemaps();
          this.logger.success(
            `🔔 Sitemap pings: IndexNow=${pingResults.indexNow ? "✅" : "❌"} WebSub=${pingResults.webSub ? "✅" : "❌"} Google=${pingResults.google ? "✅" : "❌"} Bing=${pingResults.bing ? "✅" : "❌"}`,
          );
        } catch (pingError) {
          this.logger.warn(
            `Sitemap ping failed: ${(pingError as Error).message}`,
          );
        }
      }

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
