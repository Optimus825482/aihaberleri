/**
 * Agent Log Stream - Redis Pub/Sub for real-time log streaming
 * Worker publishes logs to Redis, Admin panel subscribes
 */

import { getRedis } from "@/lib/redis";

const LOG_CHANNEL = "agent:logs";
const LOG_BUFFER_KEY = "agent:log-buffer";
const MAX_BUFFER_SIZE = 100;

// Throttle OOM error logging to prevent console spam
let lastOOMWarning = 0;
const OOM_WARNING_INTERVAL = 60_000; // Log OOM warning at most once per minute

export type LogLevel = "info" | "success" | "warn" | "error" | "debug";

export interface AgentLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string;
  data?: Record<string, unknown>;
}

/**
 * Publish a log entry to Redis (called from worker)
 */
export async function publishAgentLog(
  level: LogLevel,
  message: string,
  options?: {
    module?: string;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const entry: AgentLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    module: options?.module,
    data: options?.data,
  };

  try {
    // Publish to channel for real-time subscribers
    await redis.publish(LOG_CHANNEL, JSON.stringify(entry));

    // Also store in buffer for recent logs
    await redis.lpush(LOG_BUFFER_KEY, JSON.stringify(entry));
    await redis.ltrim(LOG_BUFFER_KEY, 0, MAX_BUFFER_SIZE - 1);

    // Set TTL for buffer (1 hour)
    await redis.expire(LOG_BUFFER_KEY, 3600);
  } catch (error) {
    // Silent fail - don't break worker for logging issues
    // Throttle OOM warnings to prevent console spam during Redis memory pressure
    const errorMsg = String(error);
    if (errorMsg.includes("OOM") || errorMsg.includes("maxmemory")) {
      const now = Date.now();
      if (now - lastOOMWarning > OOM_WARNING_INTERVAL) {
        lastOOMWarning = now;
        console.warn("[AgentLogStream] Redis OOM - log publishing suppressed (this warning shown at most once/min)");
      }
    } else {
      console.error("[AgentLogStream] Publish failed:", error);
    }
  }
}

/**
 * Get recent logs from buffer
 */
export async function getRecentAgentLogs(limit = 50): Promise<AgentLogEntry[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const logs = await redis.lrange(LOG_BUFFER_KEY, 0, limit - 1);
    return logs.map((log) => JSON.parse(log) as AgentLogEntry);
  } catch (error) {
    console.error("[AgentLogStream] Get logs failed:", error);
    return [];
  }
}

/**
 * Clear log buffer
 */
export async function clearAgentLogs(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(LOG_BUFFER_KEY);
  } catch (error) {
    console.error("[AgentLogStream] Clear logs failed:", error);
  }
}

/**
 * Helper to create log functions for a specific module
 * Also logs to console for Docker container visibility
 */
export function createModuleLogger(moduleName: string) {
  const consoleLog = (level: LogLevel, message: string) => {
    const timestamp = new Date().toLocaleString("tr-TR");
    const prefix = `[${timestamp}] [${moduleName}]`;
    switch (level) {
      case "info":
        console.log(`ℹ️  ${prefix} ${message}`);
        break;
      case "success":
        console.log(`✅ ${prefix} ${message}`);
        break;
      case "warn":
        console.warn(`⚠️  ${prefix} ${message}`);
        break;
      case "error":
        console.error(`❌ ${prefix} ${message}`);
        break;
      case "debug":
        console.log(`🔍 ${prefix} ${message}`);
        break;
    }
  };

  return {
    info: (message: string, data?: Record<string, unknown>) => {
      consoleLog("info", message);
      return publishAgentLog("info", message, { module: moduleName, data });
    },
    success: (message: string, data?: Record<string, unknown>) => {
      consoleLog("success", message);
      return publishAgentLog("success", message, { module: moduleName, data });
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      consoleLog("warn", message);
      return publishAgentLog("warn", message, { module: moduleName, data });
    },
    error: (message: string, data?: Record<string, unknown>) => {
      consoleLog("error", message);
      return publishAgentLog("error", message, { module: moduleName, data });
    },
    debug: (message: string, data?: Record<string, unknown>) => {
      consoleLog("debug", message);
      return publishAgentLog("debug", message, { module: moduleName, data });
    },
  };
}

export const LOG_CHANNEL_NAME = LOG_CHANNEL;
