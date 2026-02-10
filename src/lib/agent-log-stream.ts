/**
 * Agent Log Stream - Redis Pub/Sub + Colorful Console Logging
 *
 * Features:
 * - ANSI color-coded console output for Docker/terminal visibility
 * - Redis Pub/Sub for real-time admin panel streaming
 * - Module-scoped loggers with consistent formatting
 * - Throttled OOM warnings to prevent log spam
 */

import { getRedis } from "@/lib/redis";

const LOG_CHANNEL = "agent:logs";
const LOG_BUFFER_KEY = "agent:log-buffer";
const MAX_BUFFER_SIZE = 100;

let lastOOMWarning = 0;
const OOM_WARNING_INTERVAL = 60_000;

export type LogLevel = "info" | "success" | "warn" | "error" | "debug";

export interface AgentLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// ANSI COLOR CODES
// ============================================================================

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Bright foreground
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",

  // Background
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

// Module color map — each module gets a distinct color for easy scanning
const MODULE_COLORS: Record<string, string> = {
  orchestrator: c.brightMagenta,
  agent: c.brightCyan,
  rss: c.brightBlue,
  youtube: c.brightYellow,
  content: c.green,
  deepseek: c.magenta,
  image: c.cyan,
  publish: c.brightGreen,
  "content-collector": c.blue,
  "duplicate-detector": c.yellow,
  "relevance-filter": c.cyan,
  "trend-enricher": c.magenta,
  "content-enricher": c.green,
  "visual-generator": c.brightCyan,
  "database-publisher": c.brightGreen,
  seo: c.brightBlue,
  social: c.brightMagenta,
};

const LEVEL_STYLES: Record<LogLevel, { icon: string; color: string }> = {
  info: { icon: "│", color: c.dim },
  success: { icon: "✓", color: c.brightGreen },
  warn: { icon: "⚠", color: c.brightYellow },
  error: { icon: "✗", color: c.brightRed },
  debug: { icon: "·", color: c.dim },
};

// ============================================================================
// REDIS PUB/SUB
// ============================================================================

export async function publishAgentLog(
  level: LogLevel,
  message: string,
  options?: { module?: string; data?: Record<string, unknown> },
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
    await redis.publish(LOG_CHANNEL, JSON.stringify(entry));
    await redis.lpush(LOG_BUFFER_KEY, JSON.stringify(entry));
    await redis.ltrim(LOG_BUFFER_KEY, 0, MAX_BUFFER_SIZE - 1);
    await redis.expire(LOG_BUFFER_KEY, 3600);
  } catch (error) {
    const errorMsg = String(error);
    if (errorMsg.includes("OOM") || errorMsg.includes("maxmemory")) {
      const now = Date.now();
      if (now - lastOOMWarning > OOM_WARNING_INTERVAL) {
        lastOOMWarning = now;
        console.warn(
          `${c.bgRed}${c.white} OOM ${c.reset} Redis memory pressure — log publishing suppressed`,
        );
      }
    }
    // Silent fail for other errors — don't break worker for logging
  }
}

export async function getRecentAgentLogs(limit = 50): Promise<AgentLogEntry[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const logs = await redis.lrange(LOG_BUFFER_KEY, 0, limit - 1);
    return logs.map((log) => JSON.parse(log) as AgentLogEntry);
  } catch {
    return [];
  }
}

export async function clearAgentLogs(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(LOG_BUFFER_KEY);
  } catch {
    // silent
  }
}

// ============================================================================
// MODULE LOGGER — The main export
// ============================================================================

function formatTime(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * Create a color-coded logger scoped to a module name.
 *
 * Console output format:
 *   HH:MM:SS │ module-name  │ message
 *   HH:MM:SS ✓ module-name  │ success message (green)
 *   HH:MM:SS ⚠ module-name  │ warning (yellow)
 *   HH:MM:SS ✗ module-name  │ error (red)
 */
export function createModuleLogger(moduleName: string) {
  const modColor = MODULE_COLORS[moduleName] || c.white;
  const tag = moduleName.padEnd(20);

  const log = (level: LogLevel, message: string) => {
    const { icon, color } = LEVEL_STYLES[level];
    const time = `${c.dim}${formatTime()}${c.reset}`;
    const levelIcon = `${color}${icon}${c.reset}`;
    const mod = `${modColor}${c.bold}${tag}${c.reset}`;
    const msg = level === "error" ? `${c.red}${message}${c.reset}` : message;

    const line = `${time} ${levelIcon} ${mod} ${c.dim}│${c.reset} ${msg}`;

    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  };

  return {
    info: (message: string, data?: Record<string, unknown>) => {
      log("info", message);
      return publishAgentLog("info", message, { module: moduleName, data });
    },
    success: (message: string, data?: Record<string, unknown>) => {
      log("success", message);
      return publishAgentLog("success", message, { module: moduleName, data });
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      log("warn", message);
      return publishAgentLog("warn", message, { module: moduleName, data });
    },
    error: (message: string, data?: Record<string, unknown>) => {
      log("error", message);
      return publishAgentLog("error", message, { module: moduleName, data });
    },
    debug: (message: string, data?: Record<string, unknown>) => {
      log("debug", message);
      return publishAgentLog("debug", message, { module: moduleName, data });
    },
  };
}

// ============================================================================
// PIPELINE BANNER — Clean startup/completion banners
// ============================================================================

/**
 * Print a clean pipeline stage banner
 */
export function logPipelineBanner(
  stage: "start" | "complete" | "error",
  data: {
    articles?: number;
    duration?: number;
    published?: number;
    target?: number;
    logId?: string;
    error?: string;
  },
): void {
  const divider = `${c.dim}${"─".repeat(60)}${c.reset}`;

  if (stage === "start") {
    console.log("");
    console.log(divider);
    console.log(`${c.brightCyan}${c.bold}  ▶ PIPELINE STARTED${c.reset}`);
    if (data.articles)
      console.log(
        `${c.dim}    Articles: ${c.reset}${data.articles}${data.target ? `${c.dim} (target: ${data.target})${c.reset}` : ""}`,
      );
    if (data.logId)
      console.log(
        `${c.dim}    Log ID:   ${c.reset}${data.logId.substring(0, 12)}…`,
      );
    console.log(
      `${c.dim}    Flow:     Duplicate → Relevance → Trend → Enrich → Visual → Publish${c.reset}`,
    );
    console.log(divider);
    console.log("");
  } else if (stage === "complete") {
    console.log("");
    console.log(divider);
    console.log(`${c.brightGreen}${c.bold}  ✓ PIPELINE COMPLETE${c.reset}`);
    if (data.published !== undefined)
      console.log(
        `${c.dim}    Published: ${c.reset}${c.brightGreen}${data.published}${c.reset} articles`,
      );
    if (data.duration !== undefined)
      console.log(`${c.dim}    Duration:  ${c.reset}${data.duration}s`);
    console.log(divider);
    console.log("");
  } else if (stage === "error") {
    console.log("");
    console.log(divider);
    console.log(`${c.brightRed}${c.bold}  ✗ PIPELINE FAILED${c.reset}`);
    if (data.error) console.log(`${c.red}    ${data.error}${c.reset}`);
    if (data.duration !== undefined)
      console.log(`${c.dim}    Duration: ${c.reset}${data.duration}s`);
    console.log(divider);
    console.log("");
  }
}

/**
 * Print agent initialization summary
 */
export function logAgentInit(agents: string[]): void {
  const divider = `${c.dim}${"─".repeat(60)}${c.reset}`;
  console.log("");
  console.log(divider);
  console.log(`${c.brightMagenta}${c.bold}  ◆ AGENT PIPELINE${c.reset}`);
  agents.forEach((name, i) => {
    const color = MODULE_COLORS[name] || c.white;
    const arrow = i < agents.length - 1 ? `${c.dim} →${c.reset}` : "";
    console.log(
      `${c.dim}    ${i + 1}.${c.reset} ${color}${name}${c.reset}${arrow}`,
    );
  });
  console.log(divider);
  console.log("");
}

/**
 * Print a compact health summary line
 */
export function logHealthSummary(
  queues: Array<{
    name: string;
    active: number;
    waiting: number;
    completed: number;
    failed: number;
  }>,
): void {
  const parts = queues
    .filter((q) => q.active > 0 || q.waiting > 0 || q.failed > 0)
    .map((q) => {
      const status =
        q.active > 0
          ? `${c.brightGreen}●${c.reset}`
          : q.waiting > 0
            ? `${c.brightYellow}○${c.reset}`
            : `${c.dim}·${c.reset}`;
      const failed = q.failed > 0 ? ` ${c.red}${q.failed}err${c.reset}` : "";
      return `${status} ${q.name}:${q.active}a/${q.waiting}w${failed}`;
    });

  if (parts.length === 0) {
    console.log(
      `${c.dim}${formatTime()} │ health${" ".repeat(14)}│ All queues idle${c.reset}`,
    );
  } else {
    console.log(
      `${c.dim}${formatTime()}${c.reset} ${c.dim}│${c.reset} ${c.brightMagenta}${"health".padEnd(20)}${c.reset} ${c.dim}│${c.reset} ${parts.join("  ")}`,
    );
  }
}

export const LOG_CHANNEL_NAME = LOG_CHANNEL;
