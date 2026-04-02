/**
 * API Route Middleware Helpers
 *
 * Provides composable wrappers for Next.js App Router API routes:
 * - withRateLimit: Applies sliding-window rate limiting (uses existing rate-limiter.ts)
 *
 * Usage:
 *   export const POST = withRateLimit(
 *     async (req) => { ... your handler ... },
 *     { maxRequests: 10, windowMs: 60_000 }
 *   );
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  createRateLimitHeaders,
  createRateLimitResponse,
  type RateLimitConfig,
} from "./rate-limiter";

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<NextResponse | Response>;

/**
 * Wrap a route handler with rate limiting.
 *
 * @param handler  Original Next.js route handler
 * @param config   Rate limit config (maxRequests per windowMs)
 */
export function withRateLimit(
  handler: RouteHandler,
  config: RateLimitConfig,
): RouteHandler {
  return async (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
  ) => {
    const result = await checkRateLimit(req, config);

    if (!result.allowed) {
      return createRateLimitResponse(result) as NextResponse;
    }

    // Add rate limit headers to successful responses
    const response = await handler(req, ctx);
    const rateLimitHeaders = createRateLimitHeaders(result);

    // Clone response to add headers (responses are immutable)
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  };
}

/**
 * Pre-defined rate limit configs for common admin operations.
 * Match the existing RATE_LIMITS in rate-limiter.ts.
 */
export const ADMIN_RATE_LIMITS = {
  /** Batch operations (start social share batch, bulk SEO) — 5/min */
  batch: { maxRequests: 5, windowMs: 60_000 } satisfies RateLimitConfig,

  /** Write operations (create/update articles) — 30/min */
  write: { maxRequests: 30, windowMs: 60_000 } satisfies RateLimitConfig,

  /** Delete operations — 10/min */
  delete: { maxRequests: 10, windowMs: 60_000 } satisfies RateLimitConfig,

  /** Read/list operations — 100/min */
  read: { maxRequests: 100, windowMs: 60_000 } satisfies RateLimitConfig,
} as const;
