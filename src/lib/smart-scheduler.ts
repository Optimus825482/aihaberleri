/**
 * Smart Scheduler - Turkey Time Zone Aware Scheduling
 *
 * Adjusts news pipeline interval based on:
 * 1. Turkey peak hours (UTC+3)
 * 2. Breaking news mode (5 min interval)
 * 3. Database configurable settings
 *
 * Interval Schedule (Optimized for freshness):
 * - Morning: 08:00-10:00 → 8 min (peak)
 * - Lunch: 12:00-14:00 → 8 min (peak)
 * - Evening: 18:00-22:00 → 8 min (peak)
 * - Night: 00:00-07:00 → 10 min (consistent)
 * - Normal: other times → 10 min
 *
 * NOTE: No slowdown on weekends/holidays - consistent 10 min
 */

import { db } from "@/lib/db";
import { getRedis } from "@/lib/redis";
import { createModuleLogger } from "@/lib/agent-log-stream";

const logger = createModuleLogger("smart-scheduler");

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ScheduleInfo {
  interval: number; // minutes
  reason: string;
  nextRun: Date;
  turkeyTime: string;
  timeSlot: TimeSlot;
  isBreakingNews: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
}

export interface SchedulerConfig {
  enabled: boolean;
  breakingNewsMode: boolean;
  breakingNewsInterval: number;
  peakMorningInterval: number;
  peakLunchInterval: number;
  peakEveningInterval: number;
  nightInterval: number;
  normalInterval: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
}

export type TimeSlot =
  | "PEAK_MORNING"
  | "PEAK_LUNCH"
  | "PEAK_EVENING"
  | "NIGHT"
  | "NORMAL";

// ============================================================================
// CONSTANTS
// ============================================================================

const TURKEY_TIMEZONE = "Europe/Istanbul"; // UTC+3

// Default intervals (in minutes)
// UPDATED 2026-02-10: Intervals tightened to guarantee 1 article per 15 min
const DEFAULT_CONFIG: SchedulerConfig = {
  enabled: true,
  breakingNewsMode: false,
  breakingNewsInterval: 5,
  peakMorningInterval: 7, // 8 → 7 dakika (peak saatlerde daha sık)
  peakLunchInterval: 7, // 8 → 7 dakika
  peakEveningInterval: 7, // 8 → 7 dakika
  nightInterval: 10, // Gece sabit 10 dakika
  normalInterval: 8, // 10 → 8 dakika (normal saatlerde de sıklaştı)
  weekendMultiplier: 1.0, // No slowdown on weekends
  holidayMultiplier: 1.0, // No slowdown on holidays
};

// Turkish public holidays (month-day format)
// These are fixed holidays, bayram dates need to be updated yearly
const TURKISH_HOLIDAYS_2026 = [
  "01-01", // New Year
  "04-23", // National Sovereignty and Children's Day
  "05-01", // Labor Day
  "05-19", // Atatürk Commemoration & Youth Day
  "07-15", // Democracy and National Unity Day
  "08-30", // Victory Day
  "10-29", // Republic Day
  // Ramazan Bayramı 2026 (estimated: March 20-22)
  "03-20",
  "03-21",
  "03-22",
  // Kurban Bayramı 2026 (estimated: May 27-30)
  "05-27",
  "05-28",
  "05-29",
  "05-30",
];

// Redis keys
const REDIS_KEYS = {
  BREAKING_NEWS: "scheduler:breaking-news",
  LAST_RUN: "scheduler:last-run",
  SCHEDULE_INFO: "scheduler:info",
  CONFIG_CACHE: "scheduler:config",
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get current time in Turkey timezone
 */
export function getTurkeyTime(): Date {
  const now = new Date();
  const turkeyTimeStr = now.toLocaleString("en-US", {
    timeZone: TURKEY_TIMEZONE,
  });
  return new Date(turkeyTimeStr);
}

/**
 * Format Turkey time as HH:mm string
 */
export function formatTurkeyTime(date?: Date): string {
  const d = date || getTurkeyTime();
  return d.toLocaleTimeString("tr-TR", {
    timeZone: TURKEY_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Get Turkey date as YYYY-MM-DD
 */
export function getTurkeyDate(): string {
  const now = new Date();
  return now.toLocaleDateString("en-CA", {
    timeZone: TURKEY_TIMEZONE,
  });
}

/**
 * Detect current time slot based on Turkey time
 */
export function detectTimeSlot(turkeyTime?: Date): TimeSlot {
  const time = turkeyTime || getTurkeyTime();
  const hour = time.getHours();

  // Peak Morning: 08:00-10:00
  if (hour >= 8 && hour < 10) {
    return "PEAK_MORNING";
  }

  // Peak Lunch: 12:00-14:00
  if (hour >= 12 && hour < 14) {
    return "PEAK_LUNCH";
  }

  // Peak Evening: 18:00-22:00
  if (hour >= 18 && hour < 22) {
    return "PEAK_EVENING";
  }

  // Night: 00:00-07:00
  if (hour >= 0 && hour < 7) {
    return "NIGHT";
  }

  // Normal: all other times
  return "NORMAL";
}

/**
 * Check if today is weekend in Turkey
 */
export function isWeekend(turkeyTime?: Date): boolean {
  const time = turkeyTime || getTurkeyTime();
  const day = time.getDay();
  // Saturday (6) or Sunday (0)
  return day === 0 || day === 6;
}

/**
 * Check if today is a Turkish holiday
 */
export function isHoliday(turkeyTime?: Date): boolean {
  const time = turkeyTime || getTurkeyTime();
  const monthDay = `${String(time.getMonth() + 1).padStart(2, "0")}-${String(time.getDate()).padStart(2, "0")}`;
  return TURKISH_HOLIDAYS_2026.includes(monthDay);
}

/**
 * Load scheduler config from database
 */
export async function loadConfig(): Promise<SchedulerConfig> {
  try {
    // Try to get from cache first
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(REDIS_KEYS.CONFIG_CACHE);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Load from database
    const settings = await db.setting.findMany({
      where: {
        key: {
          startsWith: "scheduler.",
        },
      },
    });

    const config: SchedulerConfig = { ...DEFAULT_CONFIG };

    for (const setting of settings) {
      const key = setting.key.replace(
        "scheduler.",
        "",
      ) as keyof SchedulerConfig;
      if (key in config) {
        const value = setting.value;
        if (typeof config[key] === "boolean") {
          (config as any)[key] = value === "true";
        } else if (typeof config[key] === "number") {
          (config as any)[key] = parseFloat(value);
        } else {
          (config as any)[key] = value;
        }
      }
    }

    // Cache for 5 minutes
    if (redis) {
      await redis.set(
        REDIS_KEYS.CONFIG_CACHE,
        JSON.stringify(config),
        "EX",
        300,
      );
    }

    return config;
  } catch (error) {
    logger.error("Failed to load scheduler config:", { error: String(error) });
    return DEFAULT_CONFIG;
  }
}

/**
 * Check if breaking news mode is active
 */
export async function isBreakingNewsMode(): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) {
      return false;
    }

    const value = await redis.get(REDIS_KEYS.BREAKING_NEWS);
    return value === "true";
  } catch (error) {
    logger.error("Failed to check breaking news mode:", {
      error: String(error),
    });
    return false;
  }
}

/**
 * Enable/disable breaking news mode
 * Breaking news mode stays active for specified duration (default: 1 hour)
 */
export async function setBreakingNewsMode(
  enabled: boolean,
  durationMinutes: number = 60,
): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) {
      return false;
    }

    if (enabled) {
      await redis.set(
        REDIS_KEYS.BREAKING_NEWS,
        "true",
        "EX",
        durationMinutes * 60,
      );
      logger.info(
        `🚨 Breaking news mode ENABLED for ${durationMinutes} minutes`,
      );
    } else {
      await redis.del(REDIS_KEYS.BREAKING_NEWS);
      logger.info("📰 Breaking news mode DISABLED");
    }

    // Clear schedule cache to force recalculation
    await redis.del(REDIS_KEYS.SCHEDULE_INFO);

    return true;
  } catch (error) {
    logger.error("Failed to set breaking news mode:", { error: String(error) });
    return false;
  }
}

/**
 * Get optimal interval based on current conditions
 * Main function - returns interval in minutes
 */
export async function getOptimalInterval(): Promise<number> {
  const config = await loadConfig();

  // Check if scheduler is enabled
  if (!config.enabled) {
    return config.normalInterval;
  }

  // Check breaking news mode first (highest priority)
  const breakingNews = await isBreakingNewsMode();
  if (breakingNews) {
    return config.breakingNewsInterval;
  }

  // ── ADMIN PANEL OVERRIDE ──────────────────────────────────────────────────
  // agent.intervalHours (admin paneli ayarı) varsa time-slot hesabını geçersiz kıl.
  // Bu sayede admin panelinden "6 dk" yazılırsa gerçekten 6 dk kullanılır.
  const agentIntervalSetting = await db.setting.findUnique({
    where: { key: "agent.intervalHours" },
  });
  if (agentIntervalSetting) {
    const adminMinutes = parseFloat(agentIntervalSetting.value) * 60;
    if (!isNaN(adminMinutes) && adminMinutes >= 5 && adminMinutes <= 120) {
      logger.debug(
        `⚙️ Admin panel override: ${adminMinutes} dk (agent.intervalHours=${agentIntervalSetting.value}h)`,
      );
      return Math.round(adminMinutes);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Get Turkey time and detect slot
  const turkeyTime = getTurkeyTime();
  const timeSlot = detectTimeSlot(turkeyTime);

  // Get base interval for time slot
  let interval: number;
  switch (timeSlot) {
    case "PEAK_MORNING":
      interval = config.peakMorningInterval;
      break;
    case "PEAK_LUNCH":
      interval = config.peakLunchInterval;
      break;
    case "PEAK_EVENING":
      interval = config.peakEveningInterval;
      break;
    case "NIGHT":
      interval = config.nightInterval;
      break;
    case "NORMAL":
    default:
      interval = config.normalInterval;
      break;
  }

  // Apply weekend multiplier
  if (isWeekend(turkeyTime)) {
    interval = Math.round(interval * config.weekendMultiplier);
  }

  // Apply holiday multiplier (stacks with weekend)
  if (isHoliday(turkeyTime)) {
    interval = Math.round(interval * config.holidayMultiplier);
  }

  // Ensure minimum 5 minutes, maximum 120 minutes
  return Math.max(5, Math.min(120, interval));
}

/**
 * Calculate next run time based on optimal interval
 */
export async function getNextRunTime(): Promise<Date> {
  const intervalMinutes = await getOptimalInterval();
  const nextRun = new Date(Date.now() + intervalMinutes * 60 * 1000);
  return nextRun;
}

/**
 * Get comprehensive schedule info
 * Useful for logging and dashboard display
 */
export async function getScheduleInfo(): Promise<ScheduleInfo> {
  const turkeyTime = getTurkeyTime();
  const timeSlot = detectTimeSlot(turkeyTime);
  const breakingNews = await isBreakingNewsMode();
  const weekend = isWeekend(turkeyTime);
  const holiday = isHoliday(turkeyTime);
  const interval = await getOptimalInterval();
  const nextRun = new Date(Date.now() + interval * 60 * 1000);

  // Build reason string
  let reason = `Time slot: ${timeSlot}`;
  if (breakingNews) {
    reason = "🚨 BREAKING NEWS MODE";
  } else if (holiday) {
    reason += " + Holiday";
  } else if (weekend) {
    reason += " + Weekend";
  }

  const info: ScheduleInfo = {
    interval,
    reason,
    nextRun,
    turkeyTime: formatTurkeyTime(turkeyTime),
    timeSlot,
    isBreakingNews: breakingNews,
    isWeekend: weekend,
    isHoliday: holiday,
  };

  // Cache schedule info in Redis
  try {
    const redis = getRedis();
    if (redis) {
      await redis.set(REDIS_KEYS.SCHEDULE_INFO, JSON.stringify(info), "EX", 60);
    }
  } catch {
    // Ignore cache errors
  }

  return info;
}

/**
 * Record last run time
 */
export async function recordLastRun(): Promise<void> {
  try {
    const redis = getRedis();
    if (redis) {
      await redis.set(REDIS_KEYS.LAST_RUN, Date.now().toString());
    }
  } catch (error) {
    logger.error("Failed to record last run:", { error: String(error) });
  }
}

/**
 * Get last run timestamp
 */
export async function getLastRun(): Promise<Date | null> {
  try {
    const redis = getRedis();
    if (!redis) {
      return null;
    }

    const timestamp = await redis.get(REDIS_KEYS.LAST_RUN);
    return timestamp ? new Date(parseInt(timestamp, 10)) : null;
  } catch {
    return null;
  }
}

/**
 * Check if it's time to run based on last run and optimal interval
 */
export async function shouldRunNow(): Promise<boolean> {
  const lastRun = await getLastRun();
  if (!lastRun) {
    return true; // No previous run, should run
  }

  const interval = await getOptimalInterval();
  const intervalMs = interval * 60 * 1000;
  const elapsed = Date.now() - lastRun.getTime();

  return elapsed >= intervalMs;
}

// ============================================================================
// DYNAMIC SCHEDULING UTILITIES
// ============================================================================

/**
 * Create a dynamic scheduler that adjusts interval on each run
 * Returns a cleanup function to stop the scheduler
 */
export function createDynamicScheduler(
  callback: () => Promise<void>,
  options: {
    immediate?: boolean;
    onScheduleChange?: (info: ScheduleInfo) => void;
  } = {},
): { stop: () => void; getStatus: () => Promise<ScheduleInfo> } {
  let timeoutId: NodeJS.Timeout | null = null;
  let isRunning = true;
  let currentInterval = 15; // Default

  const scheduleNext = async () => {
    if (!isRunning) return;

    const info = await getScheduleInfo();
    currentInterval = info.interval;

    if (options.onScheduleChange) {
      options.onScheduleChange(info);
    }

    logger.info(
      `📅 Next run in ${info.interval} min | Reason: ${info.reason} | Turkey: ${info.turkeyTime}`,
    );

    timeoutId = setTimeout(
      async () => {
        if (!isRunning) return;

        try {
          await recordLastRun();
          await callback();
        } catch (error) {
          logger.error("Scheduled callback failed:", { error: String(error) });
        }

        // Schedule next run with potentially different interval
        await scheduleNext();
      },
      info.interval * 60 * 1000,
    );
  };

  // Start scheduling
  (async () => {
    if (options.immediate) {
      try {
        await recordLastRun();
        await callback();
      } catch (error) {
        logger.error("Immediate callback failed:", { error: String(error) });
      }
    }
    await scheduleNext();
  })();

  return {
    stop: () => {
      isRunning = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      logger.info("Dynamic scheduler stopped");
    },
    getStatus: getScheduleInfo,
  };
}

// ============================================================================
// ADMIN API HELPERS
// ============================================================================

/**
 * Update scheduler setting in database
 */
export async function updateSchedulerSetting(
  key: keyof SchedulerConfig,
  value: string | number | boolean,
): Promise<void> {
  const fullKey = `scheduler.${key}`;

  await db.setting.upsert({
    where: { key: fullKey },
    create: {
      key: fullKey,
      value: String(value),
    },
    update: {
      value: String(value),
    },
  });

  // Clear config cache
  const redis = getRedis();
  if (redis) {
    await redis.del(REDIS_KEYS.CONFIG_CACHE);
  }

  logger.info(`Scheduler setting updated: ${key} = ${value}`);
}

/**
 * Get all scheduler settings for admin panel
 */
export async function getSchedulerSettings(): Promise<{
  config: SchedulerConfig;
  status: ScheduleInfo;
  lastRun: Date | null;
}> {
  const [config, status, lastRun] = await Promise.all([
    loadConfig(),
    getScheduleInfo(),
    getLastRun(),
  ]);

  return { config, status, lastRun };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Core functions
  getOptimalInterval,
  getNextRunTime,
  getScheduleInfo,

  // Breaking news
  isBreakingNewsMode,
  setBreakingNewsMode,

  // Time utilities
  getTurkeyTime,
  formatTurkeyTime,
  detectTimeSlot,
  isWeekend,
  isHoliday,

  // Scheduling
  createDynamicScheduler,
  shouldRunNow,
  recordLastRun,
  getLastRun,

  // Admin
  loadConfig,
  updateSchedulerSetting,
  getSchedulerSettings,
};
