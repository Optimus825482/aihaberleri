/**
 * Audit Logger
 *
 * Logs all critical admin actions for security and compliance
 */

import { db } from "@/lib/db";

export type AuditAction =
  | "CREATE_ARTICLE"
  | "UPDATE_ARTICLE"
  | "DELETE_ARTICLE"
  | "BULK_PUBLISH_ARTICLES"
  | "BULK_UNPUBLISH_ARTICLES"
  | "BULK_DELETE_ARTICLES"
  | "BULK_CHANGE_CATEGORY"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "BULK_ROLE_ASSIGNMENT"
  | "UPDATE_SETTINGS"
  | "TRIGGER_AGENT"
  | "CLEAR_CACHE"
  | "EXPORT_DATA"
  | "IMPORT_DATA";

export interface AuditLogData {
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  resourceIds?: string[];
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create audit log entry
 *
 * @param data - Audit log data
 * @returns Created audit log
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    const auditLog = await db.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        resourceIds: data.resourceIds,
        metadata: data.metadata || {},
        ipAddress: data.ipAddress || "unknown",
        userAgent: data.userAgent || "unknown",
      },
    });

    console.log(`[AUDIT] ${data.action} by user ${data.userId}`, {
      resource: data.resource,
      resourceId: data.resourceId,
      resourceIds: data.resourceIds,
    });

    return auditLog;
  } catch (error) {
    console.error("[AUDIT] Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main operation
    return null;
  }
}

/**
 * Get audit logs for a user
 *
 * @param userId - User ID
 * @param options - Query options
 * @returns Audit logs
 */
export async function getUserAuditLogs(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    action?: AuditAction;
    dateFrom?: Date;
    dateTo?: Date;
  } = {},
) {
  const { page = 1, limit = 50, action, dateFrom, dateTo } = options;
  const skip = (page - 1) * limit;

  const where: any = { userId };

  if (action) {
    where.action = action;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get audit logs for a resource
 *
 * @param resource - Resource type
 * @param resourceId - Resource ID
 * @param options - Query options
 * @returns Audit logs
 */
export async function getResourceAuditLogs(
  resource: string,
  resourceId: string,
  options: {
    page?: number;
    limit?: number;
  } = {},
) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where: {
        resource,
        OR: [{ resourceId }, { resourceIds: { has: resourceId } }],
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    db.auditLog.count({
      where: {
        resource,
        OR: [{ resourceId }, { resourceIds: { has: resourceId } }],
      },
    }),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get audit log statistics
 *
 * @param options - Query options
 * @returns Statistics
 */
export async function getAuditLogStats(
  options: {
    dateFrom?: Date;
    dateTo?: Date;
  } = {},
) {
  const { dateFrom, dateTo } = options;

  const where: any = {};
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const [totalLogs, actionCounts, topUsers] = await Promise.all([
    // Total logs
    db.auditLog.count({ where }),

    // Logs by action
    db.auditLog.groupBy({
      by: ["action"],
      where,
      _count: true,
      orderBy: {
        _count: {
          action: "desc",
        },
      },
    }),

    // Top users by activity
    db.auditLog.groupBy({
      by: ["userId"],
      where,
      _count: true,
      orderBy: {
        _count: {
          userId: "desc",
        },
      },
      take: 10,
    }),
  ]);

  // Get user details for top users
  const userIds = topUsers.map((u) => u.userId);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });

  const topUsersWithDetails = topUsers.map((u) => ({
    user: users.find((user) => user.id === u.userId),
    count: u._count,
  }));

  return {
    totalLogs,
    actionCounts: actionCounts.map((a) => ({
      action: a.action,
      count: a._count,
    })),
    topUsers: topUsersWithDetails,
  };
}

/**
 * Clean up old audit logs
 *
 * @param daysToKeep - Number of days to keep logs
 * @returns Number of deleted logs
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await db.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`[AUDIT] Cleaned up ${result.count} old audit logs`);

  return result.count;
}
