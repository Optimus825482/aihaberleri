/**
 * Alerting System for News Agent Pipeline
 * FAZ 5: Monitoring ve Alerting
 *
 * Provides proactive monitoring and alerting for critical issues:
 * - Pipeline timeout (> 10 minutes)
 * - High duplicate rate (> 90%)
 * - No articles created (< 1)
 * - Agent failures
 * - Circuit breaker states
 *
 * Notification channels:
 * - Email (via Resend)
 * - Webhook
 * - Console logging
 * - Redis persistence
 */

import { getRedis } from "@/lib/redis";
import { emailService } from "@/lib/email";

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: "info" | "warning" | "error" | "critical";
  check: () => Promise<boolean>;
  action: (alert: Alert) => Promise<void>;
  cooldown: number; // milliseconds between alerts
  lastAlertTime?: number;
}

export interface Alert {
  ruleId: string;
  ruleName: string;
  severity: AlertRule["severity"];
  message: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  resolved?: boolean;
}

// Notification configuration
export interface NotificationConfig {
  enabled: boolean;
  email?: {
    enabled: boolean;
    recipients: string[];
  };
  webhook?: {
    enabled: boolean;
    url: string;
    headers?: Record<string, string>;
  };
}

const defaultNotificationConfig: NotificationConfig = {
  enabled: true,
  email: {
    enabled: !!process.env.ALERT_EMAIL_TO,
    recipients: process.env.ALERT_EMAIL_TO?.split(",") || [],
  },
  webhook: {
    enabled: !!process.env.ALERT_WEBHOOK_URL,
    url: process.env.ALERT_WEBHOOK_URL || "",
    headers: process.env.ALERT_WEBHOOK_HEADERS
      ? JSON.parse(process.env.ALERT_WEBHOOK_HEADERS)
      : undefined,
  },
};

const alertHistory: Alert[] = [];
const MAX_ALERT_HISTORY = 100;

/**
 * Check if alert is in cooldown period
 */
function isInCooldown(rule: AlertRule): boolean {
  if (!rule.lastAlertTime) return false;
  return Date.now() - rule.lastAlertTime < rule.cooldown;
}

/**
 * Add alert to history
 */
function addAlertToHistory(alert: Alert): void {
  alertHistory.push(alert);
  if (alertHistory.length > MAX_ALERT_HISTORY) {
    alertHistory.shift();
  }
}

/**
 * Get recent alerts
 */
export function getRecentAlerts(limit = 20): Alert[] {
  return alertHistory.slice(-limit).reverse();
}

/**
 * Log alert to console
 */
async function logAlert(alert: Alert): Promise<void> {
  const emoji = {
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
    critical: "🚨",
  }[alert.severity];

  console.log(`${emoji} [${alert.ruleName}] ${alert.message}`);
  console.log(`   Severity: ${alert.severity.toUpperCase()}`);
  console.log(`   Metadata:`, JSON.stringify(alert.metadata, null, 2));
}

/**
 * Store alert in Redis for persistence
 */
async function storeAlertInRedis(alert: Alert): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = `alert:${alert.ruleId}:${Date.now()}`;
    await redis.set(
      key,
      JSON.stringify(alert),
      "EX",
      7 * 24 * 60 * 60, // 7 days
    );
  } catch (error) {
    console.warn("Failed to store alert in Redis:", error);
  }
}

/**
 * Send email notification for alert
 */
async function sendEmailNotification(alert: Alert): Promise<void> {
  const config = defaultNotificationConfig;

  if (!config.email?.enabled || config.email.recipients.length === 0) {
    return;
  }

  try {
    const severityEmoji = {
      info: "ℹ️",
      warning: "⚠️",
      error: "❌",
      critical: "🚨",
    }[alert.severity];

    const subject = `${severityEmoji} [${alert.severity.toUpperCase()}] ${alert.ruleName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0;">${severityEmoji} Alert: ${alert.ruleName}</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date(alert.timestamp).toLocaleString("tr-TR")}</p>
        </div>
        <div style="padding: 20px; background: #f8f9fa; border-left: 4px solid ${
          alert.severity === "critical"
            ? "#dc3545"
            : alert.severity === "error"
              ? "#fd7e14"
              : alert.severity === "warning"
                ? "#ffc107"
                : "#17a2b8"
        };">
          <p style="font-size: 16px; margin: 0 0 10px 0;"><strong>${alert.message}</strong></p>
          <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #666;">Metadata:</h4>
            <pre style="margin: 0; font-size: 12px; overflow-x: auto;">${JSON.stringify(alert.metadata, null, 2)}</pre>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
          <p>AI Haberleri - Pipeline Alert System</p>
        </div>
      </div>
    `;

    // Send to all recipients
    for (const recipient of config.email.recipients) {
      await emailService.send({
        to: recipient.trim(),
        subject,
        html,
        tags: [
          { name: "type", value: "alert" },
          { name: "severity", value: alert.severity },
          { name: "rule", value: alert.ruleId },
        ],
      });
    }

    console.log(
      `📧 Email alert sent to ${config.email.recipients.length} recipients`,
    );
  } catch (error) {
    console.error("Failed to send email notification:", error);
  }
}

/**
 * Send webhook notification for alert
 */
async function sendWebhookNotification(alert: Alert): Promise<void> {
  const config = defaultNotificationConfig;

  if (!config.webhook?.enabled || !config.webhook.url) {
    return;
  }

  try {
    const payload = {
      alert: {
        ruleId: alert.ruleId,
        ruleName: alert.ruleName,
        severity: alert.severity,
        message: alert.message,
        metadata: alert.metadata,
        timestamp: alert.timestamp.toISOString(),
        resolved: alert.resolved || false,
      },
      source: "aihaberleri-pipeline",
      environment: process.env.NODE_ENV || "development",
    };

    const response = await fetch(config.webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config.webhook.headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Webhook returned ${response.status}: ${response.statusText}`,
      );
    }

    console.log(`🔗 Webhook alert sent to ${config.webhook.url}`);
  } catch (error) {
    console.error("Failed to send webhook notification:", error);
  }
}

/**
 * Default alert action - log, store, and notify
 */
async function defaultAlertAction(alert: Alert): Promise<void> {
  await logAlert(alert);
  await storeAlertInRedis(alert);

  // Send notifications based on severity
  if (alert.severity === "critical" || alert.severity === "error") {
    await sendEmailNotification(alert);
    await sendWebhookNotification(alert);
  } else if (alert.severity === "warning") {
    // Only send webhook for warnings to reduce email noise
    await sendWebhookNotification(alert);
  }
}

/**
 * Alert Rules Configuration
 */
const alertRules: AlertRule[] = [
  {
    id: "pipeline-timeout",
    name: "Pipeline Timeout",
    description: "Pipeline takes longer than 10 minutes to complete",
    severity: "critical",
    cooldown: 30 * 60 * 1000, // 30 minutes
    check: async () => {
      const redis = getRedis();
      if (!redis) return false;

      const startTime = await redis.get("pipeline:start-time");
      if (!startTime) return false;

      const elapsed = Date.now() - parseInt(startTime);
      return elapsed > 10 * 60 * 1000; // 10 minutes
    },
    action: async (alert) => {
      await defaultAlertAction(alert);
      // TODO: Send email notification
    },
  },
  {
    id: "high-duplicate-rate",
    name: "High Duplicate Rate",
    description: "Duplicate rate exceeds 90%",
    severity: "warning",
    cooldown: 60 * 60 * 1000, // 1 hour
    check: async () => {
      const redis = getRedis();
      if (!redis) return false;

      const duplicateRate = await redis.get("pipeline:duplicate-rate");
      if (!duplicateRate) return false;

      return parseFloat(duplicateRate) > 90;
    },
    action: async (alert) => {
      await defaultAlertAction(alert);
    },
  },
  {
    id: "no-articles-created",
    name: "No Articles Created",
    description: "Agent completed but no articles were created",
    severity: "warning",
    cooldown: 6 * 60 * 60 * 1000, // 6 hours
    check: async () => {
      const redis = getRedis();
      if (!redis) return false;

      const lastRun = await redis.get("agent:last-run");
      if (!lastRun) return false;

      const data = JSON.parse(lastRun);
      return data.articlesCreated === 0;
    },
    action: async (alert) => {
      await defaultAlertAction(alert);
    },
  },
  {
    id: "agent-failure",
    name: "Agent Failure",
    description: "An agent has failed multiple times",
    severity: "error",
    cooldown: 15 * 60 * 1000, // 15 minutes
    check: async () => {
      const redis = getRedis();
      if (!redis) return false;

      const keys = await redis.keys("agent:health:status:*");
      for (const key of keys) {
        const data = await redis.get(key);
        if (!data) continue;

        const status = JSON.parse(data);
        if (status.consecutiveFailures >= 3) {
          return true;
        }
      }
      return false;
    },
    action: async (alert) => {
      await defaultAlertAction(alert);
    },
  },
  {
    id: "circuit-breaker-open",
    name: "Circuit Breaker Open",
    description: "DeepSeek API circuit breaker is open",
    severity: "critical",
    cooldown: 10 * 60 * 1000, // 10 minutes
    check: async () => {
      const { getCircuitBreakerState } = await import("@/lib/deepseek");
      const state = getCircuitBreakerState();
      return state.nvidia === "OPEN" && state.deepseek === "OPEN";
    },
    action: async (alert) => {
      await defaultAlertAction(alert);
      // TODO: Send immediate notification
    },
  },
];

/**
 * Check all alert rules and trigger actions if needed
 */
export async function checkAlerts(): Promise<Alert[]> {
  const triggeredAlerts: Alert[] = [];

  for (const rule of alertRules) {
    try {
      // Skip if in cooldown
      if (isInCooldown(rule)) continue;

      // Check if rule is triggered
      const isTriggered = await rule.check();
      if (!isTriggered) continue;

      // Create alert
      const alert: Alert = {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: rule.description,
        metadata: {
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      };

      // Execute action
      await rule.action(alert);
      addAlertToHistory(alert);

      // Update last alert time
      rule.lastAlertTime = Date.now();

      triggeredAlerts.push(alert);
    } catch (error) {
      console.error(`Error checking alert rule ${rule.id}:`, error);
    }
  }

  return triggeredAlerts;
}

/**
 * Manually trigger an alert
 */
export async function triggerAlert(
  ruleId: string,
  message: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const rule = alertRules.find((r) => r.id === ruleId);
  if (!rule) {
    throw new Error(`Alert rule not found: ${ruleId}`);
  }

  const alert: Alert = {
    ruleId,
    ruleName: rule.name,
    severity: rule.severity,
    message,
    metadata,
    timestamp: new Date(),
  };

  await rule.action(alert);
  addAlertToHistory(alert);
}

/**
 * Get alert rule status
 */
export function getAlertRuleStatus(): Array<{
  id: string;
  name: string;
  description: string;
  severity: string;
  lastTriggered?: number;
  inCooldown: boolean;
}> {
  return alertRules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    severity: rule.severity,
    lastTriggered: rule.lastAlertTime,
    inCooldown: isInCooldown(rule),
  }));
}

export default {
  checkAlerts,
  triggerAlert,
  getRecentAlerts,
  getAlertRuleStatus,
};
