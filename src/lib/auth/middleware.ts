/**
 * Authentication & Authorization Middleware
 *
 * OWASP A07:2021 - Identification and Authentication Failures
 * OWASP A01:2021 - Broken Access Control
 *
 * Skill: api-patterns → Authentication patterns
 * Skill: vulnerability-scanner → Security checklist
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { getRequiredRolesForAdminApi } from "@/lib/admin-auth";

/**
 * Authentication check - JWT token verification
 */
export async function requireAuth(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json(
      {
        error: "Yetkisiz erişim",
        message: "Bu işlem için giriş yapmanız gerekiyor",
        code: "UNAUTHORIZED",
      },
      { status: 401 },
    );
  }

  return { session, user: session.user };
}

/**
 * Authorization check - Role-based access control (RBAC)
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: readonly Role[],
) {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Authentication failed
  }

  const { user } = authResult;

  if (!user.role || !allowedRoles.includes(user.role as Role)) {
    return NextResponse.json(
      {
        error: "Yetkisiz işlem",
        message: "Bu işlem için yeterli yetkiniz yok",
        code: "FORBIDDEN",
        required: allowedRoles,
        current: user.role,
      },
      { status: 403 },
    );
  }

  return authResult;
}

/**
 * Endpoint-based authorization - Uses consolidated RBAC from admin-auth.ts
 */
export async function requirePermission(request: NextRequest) {
  const method = request.method;
  const pathname = new URL(request.url).pathname;
  const allowedRoles = getRequiredRolesForAdminApi(method, pathname);

  return requireRole(
    request,
    allowedRoles.map((r) => r as Role),
  );
}

/**
 * CSRF Token validation
 * OWASP A01:2021 - Broken Access Control
 *
 * Double Submit Cookie Pattern
 */
export function validateCSRFToken(request: NextRequest): boolean {
  // GET, HEAD, OPTIONS metodları CSRF'den muaf
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return true;
  }

  // Header'dan CSRF token al
  const headerToken = request.headers.get("x-csrf-token");

  // Cookie'den CSRF token al
  const cookieToken = request.cookies.get("csrf-token")?.value;

  // Token yoksa veya eşleşmiyorsa hata
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return false;
  }

  return true;
}

/**
 * Combined middleware - Authentication + Authorization + CSRF
 */
export async function withAuth(
  request: NextRequest,
  options?: {
    roles?: Role[];
    skipCSRF?: boolean;
  },
) {
  // 1. CSRF validation
  if (!options?.skipCSRF && !validateCSRFToken(request)) {
    return NextResponse.json(
      {
        error: "CSRF token geçersiz",
        message: "Güvenlik doğrulaması başarısız",
        code: "CSRF_INVALID",
      },
      { status: 403 },
    );
  }

  // 2. Authentication check
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // 3. Authorization check (if roles specified)
  if (options?.roles && options.roles.length > 0) {
    const roleResult = await requireRole(request, options.roles);

    if (roleResult instanceof NextResponse) {
      return roleResult;
    }
  }

  // Success - return user info
  return authResult;
}
