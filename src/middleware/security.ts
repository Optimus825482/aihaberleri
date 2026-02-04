/**
 * Security Middleware
 *
 * Combines:
 * - Fix #14: Rate Limiting
 * - Fix #15: Input Validation
 * - Fix #16: SQL Injection Prevention
 *
 * Skills:
 * - api-patterns → Rate limiting + Input validation
 * - vulnerability-scanner → A02 Security Misconfiguration + A05 Injection
 * - nodejs-best-practices → Security principles
 */

import { NextRequest, NextResponse } from "next/server";
import {
  RateLimiter,
  RATE_LIMITS,
  getRateLimitIdentifier,
  createRateLimitHeaders,
  createRateLimitResponse,
} from "@/lib/rate-limiter";
import { sanitizeInput } from "@/lib/sql-injection-prevention";

/**
 * Rate limiting middleware
 *
 * Apply to all API routes
 */
export async function withRateLimit(
  request: NextRequest,
  endpoint: keyof typeof RATE_LIMITS,
): Promise<NextResponse | null> {
  const rateLimiter = new RateLimiter();
  const identifier = getRateLimitIdentifier(request);
  const config = RATE_LIMITS[endpoint];

  const result = await rateLimiter.check(identifier, config);

  if (!result.allowed) {
    // Create NextResponse directly instead of using createRateLimitResponse
    return NextResponse.json(
      {
        success: false,
        error: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.",
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: createRateLimitHeaders(result),
      },
    );
  }

  // Add rate limit headers to response
  const headers = createRateLimitHeaders(result);

  // Store headers in request for later use
  (request as any).rateLimitHeaders = headers;

  return null; // Continue to next middleware
}

/**
 * Input sanitization middleware
 *
 * Sanitize all string inputs to prevent injection
 */
export async function withInputSanitization(
  request: NextRequest,
): Promise<NextRequest> {
  if (
    request.method === "POST" ||
    request.method === "PUT" ||
    request.method === "PATCH"
  ) {
    try {
      const body = await request.json();
      const sanitized = sanitizeObject(body);

      // Create new request with sanitized body
      const sanitizedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(sanitized),
      });

      return sanitizedRequest;
    } catch (error) {
      // If JSON parsing fails, return original request
      return request;
    }
  }

  return request;
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Security headers middleware
 *
 * Add security headers to all responses
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  // OWASP recommended security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  );
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );

  return response;
}

/**
 * Combined security middleware
 *
 * Apply all security measures
 */
export async function withSecurity(
  request: NextRequest,
  endpoint: keyof typeof RATE_LIMITS,
  handler: (req: NextRequest) => Promise<NextResponse>,
): Promise<NextResponse> {
  // 1. Rate limiting
  const rateLimitResponse = await withRateLimit(request, endpoint);
  if (rateLimitResponse) {
    return withSecurityHeaders(rateLimitResponse);
  }

  // 2. Input sanitization
  const sanitizedRequest = await withInputSanitization(request);

  // 3. Execute handler
  let response = await handler(sanitizedRequest);

  // 4. Add rate limit headers
  const rateLimitHeaders = (request as any).rateLimitHeaders;
  if (rateLimitHeaders) {
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value as string);
    });
  }

  // 5. Add security headers
  response = withSecurityHeaders(response);

  return response;
}

/**
 * Authentication middleware (placeholder)
 *
 * TODO: Implement after authentication system is ready
 */
export async function withAuth(
  request: NextRequest,
): Promise<{ authenticated: boolean; userId?: string }> {
  // TODO: Check session/JWT token
  // For now, return unauthenticated
  return { authenticated: false };
}

/**
 * Authorization middleware (placeholder)
 *
 * TODO: Implement after role-based access control is ready
 */
export async function withAuthorization(
  request: NextRequest,
  requiredRole: "admin" | "editor" | "viewer",
): Promise<boolean> {
  // TODO: Check user role
  // For now, return false
  return false;
}

/**
 * Audit logging middleware
 *
 * Log all security-relevant events
 */
export async function auditLog(
  request: NextRequest,
  action: string,
  result: "success" | "failure",
  details?: any,
): Promise<void> {
  const log = {
    timestamp: new Date().toISOString(),
    action,
    result,
    method: request.method,
    url: request.url,
    ip: request.headers.get("x-forwarded-for") || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
    details,
  };

  // TODO: Send to logging service (e.g., Datadog, Sentry)
  console.log("[AUDIT]", JSON.stringify(log));
}
