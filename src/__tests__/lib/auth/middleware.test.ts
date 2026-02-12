// @ts-nocheck
/**
 * Authentication & Authorization Middleware Tests
 *
 * TDD: Red-Green-Refactor
 * Skill: test-driven-development
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import {
  requireAuth,
  requireRole,
  requirePermission,
  validateCSRFToken,
  withAuth,
  checkRateLimit,
} from "@/lib/auth/middleware";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const { auth } = await import("@/lib/auth");

describe("Authentication Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAuth", () => {
    it("should return 401 when no session exists", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/seo/stats");
      const response = await requireAuth(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.code).toBe("UNAUTHORIZED");
    });

    it("should return user when session exists", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "admin@test.com",
          role: UserRole.ADMIN,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const request = new NextRequest("http://localhost/api/admin/seo/stats");
      const result = await requireAuth(request);

      expect(result).toHaveProperty("session");
      expect(result).toHaveProperty("user");
      expect((result as any).user.id).toBe("user-1");
    });
  });

  describe("requireRole", () => {
    it("should return 403 when user role is not allowed", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "viewer@test.com",
          role: UserRole.VIEWER,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const request = new NextRequest(
        "http://localhost/api/admin/seo/bulk-optimize",
      );
      const response = await requireRole(request, [UserRole.ADMIN]);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("should allow access when user has required role", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "admin@test.com",
          role: UserRole.ADMIN,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const request = new NextRequest(
        "http://localhost/api/admin/seo/bulk-optimize",
      );
      const result = await requireRole(request, [UserRole.ADMIN]);

      expect(result).toHaveProperty("session");
      expect((result as any).user.role).toBe(UserRole.ADMIN);
    });

    it("should allow access when user has any of the allowed roles", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "editor@test.com",
          role: UserRole.EDITOR,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const request = new NextRequest(
        "http://localhost/api/admin/seo/recommendations",
      );
      const result = await requireRole(request, [
        UserRole.EDITOR,
        UserRole.ADMIN,
      ]);

      expect(result).toHaveProperty("session");
      expect((result as any).user.role).toBe(UserRole.EDITOR);
    });
  });

  describe("validateCSRFToken", () => {
    it("should return true for GET requests", () => {
      const request = new NextRequest("http://localhost/api/admin/seo/stats", {
        method: "GET",
      });

      const result = validateCSRFToken(request);
      expect(result).toBe(true);
    });

    it("should return false when CSRF token is missing", () => {
      const request = new NextRequest(
        "http://localhost/api/admin/seo/recommendations",
        {
          method: "POST",
        },
      );

      const result = validateCSRFToken(request);
      expect(result).toBe(false);
    });

    it("should return false when CSRF tokens don't match", () => {
      const request = new NextRequest(
        "http://localhost/api/admin/seo/recommendations",
        {
          method: "POST",
          headers: {
            "x-csrf-token": "token-1",
          },
        },
      );

      // Mock cookie with different token
      request.cookies.set("csrf-token", "token-2");

      const result = validateCSRFToken(request);
      expect(result).toBe(false);
    });

    it("should return true when CSRF tokens match", () => {
      const token = "valid-csrf-token";
      const request = new NextRequest(
        "http://localhost/api/admin/seo/recommendations",
        {
          method: "POST",
          headers: {
            "x-csrf-token": token,
          },
        },
      );

      request.cookies.set("csrf-token", token);

      const result = validateCSRFToken(request);
      expect(result).toBe(true);
    });
  });

  describe("withAuth", () => {
    it("should validate CSRF, authentication, and authorization", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "admin@test.com",
          role: UserRole.ADMIN,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const token = "valid-csrf-token";
      const request = new NextRequest(
        "http://localhost/api/admin/seo/bulk-optimize",
        {
          method: "POST",
          headers: {
            "x-csrf-token": token,
          },
        },
      );

      request.cookies.set("csrf-token", token);

      const result = await withAuth(request, {
        roles: [UserRole.ADMIN],
      });

      expect(result).toHaveProperty("session");
      expect((result as any).user.role).toBe(UserRole.ADMIN);
    });

    it("should return 403 when CSRF validation fails", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/seo/recommendations",
        {
          method: "POST",
        },
      );

      const response = await withAuth(request);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.code).toBe("CSRF_INVALID");
    });

    it("should skip CSRF validation when skipCSRF is true", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "admin@test.com",
          role: UserRole.ADMIN,
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const request = new NextRequest(
        "http://localhost/api/admin/seo/recommendations",
        {
          method: "POST",
        },
      );

      const result = await withAuth(request, {
        skipCSRF: true,
      });

      expect(result).toHaveProperty("session");
    });
  });

  describe("checkRateLimit", () => {
    it("should allow first request", () => {
      const result = checkRateLimit("user-1", 10, 60000);
      expect(result).toBe(true);
    });

    it("should block requests exceeding limit", () => {
      const userId = "user-2";
      const limit = 3;

      // Make 3 requests (should all pass)
      for (let i = 0; i < limit; i++) {
        expect(checkRateLimit(userId, limit, 60000)).toBe(true);
      }

      // 4th request should be blocked
      expect(checkRateLimit(userId, limit, 60000)).toBe(false);
    });

    it("should reset after time window", async () => {
      const userId = "user-3";
      const limit = 2;
      const windowMs = 100; // 100ms window

      // Make 2 requests
      expect(checkRateLimit(userId, limit, windowMs)).toBe(true);
      expect(checkRateLimit(userId, limit, windowMs)).toBe(true);

      // 3rd request should be blocked
      expect(checkRateLimit(userId, limit, windowMs)).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should allow requests again
      expect(checkRateLimit(userId, limit, windowMs)).toBe(true);
    });
  });
});
