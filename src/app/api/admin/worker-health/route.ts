/**
 * Worker Health Check API
 * Returns the current health status of the news agent worker and multi-agent pipeline
 */

import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface WorkerHealthStatus {
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  timestamp: string;
  heartbeat: {
    lastSeen: string | null;
    secondsSince: number | null;
    isAlive: boolean;
  };
  queues: {
    newsAgent: QueueStats;
    relevantArticles?: QueueStats;
    uniqueArticles?: QueueStats;
    enrichedArticles?: QueueStats;
    articlesWithVisuals?: QueueStats;
  };
  agentPipeline: {
    isReady: boolean;
    agentsStarted: boolean;
    status: string; // "running" | "stopped" | "error"
    agents: AgentStatus[];
  };
  activeJobs: Record<string, ActiveJobInfo[]>;
  recentExecution: {
    lastRun: string | null;
    status: string | null;
    articlesCreated: number;
    duration: number | null;
  } | null;
}

interface AgentStatus {
  name: string;
  status: "running" | "idle" | "error";
  queueName: string;
}

interface ActiveJobInfo {
  id: string;
  name: string;
  progress: number;
  attemptsMade: number;
  processedOn: string | null;
  data?: {
    title?: string;
    source?: string;
  };
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * GET /api/admin/worker-health
 * Returns the health status of the worker system
 */
export async function GET() {
  const redis = getRedis();
  const healthStatus: WorkerHealthStatus = {
    status: "unknown",
    timestamp: new Date().toISOString(),
    heartbeat: {
      lastSeen: null,
      secondsSince: null,
      isAlive: false,
    },
    queues: {
      newsAgent: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
      },
    },
    agentPipeline: {
      isReady: false,
      agentsStarted: false,
      status: "unknown",
      agents: [],
    },
    activeJobs: {},
    recentExecution: null,
  };

  try {
    // 1. Check heartbeat
    if (redis) {
      try {
        const heartbeatData = await redis.get("worker:heartbeat");
        if (heartbeatData) {
          const lastHeartbeat = parseInt(heartbeatData);
          healthStatus.heartbeat.lastSeen = new Date(
            lastHeartbeat,
          ).toISOString();
          healthStatus.heartbeat.secondsSince = Math.floor(
            (Date.now() - lastHeartbeat) / 1000,
          );
          healthStatus.heartbeat.isAlive =
            healthStatus.heartbeat.secondsSince < 120; // 2 minutes threshold
        }
      } catch (heartbeatError) {
        // Heartbeat check failed, continue
      }

      // 2. Check queue stats for news-agent queue
      try {
        const { getNewsAgentQueue } = await import("@/lib/queue");
        const newsAgentQueue = getNewsAgentQueue();
        if (newsAgentQueue) {
          const [waiting, active, completed, failed, delayed] =
            await Promise.all([
              newsAgentQueue.getWaitingCount(),
              newsAgentQueue.getActiveCount(),
              newsAgentQueue.getCompletedCount(),
              newsAgentQueue.getFailedCount(),
              newsAgentQueue.getDelayedCount(),
            ]);

          const isPaused = await newsAgentQueue.isPaused();

          healthStatus.queues.newsAgent = {
            waiting,
            active,
            completed,
            failed,
            delayed,
            paused: isPaused,
          };
        }
      } catch (queueError) {
        // Queue stats failed, continue
      }

      // 3. Check multi-agent pipeline queue stats
      try {
        const { getQueue, QUEUE_NAMES } = await import("@/lib/queue-manager");
        const pipelineQueues = [
          QUEUE_NAMES.RELEVANT_ARTICLES,
          QUEUE_NAMES.UNIQUE_ARTICLES,
          QUEUE_NAMES.ENRICHED_ARTICLES,
          QUEUE_NAMES.ARTICLES_WITH_VISUALS,
        ];

        for (const queueName of pipelineQueues) {
          const queue = getQueue(queueName);
          if (queue) {
            const [waiting, active] = await Promise.all([
              queue.getWaitingCount(),
              queue.getActiveCount(),
            ]);

            if (queueName === QUEUE_NAMES.RELEVANT_ARTICLES) {
              healthStatus.queues.relevantArticles = {
                waiting,
                active,
                completed: 0,
                failed: 0,
                delayed: 0,
                paused: false,
              };
            } else if (queueName === QUEUE_NAMES.UNIQUE_ARTICLES) {
              healthStatus.queues.uniqueArticles = {
                waiting,
                active,
                completed: 0,
                failed: 0,
                delayed: 0,
                paused: false,
              };
            } else if (queueName === QUEUE_NAMES.ENRICHED_ARTICLES) {
              healthStatus.queues.enrichedArticles = {
                waiting,
                active,
                completed: 0,
                failed: 0,
                delayed: 0,
                paused: false,
              };
            } else if (queueName === QUEUE_NAMES.ARTICLES_WITH_VISUALS) {
              healthStatus.queues.articlesWithVisuals = {
                waiting,
                active,
                completed: 0,
                failed: 0,
                delayed: 0,
                paused: false,
              };
            }
          }
        }
      } catch (pipelineError) {
        // Pipeline queue stats failed, continue
      }

      // 4. Check multi-agent pipeline readiness and status
      try {
        const [pipelineReady, agentsStarted, pipelineStatusData] =
          await Promise.all([
            redis.get("pipeline:ready"),
            redis.get("pipeline:agents:started"),
            redis.get("pipeline:status"),
          ]);

        healthStatus.agentPipeline.isReady = pipelineReady === "true";
        healthStatus.agentPipeline.agentsStarted = agentsStarted === "true";

        // Parse pipeline status if available
        if (pipelineStatusData) {
          try {
            const statusData = JSON.parse(pipelineStatusData);
            healthStatus.agentPipeline.status = statusData.status || "unknown";
            healthStatus.agentPipeline.agents = statusData.agents || [];
          } catch {
            healthStatus.agentPipeline.status = "unknown";
          }
        } else {
          // Determine status from heartbeat
          healthStatus.agentPipeline.status = healthStatus.heartbeat.isAlive
            ? "running"
            : "stopped";
        }
      } catch (pipelineCheckError) {
        // Pipeline check failed, continue
      }

      // 4.5. Get active job info for each queue with active jobs
      try {
        const { getQueue, QUEUE_NAMES } = await import("@/lib/queue-manager");

        for (const queueName of [
          QUEUE_NAMES.RELEVANT_ARTICLES,
          QUEUE_NAMES.UNIQUE_ARTICLES,
          QUEUE_NAMES.ENRICHED_ARTICLES,
          QUEUE_NAMES.ARTICLES_WITH_VISUALS,
          QUEUE_NAMES.DATABASE_PUBLISHER,
        ]) {
          // Check if queue has active jobs from previous stats
          const hasActive =
            (queueName === QUEUE_NAMES.RELEVANT_ARTICLES &&
              healthStatus.queues.relevantArticles?.active) ||
            (queueName === QUEUE_NAMES.UNIQUE_ARTICLES &&
              healthStatus.queues.uniqueArticles?.active) ||
            (queueName === QUEUE_NAMES.ENRICHED_ARTICLES &&
              healthStatus.queues.enrichedArticles?.active) ||
            (queueName === QUEUE_NAMES.ARTICLES_WITH_VISUALS &&
              healthStatus.queues.articlesWithVisuals?.active);

          if (hasActive) {
            const queue = getQueue(queueName);
            if (queue) {
              try {
                const active = await queue.getActive(0, 5);
                healthStatus.activeJobs[queueName] = active.map((job: any) => ({
                  id: job.id,
                  name: job.name,
                  progress: job.progress,
                  attemptsMade: job.attemptsMade,
                  processedOn: job.processedOn
                    ? new Date(job.processedOn).toISOString()
                    : null,
                  data: {
                    title: job.data?.title || null,
                    source: job.data?.source || null,
                  },
                }));
              } catch {
                // Failed to get active jobs for this queue
              }
            }
          }
        }
      } catch (activeJobsError) {
        // Active jobs check failed, continue
      }
    }

    // 5. Get recent agent execution from database
    try {
      const lastExecution = await db.agentLog.findFirst({
        orderBy: { executionTime: "desc" },
        select: {
          executionTime: true,
          status: true,
          articlesCreated: true,
          duration: true,
        },
      });

      if (lastExecution) {
        healthStatus.recentExecution = {
          lastRun: lastExecution.executionTime.toISOString(),
          status: lastExecution.status,
          articlesCreated: lastExecution.articlesCreated,
          duration: lastExecution.duration,
        };
      }
    } catch (dbError) {
      // Database query failed, continue
    }

    // 6. Determine overall health status
    if (healthStatus.heartbeat.isAlive) {
      if (
        healthStatus.queues.newsAgent.failed === 0 &&
        healthStatus.agentPipeline.isReady
      ) {
        healthStatus.status = "healthy";
      } else if (healthStatus.queues.newsAgent.failed < 10) {
        healthStatus.status = "degraded";
      } else {
        healthStatus.status = "unhealthy";
      }
    } else {
      if (healthStatus.heartbeat.secondsSince !== null) {
        if (healthStatus.heartbeat.secondsSince < 300) {
          // Less than 5 minutes, might be starting up
          healthStatus.status = "degraded";
        } else {
          healthStatus.status = "unhealthy";
        }
      }
    }

    return NextResponse.json(healthStatus);
  } catch (error) {
    return NextResponse.json(
      {
        ...healthStatus,
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
