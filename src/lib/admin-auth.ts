/**
 * Admin Authentication Helper
 * JWT-based authentication for admin API routes
 */

import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isJwtRevokedByTimestamp } from "@/lib/auth/session-revocation";

export const getJwtSecret = (): Uint8Array => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET must be set in production environment");
    }
    console.warn(
      "⚠️ WARNING: Using dev-only JWT secret. Set NEXTAUTH_SECRET in production!",
    );
    return new TextEncoder().encode("dev-only-secret-change-in-production");
  }
  return new TextEncoder().encode(secret);
};

const JWT_SECRET = getJwtSecret();

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Verify admin JWT token from cookie
 * Returns admin session if valid, null if invalid
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-session")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    const userId = payload.id as string;
    const tokenIssuedAt = payload.iat as number | undefined;
    const isRevoked = await isJwtRevokedByTimestamp(userId, tokenIssuedAt);
    if (isRevoked) {
      return null;
    }

    return {
      id: userId,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch (error) {
    console.error("[ADMIN_AUTH_ERROR]", error);
    return null;
  }
}

/**
 * Require admin authentication
 * Returns 401 response if not authenticated
 */
export async function requireAdminAuth(): Promise<AdminSession | NextResponse> {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  return session;
}

/**
 * Check if user has specific role
 */
export function hasRole(session: AdminSession, role: string): boolean {
  return session.role === role || session.role === "SUPER_ADMIN";
}

// ============================================================================
// RBAC: Admin API permission matrix (rapor önerisi – tüm admin endpoint'ler)
// ============================================================================

export interface AdminApiPermissionRule {
  method: string;
  pattern: RegExp;
  roles: string[]; // Prisma Role ile uyumlu: ADMIN, EDITOR, VIEWER, SUPER_ADMIN, MODERATOR
}

/** SUPER_ADMIN her zaman tüm endpoint'lere erişebilir; bu matris diğer roller için geçerli. */
export const ADMIN_API_PERMISSIONS: AdminApiPermissionRule[] = [
  // Users – liste/oluşturma: ADMIN+
  { method: "GET", pattern: /^\/api\/admin\/users\/?$/, roles: ["ADMIN", "SUPER_ADMIN"] },
  { method: "POST", pattern: /^\/api\/admin\/users\/?$/, roles: ["ADMIN", "SUPER_ADMIN"] },
  // Users – güncelleme/silme: sadece SUPER_ADMIN
  { method: "PATCH", pattern: /^\/api\/admin\/users\/[^/]+$/, roles: ["SUPER_ADMIN"] },
  { method: "DELETE", pattern: /^\/api\/admin\/users\/[^/]+$/, roles: ["SUPER_ADMIN"] },
  { method: "POST", pattern: /^\/api\/admin\/users\/bulk-role$/, roles: ["SUPER_ADMIN"] },
  { method: "GET", pattern: /^\/api\/admin\/users\/[^/]+\/activity/, roles: ["ADMIN", "SUPER_ADMIN"] },
  // Articles – okuma: VIEWER+, yazma/bulk: EDITOR+
  { method: "GET", pattern: /^\/api\/admin\/articles\/?$/, roles: ["VIEWER", "EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  { method: "GET", pattern: /^\/api\/admin\/articles\/[^/]+/, roles: ["VIEWER", "EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  { method: "POST", pattern: /^\/api\/admin\/articles\/bulk$/, roles: ["EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  { method: "POST", pattern: /^\/api\/admin\/articles\/?$/, roles: ["EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  { method: "PATCH", pattern: /^\/api\/admin\/articles\/[^/]+/, roles: ["EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  { method: "DELETE", pattern: /^\/api\/admin\/articles\/[^/]+/, roles: ["EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  // Newsletter – abone listesi/gönderim: EDITOR+
  { method: "GET", pattern: /^\/api\/admin\/newsletter\/subscribers/, roles: ["EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  { method: "POST", pattern: /^\/api\/admin\/newsletter\/send/, roles: ["EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  { method: "POST", pattern: /^\/api\/admin\/newsletter\/send-daily/, roles: ["EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  { method: "POST", pattern: /^\/api\/admin\/newsletter\/preview/, roles: ["EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  // SEO – mevcut auth/middleware ile uyumlu: VIEWER/EDITOR/ADMIN
  { method: "GET", pattern: /^\/api\/admin\/seo\//, roles: ["VIEWER", "EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  { method: "POST", pattern: /^\/api\/admin\/seo\/(optimize|recalculate|export|recommendations)/, roles: ["EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  { method: "POST", pattern: /^\/api\/admin\/seo\/bulk-(optimize|calculate)/, roles: ["ADMIN", "SUPER_ADMIN"] },
  // Dashboard, ayarlar, pipeline – ADMIN+ (veya VIEWER dashboard için)
  { method: "GET", pattern: /^\/api\/admin\/dashboard/, roles: ["VIEWER", "EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
  { method: "GET", pattern: /^\/api\/admin\/settings/, roles: ["ADMIN", "SUPER_ADMIN"] },
  { method: "PATCH", pattern: /^\/api\/admin\/settings/, roles: ["ADMIN", "SUPER_ADMIN"] },
  { method: "GET", pattern: /^\/api\/admin\/pipeline/, roles: ["VIEWER", "EDITOR", "ADMIN", "SUPER_ADMIN", "MODERATOR"] },
];

/**
 * İstek için gerekli roller (path + method). Eşleşme yoksa varsayılan: [ADMIN, SUPER_ADMIN].
 */
export function getRequiredRolesForAdminApi(
  method: string,
  pathname: string,
): string[] {
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  for (const rule of ADMIN_API_PERMISSIONS) {
    if (rule.method !== method) continue;
    if (rule.pattern.test(normalizedPath)) return rule.roles;
  }
  return ["ADMIN", "SUPER_ADMIN"];
}

/**
 * Admin auth + RBAC: session döner veya 401/403 response.
 * Route handler içinde ilk çağrı olarak kullanın.
 */
export async function requireAdminAuthWithPermission(
  request: Request,
): Promise<AdminSession | NextResponse> {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  if (session.role === "SUPER_ADMIN") return session;

  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;
  const allowedRoles = getRequiredRolesForAdminApi(method, pathname);

  if (allowedRoles.includes(session.role)) return session;

  return NextResponse.json(
    {
      error: "Yetkisiz işlem",
      message: "Bu endpoint için yeterli yetkiniz yok",
      code: "FORBIDDEN",
      required: allowedRoles,
      current: session.role,
    },
    { status: 403 },
  );
}
