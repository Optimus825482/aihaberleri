/**
 * Tavily Credit Monitoring System
 *
 * Tracks credit usage across all Tavily features and provides alerts.
 * Helps stay within monthly budget (1000 credits).
 */

import { prisma } from "@/lib/prisma";

export type TavilyFeature = "search" | "extract" | "crawl" | "map" | "research";

export interface CreditUsage {
  feature: TavilyFeature;
  credits: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UsageStats {
  totalCredits: number;
  byFeature: Record<TavilyFeature, number>;
  dailyAverage: number;
  projectedMonthly: number;
  remainingBudget: number;
  percentUsed: number;
}

const MONTHLY_BUDGET = 1000;
const ALERT_THRESHOLD = 0.8; // 80%

/**
 * Track credit usage for a Tavily feature
 *
 * @param feature - Tavily feature used
 * @param credits - Number of credits consumed
 * @param metadata - Additional metadata (optional)
 *
 * @example
 * ```typescript
 * await trackCreditUsage("extract", 10, {
 *   urls: 10,
 *   articleId: "123"
 * });
 * ```
 */
export async function trackCreditUsage(
  feature: TavilyFeature,
  credits: number,
  metadata?: Record<string, any>,
): Promise<void> {
  try {
    // Store in database
    await prisma.tavilyUsage.create({
      data: {
        feature,
        credits,
        timestamp: new Date(),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Check if alert needed
    const monthlyTotal = await getMonthlyUsage();
    const percentUsed = (monthlyTotal.totalCredits / MONTHLY_BUDGET) * 100;

    if (percentUsed >= ALERT_THRESHOLD * 100) {
      console.warn(
        `⚠️ Tavily credit usage: ${percentUsed.toFixed(1)}% (${monthlyTotal.totalCredits}/${MONTHLY_BUDGET} credits)`,
      );

      // TODO: Send alert via email/Slack
      // await sendAlert({
      //   type: "credit_warning",
      //   message: `Tavily credit usage at ${percentUsed.toFixed(1)}%`,
      //   usage: monthlyTotal,
      // });
    }
  } catch (error) {
    console.error("Failed to track Tavily credit usage:", error);
    // Don't throw - tracking failure shouldn't break the main flow
  }
}

/**
 * Get current month's credit usage
 *
 * @returns Usage statistics for current month
 */
export async function getMonthlyUsage(): Promise<UsageStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const usageRecords = await prisma.tavilyUsage.findMany({
    where: {
      timestamp: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  // Calculate total credits
  const totalCredits = usageRecords.reduce(
    (sum, record) => sum + record.credits,
    0,
  );

  // Calculate by feature
  const byFeature: Record<TavilyFeature, number> = {
    search: 0,
    extract: 0,
    crawl: 0,
    map: 0,
    research: 0,
  };

  for (const record of usageRecords) {
    byFeature[record.feature as TavilyFeature] += record.credits;
  }

  // Calculate daily average
  const daysInMonth = endOfMonth.getDate();
  const currentDay = now.getDate();
  const dailyAverage = currentDay > 0 ? totalCredits / currentDay : 0;

  // Project monthly usage
  const projectedMonthly = dailyAverage * daysInMonth;

  // Calculate remaining budget
  const remainingBudget = MONTHLY_BUDGET - totalCredits;

  // Calculate percent used
  const percentUsed = (totalCredits / MONTHLY_BUDGET) * 100;

  return {
    totalCredits,
    byFeature,
    dailyAverage,
    projectedMonthly,
    remainingBudget,
    percentUsed,
  };
}

/**
 * Get usage statistics for a specific date range
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Usage statistics for date range
 */
export async function getUsageByDateRange(
  startDate: Date,
  endDate: Date,
): Promise<UsageStats> {
  const usageRecords = await prisma.tavilyUsage.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalCredits = usageRecords.reduce(
    (sum, record) => sum + record.credits,
    0,
  );

  const byFeature: Record<TavilyFeature, number> = {
    search: 0,
    extract: 0,
    crawl: 0,
    map: 0,
    research: 0,
  };

  for (const record of usageRecords) {
    byFeature[record.feature as TavilyFeature] += record.credits;
  }

  const days = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dailyAverage = days > 0 ? totalCredits / days : 0;

  return {
    totalCredits,
    byFeature,
    dailyAverage,
    projectedMonthly: dailyAverage * 30,
    remainingBudget: MONTHLY_BUDGET - totalCredits,
    percentUsed: (totalCredits / MONTHLY_BUDGET) * 100,
  };
}

/**
 * Get daily usage breakdown for current month
 *
 * @returns Array of daily usage records
 */
export async function getDailyUsageBreakdown(): Promise<
  Array<{
    date: string;
    credits: number;
    byFeature: Record<TavilyFeature, number>;
  }>
> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const usageRecords = await prisma.tavilyUsage.findMany({
    where: {
      timestamp: {
        gte: startOfMonth,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  // Group by date
  const dailyMap = new Map<
    string,
    { credits: number; byFeature: Record<TavilyFeature, number> }
  >();

  for (const record of usageRecords) {
    const dateKey = record.timestamp.toISOString().split("T")[0];

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        credits: 0,
        byFeature: {
          search: 0,
          extract: 0,
          crawl: 0,
          map: 0,
          research: 0,
        },
      });
    }

    const daily = dailyMap.get(dateKey)!;
    daily.credits += record.credits;
    daily.byFeature[record.feature as TavilyFeature] += record.credits;
  }

  // Convert to array
  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));
}

/**
 * Check if there's enough budget for an operation
 *
 * @param estimatedCredits - Estimated credits needed
 * @returns True if within budget, false otherwise
 */
export async function checkBudget(estimatedCredits: number): Promise<boolean> {
  const monthlyUsage = await getMonthlyUsage();
  const wouldExceedBudget =
    monthlyUsage.totalCredits + estimatedCredits > MONTHLY_BUDGET;

  if (wouldExceedBudget) {
    console.warn(
      `⚠️ Operation would exceed budget: ${monthlyUsage.totalCredits + estimatedCredits}/${MONTHLY_BUDGET} credits`,
    );
  }

  return !wouldExceedBudget;
}

/**
 * Get usage summary for dashboard
 *
 * @returns Formatted usage summary
 */
export async function getUsageSummary(): Promise<{
  current: UsageStats;
  daily: Array<{ date: string; credits: number }>;
  alerts: string[];
}> {
  const current = await getMonthlyUsage();
  const daily = await getDailyUsageBreakdown();

  const alerts: string[] = [];

  // Check for alerts
  if (current.percentUsed >= 90) {
    alerts.push(
      `🚨 Critical: ${current.percentUsed.toFixed(1)}% of monthly budget used`,
    );
  } else if (current.percentUsed >= 80) {
    alerts.push(
      `⚠️ Warning: ${current.percentUsed.toFixed(1)}% of monthly budget used`,
    );
  }

  if (current.projectedMonthly > MONTHLY_BUDGET) {
    alerts.push(
      `📊 Projected monthly usage (${Math.round(current.projectedMonthly)} credits) exceeds budget`,
    );
  }

  return {
    current,
    daily: daily.map((d) => ({ date: d.date, credits: d.credits })),
    alerts,
  };
}

/**
 * Reset monthly usage (for testing)
 * WARNING: This deletes all usage records for current month
 */
export async function resetMonthlyUsage(): Promise<void> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.tavilyUsage.deleteMany({
    where: {
      timestamp: {
        gte: startOfMonth,
      },
    },
  });

  console.log("✅ Monthly usage reset");
}

export default {
  trackCreditUsage,
  getMonthlyUsage,
  getUsageByDateRange,
  getDailyUsageBreakdown,
  checkBudget,
  getUsageSummary,
  resetMonthlyUsage,
};
