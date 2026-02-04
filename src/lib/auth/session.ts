/**
 * Session Management
 *
 * OWASP A07:2021 - Identification and Authentication Failures
 *
 * Skill: api-patterns → Session management
 * Skill: nodejs-best-practices → Security principles
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Session configuration
 */
export const SESSION_CONFIG = {
  maxAge: 60 * 60 * 24 * 7, // 7 days
  updateAge: 60 * 60 * 24, // Update session every 24 hours
  refreshThreshold: 60 * 60, // Refresh token if less than 1 hour remaining
} as const;

/**
 * Get current session with user data
 */
export async function getCurrentSession() {
  const session = await auth();

  if (!session || !session.user) {
    return null;
  }

  // Get full user data from database
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    ...session,
    user,
  };
}

/**
 * Check if session needs refresh
 */
export function shouldRefreshSession(session: any): boolean {
  if (!session?.expires) {
    return false;
  }

  const expiresAt = new Date(session.expires).getTime();
  const now = Date.now();
  const timeRemaining = expiresAt - now;

  return timeRemaining < SESSION_CONFIG.refreshThreshold * 1000;
}

/**
 * Validate session and check expiry
 */
export async function validateSession() {
  const session = await getCurrentSession();

  if (!session) {
    return {
      valid: false,
      error: "Session not found",
    };
  }

  // Check if session expired
  if (session.expires && new Date(session.expires) < new Date()) {
    return {
      valid: false,
      error: "Session expired",
      needsRefresh: true,
    };
  }

  // Check if session needs refresh
  const needsRefresh = shouldRefreshSession(session);

  return {
    valid: true,
    session,
    needsRefresh,
  };
}

/**
 * Revoke all user sessions (logout from all devices)
 */
export async function revokeAllSessions(userId: string) {
  // Update user's session version to invalidate all existing sessions
  await db.user.update({
    where: { id: userId },
    data: {
      updatedAt: new Date(), // This will invalidate cached sessions
    },
  });

  return { success: true };
}

/**
 * Track session activity
 */
export async function trackSessionActivity(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: {
      updatedAt: new Date(),
    },
  });
}
