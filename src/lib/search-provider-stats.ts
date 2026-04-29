/**
 * Search Provider Stats Collector
 *
 * Persists provider stats periodically via cron/background worker.
 */

import { db } from "@/lib/db";
import { getProviderStats } from "@/lib/hybrid-search";
import { getGoogleNewsStats } from "@/lib/google-news-search";

export async function saveProviderStats(): Promise<void> {
  try {
    console.log("Search provider stats kaydediliyor...");

    const stats = getProviderStats();
    const googleNewsStats = getGoogleNewsStats();
    const timestamp = new Date();

    const records = [
      {
        provider: "brave",
        timestamp,
        requests: stats.brave.requests,
        errors: stats.brave.errors,
        available: stats.brave.available,
        avgResponseTime: null,
      },
      {
        provider: "tavily",
        timestamp,
        requests: stats.tavily.requests,
        errors: stats.tavily.errors,
        available: stats.tavily.available,
        avgResponseTime: null,
      },
      {
        provider: "google-news",
        timestamp,
        requests: googleNewsStats.requests,
        errors: googleNewsStats.errors + (googleNewsStats.timeouts || 0),
        available: googleNewsStats.available,
        avgResponseTime: googleNewsStats.avgLatencyMs,
      },
    ];

    await db.searchProviderMetric.createMany({ data: records });

    console.log("Search provider stats kaydedildi", {
      brave: `${stats.brave.requests} requests, ${stats.brave.errors} errors`,
      tavily: `${stats.tavily.requests} requests, ${stats.tavily.errors} errors`,
      googleNews: `${googleNewsStats.requests} requests, ${googleNewsStats.successes} success, ${googleNewsStats.timeouts} timeout, ${googleNewsStats.fallbacks} fallback`,
    });
  } catch (error) {
    console.error("Search provider stats kaydetme hatasi:", error);
    throw error;
  }
}

export async function cleanupOldMetrics(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await db.searchProviderMetric.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`${result.count} eski metric kaydi temizlendi`);
  } catch (error) {
    console.error("Metric temizleme hatasi:", error);
    throw error;
  }
}

export async function resetProviderStats(): Promise<void> {
  try {
    console.warn("Provider stats sifirlaniyor (SADECE TEST ICIN)");
    await db.searchProviderMetric.deleteMany({});
    console.log("Tum provider stats silindi");
  } catch (error) {
    console.error("Stats sifirlama hatasi:", error);
    throw error;
  }
}

export async function cronSaveProviderStats(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await saveProviderStats();
    return {
      success: true,
      message: "Provider stats basariyla kaydedildi",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: `Provider stats kaydetme hatasi: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default {
  saveProviderStats,
  cleanupOldMetrics,
  resetProviderStats,
  cronSaveProviderStats,
};
