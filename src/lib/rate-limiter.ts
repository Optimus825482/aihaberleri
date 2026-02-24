/**
 * Rate Limiter Implementation
 *
 * Fix #14: Rate Limiting Eksik
 * Uses local ioredis (same Redis as BullMQ) for rate limiting.
 *
 * Features:
 * - Local Redis-based rate limiting (ioredis)
 * - In-memory fallback when Redis unavailable
 * - Endpoint-specific limits
 * - Rate limit headers (X-RateLimit-*)
 * - 429 Too Many Requests response
 * - Sliding window algorithm
 */

import { getRedis } from "@/lib/redis";

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

// In-memory fallback when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export class RateLimiter {
  private readonly prefix = "ratelimit:";

  /**
   * Check rate limit for identifier using local Redis
   * Falls back to in-memory store if Redis unavailable
   */
  async check(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = `${this.prefix}${identifier}`;
    const now = Date.now();

    const redis = getRedis();
    if (!redis) {
      return this.checkInMemory(identifier, config);
    }

    try {
      const windowStart = now - config.windowMs;

      // Sliding window with ioredis pipeline
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);
      pipeline.zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 8)}`);
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();
      // results: [[err, val], [err, val], ...]
      const count = (results?.[1]?.[1] as number) || 0;

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
        const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
        if (oldest.length >= 2) {
          const oldestTimestamp = parseFloat(oldest[1]);
          const retryAfterMs = oldestTimestamp + config.windowMs - now;
          result.retryAfter = Math.ceil(retryAfterMs / 1000);
        }
      }

      return result;
    } catch (error) {
      console.error("[Rate Limit] Redis error, falling back to memory:", (error as Error).message);
      return this.checkInMemory(identifier, config);
    }
  }

  /**
   * In-memory fallback rate limiter (fixed window)
   */
  private checkInMemory(
    identifier: string,
    config: RateLimitConfig,
  ): RateLimitResult {
    const now = Date.now();
    const entry = memoryStore.get(identifier);

    if (!entry || now > entry.resetAt) {
      memoryStore.set(identifier, { count: 1, resetAt: now + config.windowMs });
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: now + config.windowMs,
      };
    }

    entry.count++;
    const allowed = entry.count <= config.maxRequests;
    return {
      allowed,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      reset: entry.resetAt,
      ...(!allowed && { retryAfter: Math.ceil((entry.resetAt - now) / 1000) }),
    };
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.prefix}${identifier}`;
    const redis = getRedis();
    if (redis) {
      await redis.del(key);
    }
    memoryStore.delete(identifier);
  }
}

let rateLimiterInstance: RateLimiter | null = null;

function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
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
export function getClientIdentifier(request: Request): string {
  // TODO: Get user ID from session after authentication is implemented
  // For now, use IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";

  return `ip:${ip}`;
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const limiter = getRateLimiter();
  const identifier = getClientIdentifier(request);
  return limiter.check(identifier, config);
}

// Export rate limit constants
export const bulkRateLimit = RATE_LIMITS.bulkOptimize;
export const sensitiveRateLimit = { maxRequests: 20, windowMs: 60000 };
export const userCreationRateLimit = { maxRequests: 10, windowMs: 60000 };

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
