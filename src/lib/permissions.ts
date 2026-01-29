/**
 * Permission System
 * Role-Based Access Control (RBAC) definitions
 */

export enum Permission {
  // Dashboard
  VIEW_DASHBOARD = "view_dashboard",
  VIEW_ANALYTICS = "view_analytics",

  // Articles
  VIEW_ARTICLES = "view_articles",
  CREATE_ARTICLE = "create_article",
  EDIT_ARTICLE = "edit_article",
  DELETE_ARTICLE = "delete_article",
  PUBLISH_ARTICLE = "publish_article",
  BULK_EDIT_ARTICLES = "bulk_edit_articles",

  // Categories
  VIEW_CATEGORIES = "view_categories",
  MANAGE_CATEGORIES = "manage_categories",

  // Users
  VIEW_USERS = "view_users",
  CREATE_USER = "create_user",
  EDIT_USER = "edit_user",
  DELETE_USER = "delete_user",
  CHANGE_USER_ROLE = "change_user_role",

  // Settings
  VIEW_SETTINGS = "view_settings",
  EDIT_SETTINGS = "edit_settings",
  MANAGE_AGENT_SETTINGS = "manage_agent_settings",

  // Messages & Newsletter
  VIEW_MESSAGES = "view_messages",
  REPLY_MESSAGES = "reply_messages",
  DELETE_MESSAGES = "delete_messages",
  MANAGE_NEWSLETTER = "manage_newsletter",

  // Notifications
  SEND_NOTIFICATIONS = "send_notifications",

  // Audit Logs
  VIEW_AUDIT_LOGS = "view_audit_logs",

  // System
  TRIGGER_AGENT = "trigger_agent",
  CLEAR_CACHE = "clear_cache",
}

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: [
    // Full access to everything
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ARTICLES,
    Permission.CREATE_ARTICLE,
    Permission.EDIT_ARTICLE,
    Permission.DELETE_ARTICLE,
    Permission.PUBLISH_ARTICLE,
    Permission.BULK_EDIT_ARTICLES,
    Permission.VIEW_CATEGORIES,
    Permission.MANAGE_CATEGORIES,
    Permission.VIEW_USERS,
    Permission.CREATE_USER,
    Permission.EDIT_USER,
    Permission.DELETE_USER,
    Permission.CHANGE_USER_ROLE,
    Permission.VIEW_SETTINGS,
    Permission.EDIT_SETTINGS,
    Permission.MANAGE_AGENT_SETTINGS,
    Permission.VIEW_MESSAGES,
    Permission.REPLY_MESSAGES,
    Permission.DELETE_MESSAGES,
    Permission.MANAGE_NEWSLETTER,
    Permission.SEND_NOTIFICATIONS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.TRIGGER_AGENT,
    Permission.CLEAR_CACHE,
  ],

  ADMIN: [
    // Admin without user management
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ARTICLES,
    Permission.CREATE_ARTICLE,
    Permission.EDIT_ARTICLE,
    Permission.DELETE_ARTICLE,
    Permission.PUBLISH_ARTICLE,
    Permission.BULK_EDIT_ARTICLES,
    Permission.VIEW_CATEGORIES,
    Permission.MANAGE_CATEGORIES,
    Permission.VIEW_SETTINGS,
    Permission.EDIT_SETTINGS,
    Permission.MANAGE_AGENT_SETTINGS,
    Permission.VIEW_MESSAGES,
    Permission.REPLY_MESSAGES,
    Permission.DELETE_MESSAGES,
    Permission.MANAGE_NEWSLETTER,
    Permission.SEND_NOTIFICATIONS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.TRIGGER_AGENT,
    Permission.CLEAR_CACHE,
  ],

  EDITOR: [
    // Content editor - can create/edit articles
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ARTICLES,
    Permission.CREATE_ARTICLE,
    Permission.EDIT_ARTICLE,
    Permission.VIEW_CATEGORIES,
    Permission.VIEW_SETTINGS,
    Permission.VIEW_MESSAGES,
  ],

  VIEWER: [
    // Read-only access
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ARTICLES,
    Permission.VIEW_CATEGORIES,
    Permission.VIEW_SETTINGS,
    Permission.VIEW_MESSAGES,
    Permission.VIEW_AUDIT_LOGS,
  ],

  MODERATOR: [
    // Moderate content and manage user interactions
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ARTICLES,
    Permission.EDIT_ARTICLE,
    Permission.VIEW_MESSAGES,
    Permission.REPLY_MESSAGES,
    Permission.DELETE_MESSAGES,
    Permission.MANAGE_NEWSLETTER,
  ],
};

/**
 * Check if user has permission
 */
export function hasPermission(
  userRole: string,
  permission: Permission,
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Check if user has ANY of the permissions
 */
export function hasAnyPermission(
  userRole: string,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(userRole, permission));
}

/**
 * Check if user has ALL permissions
 */
export function hasAllPermissions(
  userRole: string,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(userRole, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role can access resource
 */
export function canAccessResource(
  userRole: string,
  resource: "articles" | "categories" | "users" | "settings" | "messages",
): boolean {
  const permissionMap: Record<string, Permission> = {
    articles: Permission.VIEW_ARTICLES,
    categories: Permission.VIEW_CATEGORIES,
    users: Permission.VIEW_USERS,
    settings: Permission.VIEW_SETTINGS,
    messages: Permission.VIEW_MESSAGES,
  };

  return hasPermission(userRole, permissionMap[resource]);
}
