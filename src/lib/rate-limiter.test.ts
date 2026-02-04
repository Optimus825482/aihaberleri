/**
 * Rate Limiter Test Suite
 *
 * Fix #14: Rate Limiting Eksik
 * Skill: api-patterns → Rate limiting + vulnerability-scanner → A02 Security Misconfiguration
 *
 * Test Coverage:
 * - Rate limit enforcement
 * - Different limits per endpoint
 * - Rate limit headers
 * - 429 response
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { RateLimiter, RateLimitConfig } from "./rate-limiter";

describe("RateLimiter", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  describe("Rate Limit Enforcement", () => {
    it("should allow requests within limit", async () => {
      const config: RateLimitConfig = {
        maxRequests: 5,
        windowMs: 60000, // 1 minute
      };

      const identifier = "test-user-1";

      // İlk 5 request başarılı olmalı
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.check(identifier, config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it("should block requests exceeding limit", async () => {
      const config: RateLimitConfig = {
        maxRequests: 3,
        windowMs: 60000,
      };

      const identifier = "test-user-2";

      // İlk 3 request başarılı
      for (let i = 0; i < 3; i++) {
        const result = await rateLimiter.check(identifier, config);
        expect(result.allowed).toBe(true);
      }

      // 4. request bloklanmalı
      const blockedResult = await rateLimiter.check(identifier, config);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.remaining).toBe(0);
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });

    it("should reset after window expires", async () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 100, // 100ms window
      };

      const identifier = "test-user-3";

      // İlk 2 request
      await rateLimiter.check(identifier, config);
      await rateLimiter.check(identifier, config);

      // 3. request bloklanmalı
      const blocked = await rateLimiter.check(identifier, config);
      expect(blocked.allowed).toBe(false);

      // Window expire olana kadar bekle
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Yeni window'da request başarılı olmalı
      const afterReset = await rateLimiter.check(identifier, config);
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.remaining).toBe(1);
    });
  });

  describe("Endpoint-Specific Limits", () => {
    it("should apply different limits for different endpoints", async () => {
      const statsConfig: RateLimitConfig = {
        maxRequests: 100,
        windowMs: 60000,
      };

      const bulkConfig: RateLimitConfig = {
        maxRequests: 10,
        windowMs: 60000,
      };

      const identifier = "test-user-4";

      // Stats endpoint - 100 req/min
      const statsResult = await rateLimiter.check(identifier, statsConfig);
      expect(statsResult.allowed).toBe(true);
      expect(statsResult.limit).toBe(100);

      // Bulk endpoint - 10 req/min
      const bulkResult = await rateLimiter.check(identifier, bulkConfig);
      expect(bulkResult.allowed).toBe(true);
      expect(bulkResult.limit).toBe(10);
    });
  });

  describe("Rate Limit Headers", () => {
    it("should return correct rate limit headers", async () => {
      const config: RateLimitConfig = {
        maxRequests: 10,
        windowMs: 60000,
      };

      const identifier = "test-user-5";

      const result = await rateLimiter.check(identifier, config);

      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it("should include retry-after when rate limited", async () => {
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 60000,
      };

      const identifier = "test-user-6";

      // İlk request
      await rateLimiter.check(identifier, config);

      // İkinci request - bloklanmalı
      const blocked = await rateLimiter.check(identifier, config);

      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfter).toBeGreaterThan(0);
      expect(blocked.retryAfter).toBeLessThanOrEqual(60);
    });
  });

  describe("Identifier Isolation", () => {
    it("should isolate rate limits per identifier", async () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 60000,
      };

      const user1 = "user-1";
      const user2 = "user-2";

      // User 1 - 2 request
      await rateLimiter.check(user1, config);
      await rateLimiter.check(user1, config);

      // User 1 - 3. request bloklanmalı
      const user1Blocked = await rateLimiter.check(user1, config);
      expect(user1Blocked.allowed).toBe(false);

      // User 2 - hala request yapabilmeli
      const user2Result = await rateLimiter.check(user2, config);
      expect(user2Result.allowed).toBe(true);
      expect(user2Result.remaining).toBe(1);
    });
  });
});
