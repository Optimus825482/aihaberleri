/**
 * Rate Limiter Implementation
 *
 * Fix #14: Rate Limiting Eksik
 * Skill: api-patterns → Rate limiting + vulnerability-scanner → A02 Security Misconfiguration
 *
 * Features:
 * - Upstash Redis-based rate limiting
 * - Endpoint-specific limits
 * - Rate limit headers (X-RateLimit-*)
 * - 429 Too Many Requests response
 * - Sliding window algorithm
 */

import { Redis } from "@upstash/redis";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export class RateLimiter {
  private redis: Redis;
  private readonly prefix = "ratelimit:";

  constructor() {
    // Upstash Redis connection
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  /**
   * Check rate limit for identifier
   *
   * @param identifier - Unique identifier (user ID, IP, etc.)
   * @param config - Rate limit configuration
   * @returns Rate limit result
   */
  async check(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = `${this.prefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Sliding window algorithm using Redis sorted set
      const pipeline = this.redis.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, { score: now, member: `${now}` });

      // Set expiry
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();
      const count = (results[1] as number) || 0;

      const allowed = count < config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count - 1);
      const reset = now + config.windowMs;

      const result: RateLimitResult = {
        allowed,
        limit: config.maxRequests,
        remaining,
        reset,
      };

      if (!allowed) {
        // Calculate retry-after in seconds
        const oldestRequest = await this.redis.zrange(key, 0, 0, {
          withScores: true,
        });

        if (oldestRequest.length > 0) {
          const oldestTimestamp = oldestRequest[0].score;
          const retryAfterMs = oldestTimestamp + config.windowMs - now;
          result.retryAfter = Math.ceil(retryAfterMs / 1000);
        }
      }

      return result;
    } catch (error) {
      console.error("Rate limiter error:", error);

      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: now + config.windowMs,
      };
    }
  }

  /**
   * Reset rate limit for identifier
   *
   * @param identifier - Unique identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.prefix}${identifier}`;
    await this.redis.del(key);
  }
}

/**
 * Endpoint-specific rate limit configurations
 *
 * Based on api-patterns skill:
 * - Read endpoints: Higher limits
 * - Write endpoints: Lower limits
 * - Bulk operations: Strictest limits
 */
export const RATE_LIMITS = {
  // Read endpoints - 100 req/min
  stats: {
    maxRequests: 100,
    windowMs: 60000,
  },
  dashboard: {
    maxRequests: 100,
    windowMs: 60000,
  },
  recommendations: {
    maxRequests: 100,
    windowMs: 60000,
  },

  // Write endpoints - 30 req/min
  optimize: {
    maxRequests: 30,
    windowMs: 60000,
  },
  recalculate: {
    maxRequests: 30,
    windowMs: 60000,
  },

  // Bulk operations - 10 req/min
  bulkOptimize: {
    maxRequests: 10,
    windowMs: 60000,
  },
  bulkCalculate: {
    maxRequests: 10,
    windowMs: 60000,
  },
  bulkRecalculate: {
    maxRequests: 10,
    windowMs: 60000,
  },

  // Export operations - 5 req/min
  export: {
    maxRequests: 5,
    windowMs: 60000,
  },
} as const;

/**
 * Get rate limit identifier from request
 *
 * Priority:
 * 1. User ID (if authenticated)
 * 2. IP address
 * 3. Session ID
 */
export function getRateLimitIdentifier(request: Request): string {
  // TODO: Get user ID from session after authentication is implemented
  // For now, use IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";

  return `ip:${ip}`;
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: HeadersInit = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };

  if (result.retryAfter !== undefined) {
    headers["Retry-After"] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Create 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...createRateLimitHeaders(result),
      },
    },
  );
}
