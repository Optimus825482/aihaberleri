/**
 * Admin Authentication Helper
 * JWT-based authentication for admin API routes
 */

import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

    return {
      id: payload.id as string,
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
