/**
 * Sentry Client-Side Configuration
 * Runs in the browser — captures JS errors, network failures, user interactions.
 *
 * Activated automatically by @sentry/nextjs when this file exists.
 * Requires SENTRY_DSN environment variable (set in Coolify).
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "production",

    // Performance: sample 10% of sessions in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Session Replay: record 5% of sessions, 100% when error occurs
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        // Mask all user inputs (GDPR)
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Suppress noisy browser errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      "Network request failed",
      "ChunkLoadError",
      "Loading CSS chunk",
      "Hydration",
      /^Script error/,
    ],

    beforeSend(event) {
      // Don't send errors in development
      if (process.env.NODE_ENV !== "production") return null;
      return event;
    },
  });
}
