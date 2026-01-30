/**
 * Socket.io Type Definitions
 *
 * Provides TypeScript types for Socket.io events and data structures.
 */

export interface AgentStartedEvent {
  timestamp: string;
  logId: string;
  categorySlug: string | null;
}

export interface AgentProgressEvent {
  step: "fetching" | "analyzing" | "processing" | "publishing" | "completed";
  message: string;
  progress: number;
  timestamp?: string;
}

export interface AgentCompletedEvent {
  articlesCreated: number;
  articlesScraped: number;
  duration: number;
  timestamp: string;
  logId: string;
}

export interface AgentFailedEvent {
  error: string;
  logId: string;
  timestamp: string;
  articlesCreated: number;
  duration: number;
}

export interface ArticlePublishedEvent {
  id: string;
  slug: string;
  timestamp: string;
  title?: string;
}

export interface ArticleUpdatedEvent {
  id: string;
  slug: string;
  timestamp: string;
}

export interface ArticleDeletedEvent {
  id: string;
  timestamp: string;
}

export interface AnalyticsUpdatedEvent {
  timestamp: string;
  data: unknown;
}

export interface SystemNotificationEvent {
  type: "info" | "warning" | "error" | "success";
  message: string;
  timestamp: string;
}

/**
 * Socket Event Map
 *
 * Maps event names to their payload types
 */
export interface SocketEventMap {
  "agent:started": AgentStartedEvent;
  "agent:progress": AgentProgressEvent;
  "agent:completed": AgentCompletedEvent;
  "agent:failed": AgentFailedEvent;
  "article:published": ArticlePublishedEvent;
  "article:updated": ArticleUpdatedEvent;
  "article:deleted": ArticleDeletedEvent;
  "analytics:updated": AnalyticsUpdatedEvent;
  "system:notification": SystemNotificationEvent;
}
