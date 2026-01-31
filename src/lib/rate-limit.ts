import { getRedis } from "./redis";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Redis-based rate limiting using INCR + EXPIRE pattern
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param limit - Maximum requests allowed in the window
 * @param windowSeconds - Time window in seconds
 * @returns Rate limit check result
 *
 * @example
 * const result = await checkRateLimit("192.168.1.1", 20, 60);
 * if (!result.success) {
 *   return new Response("Too Many Requests", { status: 429 });
 * }
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis = getRedis();

  // If Redis is not available, allow the request (fail-open)
  if (!redis) {
    console.warn(
      "[Rate Limit] Redis not available, allowing request (fail-open)",
    );
    return {
      success: true,
      remaining: limit,
      resetInSeconds: 0,
    };
  }

  const key = `rate_limit:${identifier}`;

  try {
    // Use Redis MULTI for atomic operations
    const multi = redis.multi();
    multi.incr(key);
    multi.ttl(key);

    const results = await multi.exec();

    if (!results) {
      console.error("[Rate Limit] Redis MULTI failed");
      return { success: true, remaining: limit, resetInSeconds: 0 };
    }

    const currentCount = results[0][1] as number;
    let ttl = results[1][1] as number;

    // If this is a new key (TTL = -1), set expiration
    if (ttl === -1) {
      await redis.expire(key, windowSeconds);
      ttl = windowSeconds;
    }

    const remaining = Math.max(0, limit - currentCount);
    const success = currentCount <= limit;

    if (!success) {
      console.log(
        `[Rate Limit] BLOCKED: ${identifier} - ${currentCount}/${limit} requests, reset in ${ttl}s`,
      );
    } else {
      console.log(
        `[Rate Limit] OK: ${identifier} - ${currentCount}/${limit} requests`,
      );
    }

    return {
      success,
      remaining,
      resetInSeconds: ttl,
    };
  } catch (error) {
    console.error("[Rate Limit] Redis error:", error);
    // Fail-open: allow request if Redis fails
    return {
      success: true,
      remaining: limit,
      resetInSeconds: 0,
    };
  }
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
  limit: number,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetInSeconds.toString(),
  };
}

// ============================================
// TTS-specific rate limit configuration
// ============================================
export const TTS_RATE_LIMIT = {
  limit: 20, // 20 requests
  windowSeconds: 60, // per minute
} as const;

/**
 * Check TTS-specific rate limit for an IP
 */
export async function checkTTSRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `tts:${ip}`,
    TTS_RATE_LIMIT.limit,
    TTS_RATE_LIMIT.windowSeconds,
  );
}
