/**
 * Security Headers Test Suite
 * TDD: Test-Driven Development approach
 * Skill: api-patterns → Security headers
 * Skill: vulnerability-scanner → OWASP A02 Security Misconfiguration
 */

import { describe, it, expect } from "@jest/globals";
import { NextRequest, NextResponse } from "next/server";
import { addSecurityHeaders } from "../security-headers";

describe("Security Headers", () => {
  const createMockRequest = (url: string = "https://example.com/api/test") => {
    return new NextRequest(url);
  };

  const createMockResponse = () => {
    return NextResponse.json({ success: true });
  };

  describe("addSecurityHeaders", () => {
    it("should add X-Frame-Options header", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      expect(result.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("should add X-Content-Type-Options header", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("should add X-XSS-Protection header", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      expect(result.headers.get("X-XSS-Protection")).toBe("1; mode=block");
    });

    it("should add Strict-Transport-Security header", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      const hsts = result.headers.get("Strict-Transport-Security");
      expect(hsts).toContain("max-age=31536000");
      expect(hsts).toContain("includeSubDomains");
    });

    it("should add Content-Security-Policy header", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      const csp = result.headers.get("Content-Security-Policy");
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src");
      expect(csp).toContain("script-src");
      expect(csp).toContain("style-src");
      expect(csp).toContain("img-src");
    });

    it("should add Referrer-Policy header", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      expect(result.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin",
      );
    });

    it("should add Permissions-Policy header", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      const permissions = result.headers.get("Permissions-Policy");
      expect(permissions).toBeDefined();
      expect(permissions).toContain("geolocation=()");
      expect(permissions).toContain("microphone=()");
      expect(permissions).toContain("camera=()");
    });

    it("should add X-DNS-Prefetch-Control header", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      expect(result.headers.get("X-DNS-Prefetch-Control")).toBe("on");
    });

    it("should not override existing headers", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      response.headers.set("X-Custom-Header", "custom-value");

      const result = addSecurityHeaders(request, response);

      expect(result.headers.get("X-Custom-Header")).toBe("custom-value");
      expect(result.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("should handle API routes", () => {
      const request = createMockRequest("https://example.com/api/users");
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      // All security headers should be present for API routes
      expect(result.headers.get("X-Frame-Options")).toBeDefined();
      expect(result.headers.get("X-Content-Type-Options")).toBeDefined();
    });

    it("should handle static assets", () => {
      const request = createMockRequest(
        "https://example.com/_next/static/test.js",
      );
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      // Security headers should still be present for static assets
      expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
  });

  describe("CSP Policy", () => {
    it("should allow self for default-src", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      const csp = result.headers.get("Content-Security-Policy");
      expect(csp).toContain("default-src 'self'");
    });

    it("should allow required image sources", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      const csp = result.headers.get("Content-Security-Policy");
      expect(csp).toContain("img-src");
      expect(csp).toContain("data:");
      expect(csp).toContain("https:");
    });

    it("should allow inline styles with nonce", () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = addSecurityHeaders(request, response);

      const csp = result.headers.get("Content-Security-Policy");
      expect(csp).toContain("style-src");
      expect(csp).toContain("'self'");
    });
  });
});
