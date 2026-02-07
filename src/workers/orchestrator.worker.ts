/**
 * Orchestrator Worker - Multi-Agent News Pipeline
 *
 * ARCHITECTURE:
 * ContentCollector → RelevanceFilter → DuplicateDetector → ContentEnricher → VisualGenerator
 *
 * This worker:
 * 1. Starts all 5 agents
 * 2. Triggers ContentCollectorAgent on schedule
 * 3. Monitors pipeline health
 * 4. Handles graceful shutdown
 * 5. Publishes final articles to database
 */

import { Worker } from "bullmq";
import { getRedis } from "@/lib/redis";
import { db } from "@/lib/db";
import { PrismaClient } from "@prisma/client";
import { createModuleLogger } from "@/lib/agent-log-stream";
import {
  initializeQueues,
  getQueue,
  getAllQueueStats,
  QUEUE_NAMES,
} from "@/lib/queue-manager";

// Import agents
import { ContentCollectorAgent } from "@/agents/content-collector.agent";
import { RelevanceFilterAgent } from "@/agents/relevance-filter.agent";
import { DuplicateDetectorAgent } from "@/agents/duplicate-detector.agent";
import { ContentEnricherAgent } from "@/agents/content-enricher.agent";
import { VisualGeneratorAgent } from "@/agents/visual-generator.agent";
import { DatabasePublisherAgent } from "@/agents/database-publisher.agent";

// Smart Scheduler for Turkey timezone-aware scheduling
import {
  createDynamicScheduler,
  getScheduleInfo,
  recordLastRun,
  type ScheduleInfo,
} from "@/lib/smart-scheduler";

const logger = createModuleLogger("orchestrator");

// Agent instances
let contentCollector: ContentCollectorAgent;
let relevanceFilter: RelevanceFilterAgent;
let duplicateDetector: DuplicateDetectorAgent;
let contentEnricher: ContentEnricherAgent;
let visualGenerator: VisualGeneratorAgent;
let databasePublisher: DatabasePublisherAgent;

// Smart scheduler instance for cleanup on shutdown
let dynamicScheduler: {
  stop: () => void;
  getStatus: () => Promise<ScheduleInfo>;
} | null = null;

/**
 * Initialize all agents
 */
async function initializeAgents(): Promise<void> {
  logger.info("Initializing 6-agent pipeline...");

  contentCollector = new ContentCollectorAgent();
  relevanceFilter = new RelevanceFilterAgent();
  duplicateDetector = new DuplicateDetectorAgent();
  contentEnricher = new ContentEnricherAgent();
  visualGenerator = new VisualGeneratorAgent();
  databasePublisher = new DatabasePublisherAgent();

  await Promise.all([
    contentCollector.start(),
    relevanceFilter.start(),
    duplicateDetector.start(),
    contentEnricher.start(),
    visualGenerator.start(),
    databasePublisher.start(),
  ]);

  logger.success("All 6 agents started successfully");
}

/**
 * Stop all agents
 */
async function stopAgents(): Promise<void> {
  logger.info("Stopping all agents...");

  await Promise.all([
    contentCollector?.stop(),
    relevanceFilter?.stop(),
    duplicateDetector?.stop(),
    contentEnricher?.stop(),
    visualGenerator?.stop(),
    databasePublisher?.stop(),
  ]);

  logger.success("All agents stopped");
}

/**
 * Trigger content collection (entry point of pipeline)
 */
async function triggerContentCollection(
  categoryFilter?: string,
): Promise<void> {
  logger.info("Triggering content collection...");

  const queue = getQueue(QUEUE_NAMES.COLLECTED_ARTICLES);
  if (!queue) {
    throw new Error("Content collector queue not available");
  }

  await queue.add(
    "collect-content",
    {
      categoryFilter,
      maxArticles: 50,
    },
    {
      removeOnComplete: true,
      attempts: 3,
    },
  );

  logger.success("Content collection triggered");
}

/**
 * Monitor pipeline health
 */
async function monitorPipelineHealth(): Promise<void> {
  const stats = await getAllQueueStats();

  logger.info("Pipeline Health:");
  for (const stat of stats) {
    if (stat) {
      logger.info(
        `  ${stat.queueName}: ${stat.active} active, ${stat.waiting} waiting, ${stat.completed} completed, ${stat.failed} failed`,
      );
    }
  }

  // Check agent health
  const agentHealths = await Promise.all([
    contentCollector?.healthCheck(),
    relevanceFilter?.healthCheck(),
    duplicateDetector?.healthCheck(),
    contentEnricher?.healthCheck(),
    visualGenerator?.healthCheck(),
    databasePublisher?.healthCheck(),
  ]);

  logger.info("Agent Health:");
  for (const health of agentHealths) {
    if (health) {
      logger.info(
        `  ${health.queueName}: ${health.workerStatus} (${health.metricsCount} metrics)`,
      );
    }
  }
}

/**
 * Publish articles to database (called after VisualGenerator completes)
 */
async function publishArticlesToDatabase(
  articles: any[],
  agentLogId?: string,
): Promise<void> {
  logger.info(`Publishing ${articles.length} articles to database...`);

  let publishedCount = 0;
  let failedCount = 0;

  for (const article of articles) {
    try {
      const {
        synthesizedContent,
        imageUrl,
        imageUrlMedium,
        imageUrlSmall,
        imageUrlThumb,
        topic,
      } = article;

      // Get category
      const categoryRecord = await db.category.findUnique({
        where: { slug: article.suggestedCategory || "teknoloji" },
      });

      if (!categoryRecord) {
        logger.warn(`Category not found: ${article.suggestedCategory}`);
        continue;
      }

      // Generate slug
      const slug = synthesizedContent.tr.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 100);

      // Create Turkish article
      const trArticle = await db.article.create({
        data: {
          title: synthesizedContent.tr.title,
          slug,
          excerpt: synthesizedContent.tr.excerpt,
          content: synthesizedContent.tr.content,
          imageUrl: imageUrl || "/logos/og-image.png",
          imageUrlMedium: imageUrlMedium || "/logos/og-image.png",
          imageUrlSmall: imageUrlSmall || "/logos/og-image.png",
          imageUrlThumb: imageUrlThumb || "/logos/og-image.png",
          sourceUrl: article.url,
          categoryId: categoryRecord.id,
          status: synthesizedContent.tr.score >= 750 ? "PUBLISHED" : "DRAFT",
          score: synthesizedContent.tr.score || 800,
          publishedAt: synthesizedContent.tr.score >= 750 ? new Date() : null,
          metaTitle: synthesizedContent.tr.title,
          metaDescription: synthesizedContent.tr.metaDescription,
          keywords: synthesizedContent.tr.keywords,
          topic,
          agentLogId,
          language: "tr", // Türkçe haber
        },
      });

      // Post-publish notifications (non-blocking)
      if (synthesizedContent.tr.score >= 750) {
        // IndexNow bildirimi
        (async () => {
          try {
            const { submitArticleToIndexNow } =
              await import("@/lib/seo/indexnow");
            const indexNowSuccess = await submitArticleToIndexNow(
              slug,
              trArticle.id,
            );

            // IndexNow başarılıysa googleIndexed'i true yap
            if (indexNowSuccess) {
              await db.article.update({
                where: { id: trArticle.id },
                data: {
                  googleIndexed: true,
                  indexNowStatus: "SUBMITTED",
                  indexedAt: new Date(),
                },
              });
              logger.success(`IndexNow: ${slug} bildirildi`);
            }
          } catch (err) {
            logger.error(`IndexNow failed for ${slug}:`, {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        })();

        // Google Indexing API bildirimi (günlük limit kontrolü ile)
        (async () => {
          try {
            const { notifyGoogle, getRemainingDailyQuota } =
              await import("@/lib/seo/google-indexing-api");

            // Önce kalan kotayı kontrol et
            const remainingQuota = await getRemainingDailyQuota();

            if (remainingQuota === 0) {
              logger.warn(
                `Google Indexing API: ${slug} - günlük limit doldu, atlanıyor`,
              );
              return;
            }

            const baseUrl =
              process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
            const articleUrl = `${baseUrl}/news/${slug}`;

            const result = await notifyGoogle(articleUrl, "URL_UPDATED");

            if (result.success) {
              await db.article.update({
                where: { id: trArticle.id },
                data: {
                  googleIndexStatus: "SUBMITTED",
                  googleIndexedAt: new Date(),
                },
              });
              logger.success(
                `Google Indexing API: ${slug} bildirildi (kota: ${remainingQuota - 1})`,
              );
            }
          } catch (err) {
            logger.error(`Google Indexing API failed for ${slug}:`, {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        })();

        // Facebook paylaşımı
        (async () => {
          try {
            const { postToFacebook } = await import("@/lib/social/facebook");
            const facebookSuccess = await postToFacebook({
              title: synthesizedContent.tr.title,
              slug,
              excerpt: synthesizedContent.tr.excerpt || "",
              imageUrl: imageUrl,
              categoryName: categoryRecord.name,
            });

            // Facebook başarılıysa facebookShared'i true yap
            if (facebookSuccess) {
              await db.article.update({
                where: { id: trArticle.id },
                data: { facebookShared: true },
              });
              logger.success(`Facebook: ${slug} paylaşıldı`);
            }
          } catch (err) {
            logger.error(`Facebook failed for ${slug}:`, { error: err instanceof Error ? err.message : String(err) });
          }
        })();

        // Bluesky paylaşımı
        (async () => {
          try {
            const { postToBluesky } = await import("@/lib/social/bluesky");
            const blueskyResult = await postToBluesky({
              title: synthesizedContent.tr.title,
              slug,
              excerpt: synthesizedContent.tr.excerpt || "",
              imageUrl: imageUrl,
              categoryName: categoryRecord.name,
            });

            if (blueskyResult) {
              logger.success(`Bluesky: ${slug} paylaşıldı`);
            }
          } catch (err) {
            logger.error(`Bluesky failed for ${slug}:`, {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        })();

        // Mastodon paylaşımı
        (async () => {
          try {
            const { postToMastodon } = await import("@/lib/social/mastodon");
            const mastodonResult = await postToMastodon({
              title: synthesizedContent.tr.title,
              slug,
              excerpt: synthesizedContent.tr.excerpt || "",
              imageUrl: imageUrl,
              categoryName: categoryRecord.name,
            });

            if (mastodonResult) {
              logger.success(`Mastodon: ${slug} paylaşıldı`);
            }
          } catch (err) {
            logger.error(`Mastodon failed for ${slug}:`, {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        })();

        // Tumblr paylaşımı
        (async () => {
          try {
            const { postToTumblr } = await import("@/lib/social/tumblr");
            const tumblrResult = await postToTumblr({
              title: synthesizedContent.tr.title,
              slug,
              excerpt: synthesizedContent.tr.excerpt || "",
              imageUrl: imageUrl,
              categoryName: categoryRecord.name,
            });

            if (tumblrResult) {
              logger.success(`Tumblr: ${slug} paylaşıldı`);
            }
          } catch (err) {
            logger.error(`Tumblr failed for ${slug}:`, {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        })();
      }

      // Create translations (TR + EN)
      await db.$executeRaw`
        INSERT INTO "ArticleTranslation" (
          id, "articleId", locale, title, slug, excerpt, content, 
          "metaTitle", "metaDescription", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), ${trArticle.id}, 'tr', ${synthesizedContent.tr.title}, 
          ${slug}, ${synthesizedContent.tr.excerpt}, ${synthesizedContent.tr.content},
          ${synthesizedContent.tr.title}, ${synthesizedContent.tr.metaDescription}, 
          NOW(), NOW()
        )
        ON CONFLICT ("articleId", locale) DO UPDATE SET
          title = EXCLUDED.title,
          slug = EXCLUDED.slug,
          excerpt = EXCLUDED.excerpt,
          content = EXCLUDED.content,
          "metaTitle" = EXCLUDED."metaTitle",
          "metaDescription" = EXCLUDED."metaDescription",
          "updatedAt" = NOW()
      `;

      const enSlug = synthesizedContent.en.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 100);

      await db.$executeRaw`
        INSERT INTO "ArticleTranslation" (
          id, "articleId", locale, title, slug, excerpt, content, 
          "metaTitle", "metaDescription", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), ${trArticle.id}, 'en', ${synthesizedContent.en.title}, 
          ${enSlug}, ${synthesizedContent.en.excerpt}, ${synthesizedContent.en.content},
          ${synthesizedContent.en.title}, ${synthesizedContent.en.metaDescription}, 
          NOW(), NOW()
        )
        ON CONFLICT ("articleId", locale) DO UPDATE SET
          title = EXCLUDED.title,
          slug = EXCLUDED.slug,
          excerpt = EXCLUDED.excerpt,
          content = EXCLUDED.content,
          "metaTitle" = EXCLUDED."metaTitle",
          "metaDescription" = EXCLUDED."metaDescription",
          "updatedAt" = NOW()
      `;

      publishedCount++;
      logger.success(
        `Published: ${synthesizedContent.tr.title.substring(0, 50)}...`,
      );
    } catch (error) {
      failedCount++;
      logger.error(`Failed to publish article:`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.success(
    `Publishing complete: ${publishedCount} published, ${failedCount} failed`,
  );
}

/**
 * Main initialization
 */
async function main() {
  logger.info("🚀 Starting Multi-Agent News Pipeline Orchestrator...");

  const redis = getRedis();
  if (!redis) {
    logger.error("Redis not available");
    process.exit(1);
  }

  // Test database connection
  try {
    await (db as PrismaClient).$connect();
    await db.$queryRaw`SELECT 1`;
    logger.success("Database connected");
  } catch (error) {
    logger.error("Database connection failed:", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }

  // Initialize queues
  initializeQueues();

  // Initialize agents
  await initializeAgents();

  // Start heartbeat
  setInterval(async () => {
    try {
      await redis.set(
        "orchestrator:heartbeat",
        Date.now().toString(),
        "EX",
        60,
      );
      logger.info(`💓 Heartbeat: ${new Date().toLocaleString("tr-TR")}`);
    } catch (error) {
      logger.error("Heartbeat failed:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, 30000);

  // Monitor pipeline health every 5 minutes
  setInterval(
    async () => {
      try {
        await monitorPipelineHealth();
      } catch (error) {
        logger.error("Health check failed:", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    5 * 60 * 1000,
  );

  // Check for scheduled runs
  const enabledSetting = await db.setting.findUnique({
    where: { key: "agent.enabled" },
  });
  const isEnabled = enabledSetting ? enabledSetting.value !== "false" : true;

  if (isEnabled) {
    logger.info("Agent enabled, initializing Smart Scheduler...");

    // Get initial schedule info
    const initialInfo = await getScheduleInfo();
    logger.info(`🇹🇷 Turkey time: ${initialInfo.turkeyTime}`);
    logger.info(`📊 Time slot: ${initialInfo.timeSlot}`);
    logger.info(`⏱️ Initial interval: ${initialInfo.interval} minutes`);
    logger.info(`📋 Reason: ${initialInfo.reason}`);

    // Create dynamic scheduler with Turkey timezone awareness
    dynamicScheduler = createDynamicScheduler(
      async () => {
        logger.info("⏰ Smart Scheduler: Triggering content collection...");
        await triggerContentCollection();
      },
      {
        immediate: true, // Run immediately on startup
        onScheduleChange: (info) => {
          logger.info(
            `📅 Schedule updated: ${info.interval} min | ${info.reason} | Next: ${info.nextRun.toLocaleString("tr-TR")}`,
          );
        },
      },
    );

    logger.success(
      "✅ Smart Scheduler initialized with Turkey timezone awareness",
    );
    logger.info(
      `📅 Next run at: ${initialInfo.nextRun.toLocaleString("tr-TR")} (${initialInfo.interval} min)`,
    );
  } else {
    logger.info("Agent disabled, skipping scheduled collection");
  }

  logger.success("Orchestrator started successfully");
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down...");
  dynamicScheduler?.stop();
  await stopAgents();
  await (db as PrismaClient).$disconnect();
  await getRedis()?.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down...");
  dynamicScheduler?.stop();
  await stopAgents();
  await (db as PrismaClient).$disconnect();
  await getRedis()?.quit();
  process.exit(0);
});

// Error handlers
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", {
    error: error.message,
    stack: error.stack,
  });
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Start orchestrator
main().catch((error) => {
  logger.error("Fatal error:", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
