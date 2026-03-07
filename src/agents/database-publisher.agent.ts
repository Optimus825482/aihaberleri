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
 * 9. Queue social media sharing to SocialShareAgent
 *
 * REFACTORED (2026-02-12): Social media sharing moved to SocialShareAgent.
 * Publisher now only handles DB + indexing + push + cache, then queues social sharing.
 */

import { createHash } from "crypto";
import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { db } from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import { QUEUE_NAMES, getQueue } from "@/lib/queue-manager";
import type { ArticleWithVisuals } from "./visual-generator.agent";
import { notifyBothLanguages } from "@/lib/seo/indexing-tracker";
import { calculateTrendScore } from "@/lib/trend-scoring";
import { getRedis } from "@/lib/redis";
import { isFallbackImageUrl } from "@/lib/pollinations";
import type { SocialShareInput } from "./social-share.agent";
import {
  isPrismaError,
  type PipelineReEnrichPayload,
  RE_ENRICH_JOB_NAME,
} from "./pipeline-types";

/** Reddedilen makaleyi 2 saat boyunca tüm pipeline'dan uzak tutar. */
const REJECTION_COOLDOWN_SECONDS = 2 * 60 * 60; // 2 saat

function rejectionCooldownKey(urlOrTitle: string): string {
  const hash = createHash("sha256")
    .update(urlOrTitle)
    .digest("hex")
    .slice(0, 16);
  return `rejection-cooldown:${hash}`;
}

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
    nextQueueName: QUEUE_NAMES.SOCIAL_SHARE, // 🔗 Route to SocialShareAgent (2026-02-12)
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
      const socialShareQueueData: SocialShareInput[] = [];
      // 🔄 Rejected articles to re-queue for content enrichment retry
      const rejectedForRetry: {
        article: ArticleWithVisuals;
        reason: string;
      }[] = [];
      const MAX_PIPELINE_RETRIES = 1; // Max 1 re-queue (2 total chances per article)

      for (let index = 0; index < articles.length; index++) {
        const article = articles[index];
        // Enforce targetCount limit — stop publishing after reaching max
        if (publishedArticles.length >= maxPublish) {
          this.logger.info(
            `Target reached (${maxPublish}) — skipping remaining ${articles.length - index} articles`,
          );
          break;
        }

        try {
          // Get or create category — normalize LLM-suggested slugs to DB slugs
          const categorySlug = this.normalizeCategorySlug(
            article.suggestedCategory || "yapay-zeka",
          );
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
            const retryCount = article._retryCount || 0;
            if (retryCount < MAX_PIPELINE_RETRIES) {
              this.logger.warn(
                `🔄 CONTENT MISSING → re-queue for retry (attempt ${retryCount + 1}): "${article.url.substring(0, 60)}"`,
              );
              rejectedForRetry.push({ article, reason: "missing_content" });
            } else {
              this.logger.error(
                `🚫 PERMANENTLY REJECTED (max retries): "${article.url.substring(0, 60)}" — missing TR fields`,
              );
            }
            continue;
          }

          // 🛡️ QUALITY GATE: Check synthesis quality score
          const qualityScore = trContent.score || 0;
          if (qualityScore > 0 && qualityScore < 50) {
            const retryCount = article._retryCount || 0;
            if (retryCount < MAX_PIPELINE_RETRIES) {
              this.logger.warn(
                `🔄 LOW QUALITY → re-queue for retry (attempt ${retryCount + 1}, score: ${qualityScore}): "${trContent.title.substring(0, 60)}"`,
              );
              rejectedForRetry.push({ article, reason: "low_quality" });
            } else {
              this.logger.error(
                `🚫 PERMANENTLY REJECTED (max retries, score: ${qualityScore}): "${trContent.title.substring(0, 60)}"`,
              );
            }
            continue;
          }

          // 🛡️ ZERO-SOURCE GATE: Block hallucinated articles (no external sources found)
          if (article.hasNoExternalSources === true) {
            this.logger.error(
              `🚫 YAYINLANMIYOR — HİÇ DIŞ KAYNAK YOK: "${trContent.title.substring(0, 80)}" (halüsinasyon riski yüksek, atlanıyor)`,
            );
            continue;
          }

          // 🛡️ IMAGE GATE: Never publish articles without a resolved image URL.
          if (!article.imageUrl) {
            const retryCount = article._retryCount || 0;
            if (retryCount < MAX_PIPELINE_RETRIES) {
              this.logger.warn(
                `🔄 MISSING IMAGE → re-queue for retry (attempt ${retryCount + 1}): "${trContent.title.substring(0, 80)}"`,
              );
              rejectedForRetry.push({ article, reason: "missing_image" });
            } else {
              this.logger.error(
                `🚫 PERMANENTLY REJECTED (max retries): "${trContent.title.substring(0, 80)}" — image generation failed`,
              );
            }
            continue;
          }

          // 🛡️ STOCK FALLBACK GATE: Random backup visuals should never be published.
          if (isFallbackImageUrl(article.imageUrl)) {
            const retryCount = article._retryCount || 0;
            if (retryCount < MAX_PIPELINE_RETRIES) {
              this.logger.warn(
                `🔄 STOCK FALLBACK IMAGE → re-queue for retry (attempt ${retryCount + 1}): "${trContent.title.substring(0, 80)}"`,
              );
              rejectedForRetry.push({ article, reason: "fallback_image" });
            } else {
              this.logger.error(
                `🚫 PERMANENTLY REJECTED (max retries): "${trContent.title.substring(0, 80)}" — stock fallback image`,
              );
            }
            continue;
          }

          // 🛡️ LANGUAGE GATE: TR title must be in Turkish, not English
          const isEnglishTitle = /^[a-zA-Z0-9\s\-:,.'""!?&@#$%()—–]+$/.test(
            trContent.title.trim(),
          );
          // Check for Turkish characters as a positive signal
          const hasTurkishChars = /[çğıöşüÇĞİÖŞÜ]/.test(trContent.title);
          // Check if title ends with known emergency template suffix
          const isEmergencyTitle = trContent.title.includes(
            "— Gelişme Detayları",
          );

          if (isEnglishTitle && !hasTurkishChars) {
            const retryCount = article._retryCount || 0;
            if (retryCount < MAX_PIPELINE_RETRIES) {
              this.logger.warn(
                `🔄 ENGLISH TITLE → re-queue for retry (attempt ${retryCount + 1}): "${trContent.title.substring(0, 80)}"`,
              );
              rejectedForRetry.push({ article, reason: "english_title" });
            } else {
              this.logger.error(
                `🚫 PERMANENTLY REJECTED (max retries): "${trContent.title.substring(0, 80)}" — English title`,
              );
            }
            continue;
          }

          if (isEmergencyTitle) {
            const retryCount = article._retryCount || 0;
            if (retryCount < MAX_PIPELINE_RETRIES) {
              this.logger.warn(
                `🔄 EMERGENCY TEMPLATE → re-queue for retry (attempt ${retryCount + 1}): "${trContent.title.substring(0, 80)}"`,
              );
              rejectedForRetry.push({ article, reason: "emergency_template" });
            } else {
              this.logger.error(
                `🚫 PERMANENTLY REJECTED (max retries): "${trContent.title.substring(0, 80)}" — emergency template`,
              );
            }
            continue;
          }

          // 🛡️ CONTENT QUALITY: Check for dictionary/garbage content patterns
          const contentLower = trContent.content.toLowerCase();
          const dictionaryPatterns = [
            "pronunciation",
            "synonyms",
            "antonyms",
            "etymology",
            "definition of",
            "noun.",
            "verb.",
            "adjective.",
            "merriam-webster",
            "dictionary.com",
            "see the full definition",
            "word of the day",
            "browse the dictionary",
          ];
          const dictionaryMatchCount = dictionaryPatterns.filter((p) =>
            contentLower.includes(p),
          ).length;
          if (dictionaryMatchCount >= 2) {
            const retryCount = article._retryCount || 0;
            if (retryCount < MAX_PIPELINE_RETRIES) {
              this.logger.warn(
                `🔄 DICTIONARY CONTENT → re-queue for retry (attempt ${retryCount + 1}): "${trContent.title.substring(0, 60)}"`,
              );
              rejectedForRetry.push({ article, reason: "dictionary_content" });
            } else {
              this.logger.error(
                `🚫 PERMANENTLY REJECTED (max retries): "${trContent.title.substring(0, 60)}" — dictionary content`,
              );
            }
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
              publishedAt: article.publishedDate
                ? new Date(article.publishedDate)
                : new Date(),
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
              publishedAt: article.publishedDate
                ? new Date(article.publishedDate)
                : new Date(),
              topic: article.topic,
              trendScore: finalTrendScore,
              isTrending: finalTrendScore >= 50,
              score: trContent.score || finalTrendScore || 0,

              // Relations
              categoryId: category.id,
              agentLogId: article.agentLogId ?? null,

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
                metaTitle: trContent.metaTitle || trContent.title,
                metaDescription: trContent.metaDescription || null,
              },
            });
            this.logger.info(
              `Turkish translation created: ${createdArticle.slug}`,
            );
          } catch (trError) {
            // Ignore if already exists
            if (!isPrismaError(trError) || trError.code !== "P2002") {
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
                  metaTitle: enContent.metaTitle || enContent.title,
                  metaDescription: enContent.metaDescription || null,
                },
              });
              this.logger.info(`English translation created: ${enSlug}`);
            } catch (enError) {
              // If English slug already exists, create with unique suffix
              if (isPrismaError(enError) && enError.code === "P2002") {
                enSlugFinal = `${enSlug}-${createdArticle.id.slice(-6)}`;
                await db.articleTranslation.create({
                  data: {
                    articleId: createdArticle.id,
                    locale: "en",
                    title: enContent.title,
                    slug: enSlugFinal,
                    excerpt: enContent.excerpt || null,
                    content: enContent.content,
                    metaTitle: enContent.metaTitle || enContent.title,
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
          // 🔗 MOVED TO SocialShareAgent (2026-02-12) — see social-share.agent.ts

          // Queue social media sharing via SocialShareAgent
          const socialShareData: SocialShareInput = {
            articleId: createdArticle.id,
            slug: createdArticle.slug,
            title: createdArticle.title,
            excerpt: trContent.excerpt || "",
            imageUrl: article.imageUrl,
            categoryName: category.name,
            enSlug: enSlugFinal || undefined,
            enTitle: enContent?.title || undefined,
            enExcerpt: enContent?.excerpt || undefined,
          };

          // Will be batched and sent to SOCIAL_SHARE queue after all articles are published
          socialShareQueueData.push(socialShareData);

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

          // P1-6: Increment real-time published counter in Redis
          try {
            const redis = getRedis();
            if (redis && article.agentLogId) {
              const counterKey = `pipeline:published:${article.agentLogId}`;
              await redis.incr(counterKey);
              await redis.expire(counterKey, 3600); // 1h TTL
            }
          } catch {
            // Non-critical — don't break publishing
          }

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
          if (isPrismaError(error)) {
            this.logger.error(
              `Prisma error code: ${error.code}, meta: ${JSON.stringify(error.meta || {})}`,
            );
          }
          // Continue with next article
        }
      }

      this.logger.success(
        `Database publishing complete: ${publishedArticles.length}/${articles.length} articles published`,
      );

      // 🔄 RE-QUEUE REJECTED ARTICLES — DEEP RE-ENRICHMENT
      // Rejected articles get a FULL re-enrichment pass:
      //   • Strip all previous synthesized content & sources (start fresh)
      //   • Add _forceReEnrich + _rejectionReason → ContentEnricher uses aggressive source gathering
      //   • Redis cooldown (2h TTL per URL hash) prevents the same article looping forever
      //   • 5-minute delay so conditions can change before the next attempt
      if (rejectedForRetry.length > 0) {
        try {
          const enricherQueue = getQueue(QUEUE_NAMES.ENRICHED_ARTICLES);
          const redis = getRedis();
          if (enricherQueue) {
            const retryArticles: PipelineReEnrichPayload[] = [];

            for (const r of rejectedForRetry) {
              const identifier = r.article.url || r.article.title;
              const cooldownKey = rejectionCooldownKey(identifier);

              // Skip articles that are already in the 2-hour cooldown window
              const alreadyCooling = redis
                ? await redis.exists(cooldownKey)
                : 0;
              if (alreadyCooling) {
                this.logger.warn(
                  `⏸️ RE-ENRICH atlandı — cooldown aktif: "${r.article.title?.substring(0, 60)}"`,
                );
                continue;
              }

              // Write cooldown BEFORE queuing (prevents duplicate queueing on parallel runs)
              if (redis) {
                await redis.set(
                  cooldownKey,
                  r.reason,
                  "EX",
                  REJECTION_COOLDOWN_SECONDS,
                );
              }

              retryArticles.push({
                // ── Base fields that downstream agents need ──
                title: r.article.title,
                description: r.article.description || "",
                url: identifier,
                publishedDate: r.article.publishedDate,
                source: r.article.source || "re-enrich",
                // ── Preserve REAL scores (not hardcoded fallbacks) ──
                trendScore: r.article.trendScore ?? 0,
                relevanceScore: r.article.relevanceScore ?? 0,
                // ── Routing / enrichment metadata ──
                category: r.article.category,
                reasoning: r.article.reasoning || "Re-enrich after rejection",
                suggestedCategory: r.article.suggestedCategory || "yapay-zeka",
                suggestedTags: r.article.suggestedTags || [],
                topic: r.article.topic || "ai",
                isDuplicate: false,
                // ── Re-enrichment control flags ──
                _retryCount: (r.article._retryCount || 0) + 1,
                _forceReEnrich: true, // ContentEnricher: use aggressive source gathering
                _rejectionReason: r.reason, // ContentEnricher: pre-prime retry loop with correction
                // ── Intentionally OMITTED: synthesizedContent, sources, imageUrl ──
                // ContentEnricher must rebuild these from scratch with fresh sources
              });
            }

            if (retryArticles.length > 0) {
              await enricherQueue.add(RE_ENRICH_JOB_NAME, retryArticles, {
                removeOnComplete: 100,
                removeOnFail: 50,
                attempts: 1,
                delay: 5 * 60 * 1000, // 5 minutes — conditions change, LLM gets fresh context
              });

              this.logger.success(
                `🔁 ${retryArticles.length} makale derin yeniden-zenginleştirme kuyruğuna eklendi (5dk sonra)`,
              );
            }

            const skipped = rejectedForRetry.length - retryArticles.length;
            if (skipped > 0) {
              this.logger.info(
                `⏸️ ${skipped} makale cooldown nedeniyle atlandı (2h TTL aktif)`,
              );
            }
          }
        } catch (retryError) {
          this.logger.warn(
            `⚠️ Yeniden-zenginleştirme kuyruğu hatası: ${(retryError as Error).message}`,
          );
        }
      }

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

        // 🔗 Send social share data to SocialShareAgent queue (2026-02-12)
        const socialShareQueue = getQueue(QUEUE_NAMES.SOCIAL_SHARE);
        const socialShareData = socialShareQueueData;

        if (socialShareQueue && socialShareData.length > 0) {
          try {
            await socialShareQueue.add("share-articles", socialShareData, {
              removeOnComplete: 100,
              removeOnFail: 50,
              attempts: 3,
            });
            this.logger.success(
              `📱 ${socialShareData.length} articles queued for social sharing`,
            );
          } catch (shareQueueError) {
            this.logger.warn(
              `Social share queue failed: ${(shareQueueError as Error).message} — articles are published, sharing will be retried`,
            );
          }
        }
      }

      return {
        success: true,
        data: publishedArticles,
        skipNextQueue: true, // Social share is handled via direct queue add above
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

  /**
   * Normalize LLM-suggested category slugs to actual DB slugs.
   * LLM may return arbitrary slugs — this maps them to real categories.
   */
  private normalizeCategorySlug(slug: string): string {
    const SLUG_MAP: Record<string, string> = {
      // Direct DB slugs (pass through)
      "ai-modelleri": "ai-modelleri",
      "sektor-is-dunyasi": "sektor-is-dunyasi",
      "ai-araclari-urunler": "ai-araclari-urunler",
      "robotik-otonom": "robotik-otonom",
      "etik-guvenlik-regulasyon": "etik-guvenlik-regulasyon",
      "bilim-arastirma": "bilim-arastirma",
      "ai-toplum": "ai-toplum",
      "yapay-zeka": "yapay-zeka",

      // Common LLM variations → correct DB slug
      "sektor-haberleri": "sektor-is-dunyasi",
      sektor: "sektor-is-dunyasi",
      "is-dunyasi": "sektor-is-dunyasi",
      "yapay-zeka-modelleri": "ai-modelleri",
      modeller: "ai-modelleri",
      llm: "ai-modelleri",
      "yapay-zeka-araclari": "ai-araclari-urunler",
      araclar: "ai-araclari-urunler",
      urunler: "ai-araclari-urunler",
      robotik: "robotik-otonom",
      otonom: "robotik-otonom",
      etik: "etik-guvenlik-regulasyon",
      guvenlik: "etik-guvenlik-regulasyon",
      regulasyon: "etik-guvenlik-regulasyon",
      arastirma: "bilim-arastirma",
      bilim: "bilim-arastirma",
      toplum: "ai-toplum",
      "makine-ogrenmesi": "ai-modelleri",
      "dogal-dil-isleme": "ai-modelleri",
      "bilgisayarli-goru": "ai-modelleri",
      "yapay-zeka-etigi": "etik-guvenlik-regulasyon",
    };

    const normalized = slug.toLowerCase().trim();
    return SLUG_MAP[normalized] || "yapay-zeka";
  }
}
