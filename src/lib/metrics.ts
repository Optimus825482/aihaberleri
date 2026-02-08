/**
 * Metrics Collection for News Agent Pipeline
 * Collects and exports metrics in Prometheus format
 */

import { getRedis } from "@/lib/redis";

interface Metric {
  name: string;
  type: "counter" | "gauge" | "histogram";
  help: string;
  value: number;
  labels?: Record<string, string>;
}

const metrics: Map<string, Metric> = new Map();

/**
 * Increment a counter metric
 */
export function incrementCounter(
  name: string,
  value = 1,
  labels?: Record<string, string>,
): void {
  const key = getMetricKey(name, labels);
  const existing = metrics.get(key);

  if (existing) {
    existing.value += value;
  } else {
    metrics.set(key, {
      name,
      type: "counter",
      help: `${name} counter`,
      value,
      labels,
    });
  }

  // Also persist to Redis
  persistMetricToRedis(key, "counter", value, labels);
}

/**
 * Set a gauge metric
 */
export function setGauge(
  name: string,
  value: number,
  labels?: Record<string, string>,
): void {
  const key = getMetricKey(name, labels);
  metrics.set(key, {
    name,
    type: "gauge",
    help: `${name} gauge`,
    value,
    labels,
  });

  // Also persist to Redis
  persistMetricToRedis(key, "gauge", value, labels);
}

/**
 * Record a timing histogram
 */
export function recordTiming(
  name: string,
  valueMs: number,
  labels?: Record<string, string>,
): void {
  const counterKey = getMetricKey(`${name}_ms`, labels);
  const sumKey = getMetricKey(`${name}_sum_ms`, labels);
  const countKey = getMetricKey(`${name}_count`, labels);

  // Update histogram
  incrementCounter(name, valueMs, { ...labels, operation: "duration" });
  incrementCounter(name, 1, { ...labels, operation: "count" });

  // Persist to Redis
  persistMetricToRedis(counterKey, "histogram", valueMs, labels);
}

/**
 * Get metric key with labels
 */
function getMetricKey(name: string, labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) {
    return name;
  }
  const labelStr = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(",");
  return `${name}{${labelStr}}`;
}

/**
 * Persist metric to Redis
 */
async function persistMetricToRedis(
  key: string,
  type: string,
  value: number,
  labels?: Record<string, string>,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const redisKey = `metric:${key}`;
    const existing = await redis.get(redisKey);

    let newValue = value;
    if (existing) {
      const data = JSON.parse(existing);
      if (data.type === "counter" || data.type === "histogram") {
        newValue = data.value + value;
      } else {
        newValue = value;
      }
    }

    await redis.set(
      redisKey,
      JSON.stringify({ type, value: newValue, labels, updatedAt: Date.now() }),
      "EX",
      24 * 60 * 60, // 24 hours
    );
  } catch (error) {
    // Silently fail - metrics shouldn't break the app
  }
}

/**
 * Format metrics in Prometheus format
 */
export function formatPrometheusMetrics(): string {
  const lines: string[] = [];
  const processedNames = new Set<string>();

  for (const [key, metric] of metrics.entries()) {
    const name = metric.name.replace(/[^a-zA-Z0-9_]/g, "_");

    // Add help and type only once per metric name
    if (!processedNames.has(name)) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.type}`);
      processedNames.add(name);
    }

    // Format metric value with labels
    let metricLine = name;
    if (metric.labels && Object.keys(metric.labels).length > 0) {
      const labelStr = Object.entries(metric.labels)
        .map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`)
        .join(",");
      metricLine += `{${labelStr}}`;
    }
    metricLine += ` ${metric.value}`;

    lines.push(metricLine);
  }

  return lines.join("\n");
}

/**
 * Get metrics as JSON
 */
export function getMetricsAsJson(): Record<string, Metric[]> {
  const grouped: Record<string, Metric[]> = {};

  for (const [, metric] of metrics) {
    if (!grouped[metric.name]) {
      grouped[metric.name] = [];
    }
    grouped[metric.name].push(metric);
  }

  return grouped;
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  metrics.clear();
}

/**
 * Load metrics from Redis
 */
export async function loadMetricsFromRedis(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const keys = await redis.keys("metric:*");

    for (const key of keys) {
      const data = await redis.get(key);
      if (!data) continue;

      const parsed = JSON.parse(data);
      const metricName = key.replace("metric:", "");

      metrics.set(metricName, {
        name: metricName,
        type: parsed.type,
        help: `${metricName} ${parsed.type}`,
        value: parsed.value,
        labels: parsed.labels,
      });
    }

    console.log(`📊 Loaded ${keys.length} metrics from Redis`);
  } catch (error) {
    console.warn("Failed to load metrics from Redis:", error);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON METRICS
// ============================================================================

export const Metrics = {
  // Agent execution
  agentExecution: (durationMs: number, articlesCreated: number) => {
    recordTiming("agent_execution_duration_ms", durationMs);
    setGauge("agent_articles_created", articlesCreated);
    incrementCounter("agent_total_runs");
  },

  // API calls
  apiCall: (api: string, success: boolean, durationMs: number) => {
    incrementCounter("api_calls_total", 1, { api, status: success ? "success" : "error" });
    recordTiming("api_call_duration_ms", durationMs, { api });
  },

  // Pipeline
  pipelineStage: (stage: string, durationMs: number) => {
    recordTiming("pipeline_stage_duration_ms", durationMs, { stage });
    incrementCounter("pipeline_stage_total", 1, { stage });
  },

  // Articles
  articleCreated: (category: string, score: number) => {
    incrementCounter("article_created_total", 1, { category });
    setGauge("article_latest_score", score, { category });
  },

  articleDuplicate: (reason: string) => {
    incrementCounter("article_duplicate_total", 1, { reason });
  },

  // Queue
  queueDepth: (queueName: string, depth: number) => {
    setGauge("queue_depth", depth, { queue: queueName });
  },

  // Errors
  error: (type: string, message: string) => {
    incrementCounter("error_total", 1, { type });
  },

  // Cache
  cacheHit: (cacheName: string) => {
    incrementCounter("cache_hit_total", 1, { cache: cacheName });
  },

  cacheMiss: (cacheName: string) => {
    incrementCounter("cache_miss_total", 1, { cache: cacheName });
  },
};

export default {
  incrementCounter,
  setGauge,
  recordTiming,
  formatPrometheusMetrics,
  getMetricsAsJson,
  clearMetrics,
  loadMetricsFromRedis,
  Metrics,
};
