/**
 * Audit Logger
 * Track admin actions for security and compliance
 */

import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "SETTINGS_CHANGE"
  | "BULK_UPDATE"
  | "BULK_DELETE"
  | "PUBLISH"
  | "UNPUBLISH";

export type AuditResource =
  | "ARTICLE"
  | "CATEGORY"
  | "USER"
  | "SETTING"
  | "MESSAGE"
  | "NEWSLETTER"
  | "NOTIFICATION"
  | "AGENT";

interface LogAuditOptions {
  userId: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details?: Record<string, any>;
}

/**
 * Log an audit entry
 */
export async function logAudit({
  userId,
  action,
  resource,
  resourceId,
  details,
}: LogAuditOptions) {
  try {
    // Get request headers for IP and user agent
    const headersList = headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details: details || {},
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    console.error("[AUDIT_LOG_ERROR]", error);
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(userId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Get audit logs for a resource
 */
export async function getResourceAuditLogs(
  resource: AuditResource,
  resourceId: string,
  limit = 20,
) {
  return prisma.auditLog.findMany({
    where: {
      resource,
      resourceId,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Get recent audit logs (admin dashboard)
 */
export async function getRecentAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      action: true,
      resource: true,
      userId: true,
    },
  });

  // Count by action
  const actionCounts: Record<string, number> = {};
  const resourceCounts: Record<string, number> = {};
  const userCounts: Record<string, number> = {};

  logs.forEach((log) => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1;
    userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
  });

  return {
    total: logs.length,
    actionCounts,
    resourceCounts,
    userCounts,
    topUsers: Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, count })),
  };
}
