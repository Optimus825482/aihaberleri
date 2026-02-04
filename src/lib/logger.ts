/**
 * Winston Structured Logger
 * Production-grade logging with multiple transports and levels
 *
 * Log Levels:
 * - error: Critical failures (always logged)
 * - warn: Important warnings (always logged)
 * - info: General information (production + dev)
 * - debug: Detailed debugging (dev only)
 *
 * Features:
 * - JSON formatting for production (searchable)
 * - Colorized output for development
 * - File rotation for production logs
 * - Context-aware logging with metadata
 */

import winston from "winston";
import path from "path";

const isDevelopment = process.env.NODE_ENV !== "production";
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

// Skip logger setup during build time
if (isBuildTime) {
  console.log("⚠️  Logger setup skipped (build time)");
}

// Log directory
const logDir = path.join(process.cwd(), "logs");

// Custom format for development (colorized)
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr =
      Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : "";
    return `${timestamp} ${level}: ${message}${metaStr}`;
  }),
);

// Custom format for production (JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create logger instance
const logger = isBuildTime
  ? {
      error: console.error,
      warn: console.warn,
      info: console.log,
      debug: console.log,
    }
  : winston.createLogger({
      level: isDevelopment ? "debug" : "info",
      format: isDevelopment ? devFormat : prodFormat,
      defaultMeta: {
        service: "ai-news-agent",
        environment: process.env.NODE_ENV || "development",
      },
      transports: isDevelopment
        ? [
            // Development: Console only
            new winston.transports.Console(),
          ]
        : [
            // Production: Console only (no file writes in container)
            new winston.transports.Console({
              format: winston.format.simple(),
            }),
          ],
    });

/**
 * Structured logging helpers with context
 */

export const agentLogger = {
  start: (logId: string, category?: string) => {
    logger.info("🤖 Agent execution started", {
      module: "agent",
      logId,
      category: category || "all",
      timestamp: new Date().toISOString(),
    });
  },

  complete: (logId: string, result: any) => {
    logger.info("✅ Agent execution completed", {
      module: "agent",
      logId,
      articlesCreated: result.articlesCreated,
      articlesScraped: result.articlesScraped,
      duration: result.duration,
      success: result.success,
    });
  },

  error: (logId: string, error: Error, context?: any) => {
    logger.error("❌ Agent execution failed", {
      module: "agent",
      logId,
      error: error.message,
      stack: error.stack,
      ...context,
    });
  },

  step: (logId: string, step: string, message: string, progress?: number) => {
    logger.info(`📊 Agent step: ${step}`, {
      module: "agent",
      logId,
      step,
      message,
      progress,
    });
  },
};

export const contentLogger = {
  processing: (title: string, sourceUrl: string) => {
    logger.info("⚙️  Processing article", {
      module: "content",
      title: title.substring(0, 100),
      sourceUrl,
    });
  },

  duplicate: (title: string, reason: string) => {
    logger.warn("🗑️ Duplicate article detected", {
      module: "content",
      title: title.substring(0, 100),
      reason,
    });
  },

  published: (articleId: string, title: string, slug: string) => {
    logger.info("📰 Article published", {
      module: "content",
      articleId,
      title: title.substring(0, 100),
      slug,
    });
  },

  error: (title: string, error: Error, stage: string) => {
    logger.error("❌ Content processing failed", {
      module: "content",
      title: title.substring(0, 100),
      stage,
      error: error.message,
      stack: error.stack,
    });
  },
};

export const workerLogger = {
  start: () => {
    logger.info("🚀 Worker started", {
      module: "worker",
      timestamp: new Date().toISOString(),
    });
  },

  jobStart: (jobId: string, jobName: string) => {
    logger.info("🔄 Job processing started", {
      module: "worker",
      jobId,
      jobName,
    });
  },

  jobComplete: (jobId: string, result: any) => {
    logger.info("✅ Job completed", {
      module: "worker",
      jobId,
      result,
    });
  },

  jobFailed: (jobId: string, error: Error) => {
    logger.error("❌ Job failed", {
      module: "worker",
      jobId,
      error: error.message,
      stack: error.stack,
    });
  },

  heartbeat: () => {
    logger.debug("💓 Worker heartbeat", {
      module: "worker",
      timestamp: new Date().toISOString(),
    });
  },

  connection: (
    service: string,
    status: "connected" | "failed" | "retrying",
  ) => {
    const level =
      status === "failed" ? "error" : status === "retrying" ? "warn" : "info";
    logger[level](`🔌 ${service} connection ${status}`, {
      module: "worker",
      service,
      status,
    });
  },
};

export const apiLogger = {
  request: (method: string, path: string, user?: any) => {
    logger.info("📥 API request", {
      module: "api",
      method,
      path,
      userId: user?.id,
    });
  },

  response: (
    method: string,
    path: string,
    status: number,
    duration: number,
  ) => {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    logger[level]("📤 API response", {
      module: "api",
      method,
      path,
      status,
      duration,
    });
  },

  error: (method: string, path: string, error: Error) => {
    logger.error("❌ API error", {
      module: "api",
      method,
      path,
      error: error.message,
      stack: error.stack,
    });
  },
};

export const cacheLogger = {
  hit: (key: string, level: "L1" | "L2") => {
    logger.debug("✅ Cache hit", {
      module: "cache",
      key,
      level,
    });
  },

  miss: (key: string) => {
    logger.debug("❌ Cache miss", {
      module: "cache",
      key,
    });
  },

  invalidate: (pattern: string, count: number) => {
    logger.info("🗑️ Cache invalidated", {
      module: "cache",
      pattern,
      keysInvalidated: count,
    });
  },
};

export const dbLogger = {
  slowQuery: (duration: number, query: string) => {
    logger.warn("⚠️  Slow database query", {
      module: "database",
      duration,
      query: query.substring(0, 200),
    });
  },

  connectionError: (error: Error) => {
    logger.error("❌ Database connection error", {
      module: "database",
      error: error.message,
      stack: error.stack,
    });
  },
};

// Export main logger for custom use
export default logger;
export { logger };
