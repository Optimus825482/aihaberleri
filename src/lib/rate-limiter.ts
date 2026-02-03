/**
 * Rate Limiter
 *
 * Rate limiting utilities using Upstash Redis
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

// Redis client
const redis = Redis.fromEnv();

// ============================================================================
// RATE LIMITERS
// ============================================================================

/**
 * Global rate limiter: 100 requests per minute
 */
export const globalRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "ratelimit:global",
});

/**
 * Sensitive operations rate limiter: 10 requests per minute
 */
export const sensitiveRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
  prefix: "ratelimit:sensitive",
});

/**
 * Bulk operations rate limiter: 5 requests per minute
 */
export const bulkRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  prefix: "ratelimit:bulk",
});

/**
 * User creation rate limiter: 3 requests per hour
 */
export const userCreationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix: "ratelimit:user-creation",
});

/**
 * Export operations rate limiter: 2 requests per hour
 */
export const exportRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, "1 h"),
  analytics: true,
  prefix: "ratelimit:export",
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get client identifier from request
 *
 * @param request - Next.js request
 * @returns Client identifier (IP or user ID)
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from session (if authenticated)
  const userId = request.headers.get("x-user-id");
  if (userId) return `user:${userId}`;

  // Fallback to IP address
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return `ip:${ip}`;
}

/**
 * Check rate limit and return response if exceeded
 *
 * @param ratelimit - Ratelimit instance
 * @param identifier - Client identifier
 * @returns null if allowed, NextResponse if rate limited
 */
export async function checkRateLimit(
  ratelimit: Ratelimit,
  identifier: string,
): Promise<NextResponse | null> {
  const { success, limit, reset, remaining } =
    await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit aşıldı",
        details: {
          limit,
          remaining: 0,
          reset: new Date(reset).toISOString(),
        },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  return null;
}

/**
 * Add rate limit headers to response
 *
 * @param response - Next.js response
 * @param limit - Rate limit info
 * @returns Response with headers
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: {
    limit: number;
    remaining: number;
    reset: number;
  },
): NextResponse {
  response.headers.set("X-RateLimit-Limit", limit.limit.toString());
  response.headers.set("X-RateLimit-Remaining", limit.remaining.toString());
  response.headers.set("X-RateLimit-Reset", limit.reset.toString());

  return response;
}

/**
 * Rate limit middleware wrapper
 *
 * @param ratelimit - Ratelimit instance
 * @param handler - Request handler
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  ratelimit: Ratelimit,
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const identifier = getClientIdentifier(request);

    // Check rate limit
    const rateLimitResponse = await checkRateLimit(ratelimit, identifier);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get rate limit info for headers
    const { limit, remaining, reset } = await ratelimit.limit(identifier);

    // Execute handler
    const response = await handler(request);

    // Add rate limit headers
    return addRateLimitHeaders(response, { limit, remaining, reset });
  };
}

/**
 * Get rate limit stats for monitoring
 *
 * @param prefix - Rate limit prefix
 * @returns Rate limit statistics
 */
export async function getRateLimitStats(prefix: string) {
  try {
    // Get all keys with prefix
    const keys = await redis.keys(`${prefix}:*`);

    if (keys.length === 0) {
      return {
        totalKeys: 0,
        activeClients: 0,
        topClients: [],
      };
    }

    // Get values for all keys
    const values = await Promise.all(
      keys.map(async (key) => {
        const value = await redis.get(key);
        return { key, value };
      }),
    );

    // Calculate stats
    const activeClients = values.filter((v) => v.value !== null).length;

    // Get top clients by request count
    const topClients = values
      .filter((v) => v.value !== null)
      .map((v) => ({
        identifier: v.key.replace(`${prefix}:`, ""),
        requests: typeof v.value === "number" ? v.value : 0,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return {
      totalKeys: keys.length,
      activeClients,
      topClients,
    };
  } catch (error) {
    console.error("Failed to get rate limit stats:", error);
    return {
      totalKeys: 0,
      activeClients: 0,
      topClients: [],
    };
  }
}

/**
 * Reset rate limit for a client
 *
 * @param prefix - Rate limit prefix
 * @param identifier - Client identifier
 */
export async function resetRateLimit(prefix: string, identifier: string) {
  try {
    await redis.del(`${prefix}:${identifier}`);
    console.log(`[RATE_LIMIT] Reset rate limit for ${identifier}`);
  } catch (error) {
    console.error("Failed to reset rate limit:", error);
  }
}

/**
 * Clear all rate limits (use with caution!)
 *
 * @param prefix - Rate limit prefix
 */
export async function clearAllRateLimits(prefix: string) {
  try {
    const keys = await redis.keys(`${prefix}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[RATE_LIMIT] Cleared ${keys.length} rate limit keys`);
    }
  } catch (error) {
    console.error("Failed to clear rate limits:", error);
  }
}
