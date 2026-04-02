/**
 * Sentry Edge Runtime Configuration
 * Runs in Next.js middleware (Edge Runtime).
 * Limited API surface — no Node.js modules available.
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

    // Edge traces are cheap — sample 20%
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

    beforeSend(event) {
      if (process.env.NODE_ENV !== "production") return null;
      return event;
    },
  });
}
