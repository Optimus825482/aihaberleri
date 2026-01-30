/**
 * Sentry Error Tracking Integration
 * Production-grade error monitoring and performance tracking
 *
 * Features:
 * - Automatic error capture
 * - Performance monitoring
 * - User context tracking
 * - Custom error boundaries
 * - Breadcrumb tracking
 */

import * as Sentry from "@sentry/nextjs";

const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";
const isProduction = process.env.NODE_ENV === "production";
const sentryDsn = process.env.SENTRY_DSN;

/**
 * Initialize Sentry (call this in your app entry point)
 */
export function initSentry() {
  if (isBuildTime) {
    console.log("⚠️  Sentry initialization skipped (build time)");
    return;
  }

  if (!sentryDsn) {
    console.warn("⚠️  SENTRY_DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || "development",

    // Enable performance monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Enable profiling
    profilesSampleRate: isProduction ? 0.1 : 1.0,

    // Only send errors in production
    beforeSend(event, hint) {
      // Don't send errors during development (optional)
      if (!isProduction) {
        console.error("Sentry would capture:", event);
        return null;
      }
      return event;
    },

    // Ignore common noise
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      "Network request failed",
      "ChunkLoadError",
    ],

    // Session Replay (useful for debugging user issues)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% when errors occur
  });

  console.log("✅ Sentry initialized");
}

/**
 * Capture exception with context
 */
export function captureException(
  error: Error,
  context?: {
    module?: string;
    action?: string;
    userId?: string;
    extra?: Record<string, any>;
  },
) {
  if (isBuildTime) return;

  Sentry.withScope((scope) => {
    if (context?.module) {
      scope.setTag("module", context.module);
    }
    if (context?.action) {
      scope.setTag("action", context.action);
    }
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context?.extra) {
      scope.setContext("additional_info", context.extra);
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture message (non-error logging)
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" | "fatal" = "info",
  context?: Record<string, any>,
) {
  if (isBuildTime) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("context", context);
    }
    Sentry.captureMessage(message, level);
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  if (isBuildTime) return;
  Sentry.setUser(user);
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext() {
  if (isBuildTime) return;
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging trail
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  category?: string,
) {
  if (isBuildTime) return;

  Sentry.addBreadcrumb({
    message,
    category: category || "custom",
    data,
    level: "info",
    timestamp: Date.now() / 1000,
  });
}

/**
 * Track agent execution for monitoring
 */
export function trackAgentExecution(
  logId: string,
  result: {
    success: boolean;
    articlesCreated: number;
    duration: number;
    errors: string[];
  },
) {
  if (isBuildTime) return;

  if (!result.success) {
    captureMessage(
      `Agent execution failed: ${result.errors.join(", ")}`,
      "error",
      {
        logId,
        articlesCreated: result.articlesCreated,
        duration: result.duration,
      },
    );
  } else {
    addBreadcrumb(
      "Agent execution completed",
      {
        logId,
        articlesCreated: result.articlesCreated,
        duration: result.duration,
      },
      "agent",
    );
  }
}

/**
 * Track API errors
 */
export function trackAPIError(
  method: string,
  path: string,
  error: Error,
  statusCode?: number,
) {
  if (isBuildTime) return;

  captureException(error, {
    module: "api",
    action: `${method} ${path}`,
    extra: {
      statusCode,
      path,
      method,
    },
  });
}

/**
 * Track worker errors
 */
export function trackWorkerError(
  jobId: string,
  error: Error,
  context?: Record<string, any>,
) {
  if (isBuildTime) return;

  captureException(error, {
    module: "worker",
    action: "job_processing",
    extra: {
      jobId,
      ...context,
    },
  });
}

export default {
  initSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  trackAgentExecution,
  trackAPIError,
  trackWorkerError,
};
