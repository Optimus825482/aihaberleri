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

const logger = createModuleLogger("orchestrator");

// Agent instances
let contentCollector: ContentCollectorAgent;
let relevanceFilter: RelevanceFilterAgent;
let duplicateDetector: DuplicateDetectorAgent;
let contentEnricher: ContentEnricherAgent;
let visualGenerator: VisualGeneratorAgent;
let databasePublisher: DatabasePublisherAgent;

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
        },
      });

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
      logger.error(`Failed to publish article:`, error);
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
    logger.error("Database connection failed:", error);
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
      logger.error("Heartbeat failed:", error);
    }
  }, 30000);

  // Monitor pipeline health every 5 minutes
  setInterval(
    async () => {
      try {
        await monitorPipelineHealth();
      } catch (error) {
        logger.error("Health check failed:", error);
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
    logger.info("Agent enabled, checking schedule...");

    // Trigger initial collection
    await triggerContentCollection();

    // Schedule periodic collection (every 15 minutes by default for real-time news)
    const intervalSetting = await db.setting.findUnique({
      where: { key: "agent.intervalHours" },
    });
    // DEFAULT: 0.25 hours = 15 minutes for real-time news pipeline
    const intervalHours = intervalSetting
      ? parseFloat(intervalSetting.value)
      : 0.25;

    const intervalMs = intervalHours * 60 * 60 * 1000;
    const intervalMinutes = Math.round(intervalHours * 60);

    setInterval(async () => {
      logger.info(
        `⏰ Scheduled collection triggered (every ${intervalMinutes} min)`,
      );
      await triggerContentCollection();
    }, intervalMs);

    logger.success(
      `✅ Scheduled collection: every ${intervalMinutes} minutes (${intervalHours}h)`,
    );
    logger.info(
      `📅 Next run at: ${new Date(Date.now() + intervalMs).toLocaleString("tr-TR")}`,
    );
  } else {
    logger.info("Agent disabled, skipping scheduled collection");
  }

  logger.success("Orchestrator started successfully");
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down...");
  await stopAgents();
  await (db as PrismaClient).$disconnect();
  await getRedis()?.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down...");
  await stopAgents();
  await (db as PrismaClient).$disconnect();
  await getRedis()?.quit();
  process.exit(0);
});

// Error handlers
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Start orchestrator
main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
