/**
 * Socket.io Manager
 *
 * Provides server-side utilities for emitting real-time events
 * to connected admin clients.
 *
 * Usage in API routes or services:
 * ```typescript
 * import { emitToAdmin } from '@/lib/socket';
 * emitToAdmin('agent:started', { timestamp: new Date() });
 * ```
 */

import { Server as SocketIOServer } from "socket.io";

/**
 * Get the Socket.io server instance
 *
 * @returns Socket.io server instance or null if not initialized
 */
export function getSocketIO(): SocketIOServer | null {
  if (typeof global.io === "undefined") {
    // Socket.io not initialized yet (development mode initial load)
    return null;
  }
  return global.io;
}

/**
 * Emit event to all clients in the admin room
 *
 * @param event - Event name (e.g., 'agent:started')
 * @param data - Event payload
 * @returns true if emitted, false if Socket.io not available
 */
export function emitToAdmin(event: string, data: unknown): boolean {
  const io = getSocketIO();

  if (!io) {
    console.warn(`[Socket] Cannot emit '${event}' - Socket.io not initialized`);
    return false;
  }

  io.to("admin").emit(event, data);
  console.log(`[Socket] Emitted '${event}' to admin room:`, data);
  return true;
}

/**
 * Emit event to all connected clients (broadcast)
 *
 * @param event - Event name
 * @param data - Event payload
 * @returns true if emitted, false if Socket.io not available
 */
export function emitToAll(event: string, data: unknown): boolean {
  const io = getSocketIO();

  if (!io) {
    console.warn(`[Socket] Cannot emit '${event}' - Socket.io not initialized`);
    return false;
  }

  io.emit(event, data);
  console.log(`[Socket] Broadcasted '${event}':`, data);
  return true;
}

/**
 * Get count of connected clients in admin room
 */
export async function getAdminClientCount(): Promise<number> {
  const io = getSocketIO();

  if (!io) {
    return 0;
  }

  const sockets = await io.in("admin").fetchSockets();
  return sockets.length;
}

/**
 * Event types for type safety
 */
export const SocketEvents = {
  // Agent lifecycle
  AGENT_STARTED: "agent:started",
  AGENT_PROGRESS: "agent:progress",
  AGENT_COMPLETED: "agent:completed",
  AGENT_FAILED: "agent:failed",

  // Article events
  ARTICLE_PUBLISHED: "article:published",
  ARTICLE_UPDATED: "article:updated",
  ARTICLE_DELETED: "article:deleted",

  // Analytics
  ANALYTICS_UPDATED: "analytics:updated",

  // System
  SYSTEM_NOTIFICATION: "system:notification",
} as const;

export type SocketEventType = (typeof SocketEvents)[keyof typeof SocketEvents];

/**
 * Type-safe event emitter
 */
export function emitTypedEvent<T = unknown>(
  event: SocketEventType,
  data: T,
): boolean {
  return emitToAdmin(event, data);
}

// Extend global type for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}
