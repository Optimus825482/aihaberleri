/**
 * Orchestrator Worker - Multi-Agent News Pipeline
 *
 * ARCHITECTURE (7 Agents):
 * DuplicateDetector → RelevanceFilter → TrendEnricher →
 * ContentEnricher → VisualGenerator → DatabasePublisher
 * (+ ContentCollector for standalone RSS collection)
 *
 * This worker:
 * 1. Starts all 7 agents
 * 2. Triggers ContentCollectorAgent on schedule
 * 3. Monitors pipeline health
 * 4. Handles graceful shutdown
 */

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
import {
  logPipelineBanner,
  logAgentInit,
  logHealthSummary,
} from "@/lib/agent-log-stream";

// Import agents
import { ContentCollectorAgent } from "@/agents/content-collector.agent";
import { RelevanceFilterAgent } from "@/agents/relevance-filter.agent";
import { DuplicateDetectorAgent } from "@/agents/duplicate-detector.agent";
import { TrendEnricherAgent } from "@/agents/trend-enricher.agent";
import { ContentEnricherAgent } from "@/agents/content-enricher.agent";
import { VisualGeneratorAgent } from "@/agents/visual-generator.agent";
import { DatabasePublisherAgent } from "@/agents/database-publisher.agent";

// Smart Scheduler for Turkey timezone-aware scheduling
import {
  createDynamicScheduler,
  getScheduleInfo,
  type ScheduleInfo,
} from "@/lib/smart-scheduler";

// Trend Fetcher service for social media trends
import {
  startTrendFetcher,
  stopTrendFetcher,
} from "@/services/trend-fetcher.service";

const logger = createModuleLogger("orchestrator");

// Agent instances
let contentCollector: ContentCollectorAgent;
let relevanceFilter: RelevanceFilterAgent;
let duplicateDetector: DuplicateDetectorAgent;
let trendEnricher: TrendEnricherAgent;
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
  const agentNames = [
    "duplicate-detector",
    "relevance-filter",
    "trend-enricher",
    "content-enricher",
    "visual-generator",
    "database-publisher",
    "content-collector",
  ];

  logAgentInit(agentNames);

  contentCollector = new ContentCollectorAgent();
  relevanceFilter = new RelevanceFilterAgent();
  duplicateDetector = new DuplicateDetectorAgent();
  trendEnricher = new TrendEnricherAgent();
  contentEnricher = new ContentEnricherAgent();
  visualGenerator = new VisualGeneratorAgent();
  databasePublisher = new DatabasePublisherAgent();

  await Promise.all([
    contentCollector.start(),
    relevanceFilter.start(),
    duplicateDetector.start(),
    trendEnricher.start(),
    contentEnricher.start(),
    visualGenerator.start(),
    databasePublisher.start(),
  ]);

  logger.success("All 7 agents initialized");
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
    trendEnricher?.stop(),
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
      maxArticles: 80, // 50 → 80 for more article candidates per run
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

  const queueSummary = stats
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s) => ({
      name: s.queueName.replace("news-pipeline:", ""),
      active: s.active,
      waiting: s.waiting,
      completed: s.completed,
      failed: s.failed,
    }));

  logHealthSummary(queueSummary);
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

  // Start heartbeat (silent — only logs on failure)
  setInterval(async () => {
    try {
      await redis.set(
        "orchestrator:heartbeat",
        Date.now().toString(),
        "EX",
        60,
      );
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
    logger.info(
      `Schedule: ${initialInfo.timeSlot} — ${initialInfo.interval}min interval — ${initialInfo.reason}`,
    );

    // Create dynamic scheduler with Turkey timezone awareness
    dynamicScheduler = createDynamicScheduler(
      async () => {
        logger.info("⏰ Smart Scheduler: Triggering content collection...");
        await triggerContentCollection();
      },
      {
        immediate: true,
        onScheduleChange: (info) => {
          logger.info(
            `📅 Schedule updated: ${info.interval} min | ${info.reason} | Next: ${info.nextRun.toLocaleString("tr-TR")}`,
          );
        },
      },
    );

    logger.success("Smart Scheduler initialized");
    logger.info(
      `Next run: ${initialInfo.nextRun.toLocaleString("tr-TR")} (${initialInfo.interval}min)`,
    );

    logger.info("Starting Trend Fetcher...");
    startTrendFetcher();
    logger.success("Trend Fetcher started");
  } else {
    logger.info("Agent disabled, skipping scheduled collection");
  }

  logger.success("Orchestrator started successfully");
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down...");
  dynamicScheduler?.stop();
  stopTrendFetcher();
  await stopAgents();
  await (db as PrismaClient).$disconnect();
  await getRedis()?.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down...");
  dynamicScheduler?.stop();
  stopTrendFetcher();
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
