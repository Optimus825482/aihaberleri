/**
 * Agent Health Dashboard API
 * Returns detailed health status of all agents in the multi-agent pipeline
 */

import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { db } from "@/lib/db";
import {
  getAllAgentHealthStatuses,
  type AgentHealthStatus,
} from "@/services/multi-agent-pipeline.service";
import { getRecentAlerts, getAlertRuleStatus } from "@/lib/alerting";

export const dynamic = "force-dynamic";

interface AgentHealthDashboard {
  timestamp: string;
  agents: AgentHealthInfo[];
  queues: QueueHealthInfo[];
  recentExecutions: ExecutionInfo[];
  alerts: AlertInfo[];
  alertRules: AlertRuleInfo[];
  systemMetrics: SystemMetrics;
}

interface AgentHealthInfo extends AgentHealthStatus {
  queueName: string;
  isRunning: boolean;
  lastJobTime: string | null;
  jobsProcessedLastHour: number;
}

interface QueueHealthInfo {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  isHealthy: boolean;
  lastJobTime: string | null;
  jobsProcessedLastHour: number;
}

interface ExecutionInfo {
  id: string;
  executionTime: string;
  status: string;
  articlesCreated: number;
  duration: number | null;
}

interface AlertInfo {
  ruleName: string;
  severity: string;
  message: string;
  timestamp: string;
}

interface AlertRuleInfo {
  id: string;
  name: string;
  severity: string;
  inCooldown: boolean;
}

interface SystemMetrics {
  redisConnected: boolean;
  pipelineReady: boolean;
  agentsStarted: boolean;
  lastPipelineStart: string | null;
}

/**
 * GET /api/admin/agent-health
 * Returns comprehensive health dashboard data
 */
export async function GET() {
  const redis = getRedis();
  const dashboard: AgentHealthDashboard = {
    timestamp: new Date().toISOString(),
    agents: [],
    queues: [],
    recentExecutions: [],
    alerts: [],
    alertRules: [],
    systemMetrics: {
      redisConnected: !!redis,
      pipelineReady: false,
      agentsStarted: false,
      lastPipelineStart: null,
    },
  };

  try {
    if (redis) {
      // 1. Get agent health statuses
      const agentStatuses = await getAllAgentHealthStatuses();

      // Enrich with queue info
      for (const status of agentStatuses) {
        const queueName = getQueueNameForAgent(status.agentName);
        const queueHealth = await getQueueHealth(queueName);

        dashboard.agents.push({
          ...status,
          queueName,
          isRunning: status.isHealthy && !status.inRecoveryMode,
          lastJobTime: queueHealth?.lastJobTime || null,
          jobsProcessedLastHour: queueHealth?.jobsProcessedLastHour || 0,
        });
      }

      // 2. Get system metrics
      const pipelineReady = await redis.get("pipeline:ready");
      const agentsStarted = await redis.get("pipeline:agents:started");
      const pipelineStart = await redis.get("pipeline:start-time");

      dashboard.systemMetrics.pipelineReady = pipelineReady === "true";
      dashboard.systemMetrics.agentsStarted = agentsStarted === "true";
      dashboard.systemMetrics.lastPipelineStart = pipelineStart || null;

      // 3. Get recent alerts
      const recentAlerts = getRecentAlerts(10);
      dashboard.alerts = recentAlerts.map((alert) => ({
        ruleName: alert.ruleName,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
      }));

      // 4. Get alert rule status
      dashboard.alertRules = getAlertRuleStatus();
    }

    // 5. Get recent executions from database
    const recentExecutions = await db.agentLog.findMany({
      orderBy: { executionTime: "desc" },
      take: 5,
      select: {
        id: true,
        executionTime: true,
        status: true,
        articlesCreated: true,
        duration: true,
      },
    });

    dashboard.recentExecutions = recentExecutions.map((exec) => ({
      id: exec.id,
      executionTime: exec.executionTime.toISOString(),
      status: exec.status,
      articlesCreated: exec.articlesCreated,
      duration: exec.duration,
    }));

    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json(
      {
        ...dashboard,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Get queue name for agent
 */
function getQueueNameForAgent(agentName: string): string {
  const agentToQueue: Record<string, string> = {
    RelevanceFilterAgent: "relevant-articles",
    DuplicateDetectorAgent: "unique-articles",
    TrendEnricherAgent: "enriched-articles",
    ContentEnricherAgent: "content-enriched",
    VisualGeneratorAgent: "articles-with-visuals",
    SEOOptimizerAgent: "seo-optimized",
    DatabasePublisherAgent: "ready-to-publish",
  };

  return agentToQueue[agentName] || "unknown";
}

/**
 * Get queue health info
 */
async function getQueueHealth(
  queueName: string,
): Promise<QueueHealthInfo | null> {
  try {
    const { getQueue } = await import("@/lib/queue-manager");
    const queue = getQueue(queueName);

    if (!queue) return null;

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    // Consider queue healthy if failed < 10% of completed
    const isHealthy = completed === 0 || failed / completed < 0.1;

    // Get last job time from completed jobs
    let lastJobTime: string | null = null;
    try {
      const completedJobs = await queue.getCompleted(0, 1);
      if (completedJobs.length > 0 && completedJobs[0].processedOn) {
        lastJobTime = new Date(completedJobs[0].processedOn).toISOString();
      }
    } catch {
      // Ignore error getting last job time
    }

    // Estimate jobs processed last hour from completed count
    // This is a rough estimate since we don't have timestamp info
    const jobsProcessedLastHour = completed > 0 ? Math.min(completed, 100) : 0;

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      isHealthy,
      lastJobTime,
      jobsProcessedLastHour,
    };
  } catch {
    return null;
  }
}
