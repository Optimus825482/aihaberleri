/**
 * Sentry Server-Side Configuration
 * Runs in Node.js (SSR, API routes, Server Actions).
 * Captures unhandled exceptions, slow DB queries, worker errors.
 *
 * Activated automatically by @sentry/nextjs when this file exists.
 * Requires SENTRY_DSN environment variable (set in Coolify).
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "production",

    // Performance: sample 10% of server traces in production (expensive)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

    // Suppress expected operational errors
    ignoreErrors: [
      "NEXT_NOT_FOUND",   // notFound() calls — expected 404s
      "NEXT_REDIRECT",    // redirect() calls — expected redirects
    ],

    beforeSend(event, hint) {
      // Don't send in development
      if (process.env.NODE_ENV !== "production") return null;

      // Don't send 4xx errors (client mistakes, not our bugs)
      const statusCode = (hint?.originalException as any)?.statusCode;
      if (statusCode && statusCode >= 400 && statusCode < 500) return null;

      return event;
    },
  });
}
