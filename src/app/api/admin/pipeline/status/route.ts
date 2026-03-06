/**
 * Pipeline Real-Time Status API
 *
 * Returns current pipeline execution state including:
 * - Which step is currently running
 * - Progress of each step
 * - Articles created
 * - Duration information
 */

import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getRedis } from "@/lib/redis";
import { getQueueStats } from "@/lib/queue-manager";
import {
  PIPELINE_HISTORY_KEY,
  PIPELINE_STATE_KEY,
  PIPELINE_STEP_DEFINITIONS,
  PIPELINE_STEP_QUEUE_MAP,
  type PipelineStepId,
} from "@/lib/pipeline-registry";

export const dynamic = "force-dynamic";

export interface PipelineStep {
  id: string;
  name: string;
  displayName: string;
  status: "pending" | "running" | "completed" | "error" | "skipped";
  duration?: number;
  itemsProcessed?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PipelineState {
  isRunning: boolean;
  currentStep: number;
  steps: PipelineStep[];
  startedAt?: string;
  completedAt?: string;
  articlesCreated: number;
  totalDuration?: number;
  runId?: string;
}

const DEFAULT_STEPS: Omit<PipelineStep, "status">[] =
  PIPELINE_STEP_DEFINITIONS.map(({ id, name, displayName }) => ({
    id,
    name,
    displayName,
  }));

async function buildLivePipelineState(): Promise<PipelineState> {
  const stepStats = await Promise.all(
    DEFAULT_STEPS.map(async (step) => {
      const queueName = PIPELINE_STEP_QUEUE_MAP[step.id as PipelineStepId];
      const stats = await getQueueStats(queueName);

      return {
        step,
        stats,
      };
    }),
  );

  const firstActiveIndex = stepStats.findIndex(
    (s) => (s.stats?.active || 0) > 0,
  );
  const firstQueuedIndex = stepStats.findIndex(
    (s) => (s.stats?.waiting || 0) + (s.stats?.delayed || 0) > 0,
  );
  const hasWorkInQueues = stepStats.some(
    (s) =>
      (s.stats?.active || 0) > 0 ||
      (s.stats?.waiting || 0) > 0 ||
      (s.stats?.delayed || 0) > 0,
  );

  const currentStep =
    firstActiveIndex !== -1 ? firstActiveIndex : firstQueuedIndex;

  const liveSteps: PipelineStep[] = stepStats.map(({ step, stats }, index) => {
    let status: PipelineStep["status"] = "pending";

    if (!hasWorkInQueues) {
      status = "pending";
    } else if ((stats?.active || 0) > 0) {
      status = "running";
    } else if ((stats?.failed || 0) > 0 && (stats?.completed || 0) === 0) {
      status = "error";
    } else if ((stats?.completed || 0) > 0) {
      status = "completed";
    } else if ((stats?.waiting || 0) > 0 || (stats?.delayed || 0) > 0) {
      status = "pending";
    } else if (currentStep !== -1 && index < currentStep) {
      status = "completed";
    } else {
      status = "pending";
    }

    return {
      ...step,
      status,
      itemsProcessed: stats?.completed ?? 0,
    };
  });

  const publisherStats = stepStats.find(
    ({ step }) => step.id === "database-publisher",
  )?.stats;
  const articlesCreated = publisherStats?.completed ?? 0;

  return {
    isRunning: hasWorkInQueues,
    currentStep,
    steps: liveSteps,
    articlesCreated,
  };
}

export async function GET() {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const redis = getRedis();

    // Try to get current pipeline state from Redis
    let pipelineState: PipelineState | null = null;

    if (redis) {
      try {
        const stateJson = await redis.get(PIPELINE_STATE_KEY);
        if (stateJson) {
          pipelineState = JSON.parse(stateJson);
        }
      } catch (e) {
        console.warn("Failed to parse pipeline state:", e);
      }
    }

    const liveState = await buildLivePipelineState();

    // Redis state varsa sadece metadata için kullan; gerçek step durumunu canlı kuyruk belirlesin.
    // Stale "running" state'lerin dashboard'ı kilitlemesini engelle.
    const isRedisRunningFresh =
      pipelineState?.isRunning &&
      !!pipelineState?.startedAt &&
      Date.now() - new Date(pipelineState.startedAt).getTime() <
        2 * 60 * 60 * 1000;

    if (isRedisRunningFresh && liveState.isRunning && pipelineState) {
      const mergedSteps = pipelineState.steps.map((step) => {
        const liveStep = liveState.steps.find((ls) => ls.id === step.id);
        return liveStep
          ? {
              ...step,
              status: liveStep.status,
              itemsProcessed: liveStep.itemsProcessed ?? step.itemsProcessed,
            }
          : step;
      });

      pipelineState = {
        ...pipelineState,
        isRunning: liveState.isRunning,
        currentStep: liveState.currentStep,
        steps: mergedSteps,
        articlesCreated: Math.max(
          pipelineState.articlesCreated || 0,
          liveState.articlesCreated || 0,
        ),
      };
    } else {
      // Redis state yoksa/stale ise canlı kuyruk durumunu döndür.
      pipelineState = liveState;

      // Kuyruklar idle ise son çalışmanın snapshot'unu göster.
      const allPending = pipelineState.steps.every(
        (s) => s.status === "pending",
      );
      if (!pipelineState.isRunning && allPending && redis) {
        try {
          const historyJson = await redis.get(PIPELINE_HISTORY_KEY);
          if (historyJson) {
            const lastRun = JSON.parse(historyJson) as PipelineState;
            pipelineState = lastRun;
          }
        } catch (e) {
          console.warn("Failed to parse pipeline history:", e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      pipeline: pipelineState,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get pipeline status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get pipeline status",
        pipeline: {
          isRunning: false,
          currentStep: -1,
          steps: DEFAULT_STEPS.map((step) => ({
            ...step,
            status: "pending" as const,
          })),
          articlesCreated: 0,
        },
      },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint to update pipeline state (called by worker)
 */
export async function POST(request: Request) {
  // This endpoint is called internally by the worker
  // Verify with internal token or skip auth for internal calls
  const authHeader = request.headers.get("x-internal-token");
  const internalToken = process.env.INTERNAL_API_TOKEN;

  // Allow if internal token matches or if called from worker
  const isInternal =
    authHeader === internalToken || authHeader === "worker-internal";

  if (!isInternal) {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }
  }

  try {
    const body = await request.json();
    const { action, stepId, data } = body;

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis not available" },
        { status: 503 },
      );
    }

    // Get current state
    let currentState: PipelineState;
    const stateJson = await redis.get(PIPELINE_STATE_KEY);

    if (stateJson) {
      currentState = JSON.parse(stateJson);
    } else {
      currentState = {
        isRunning: false,
        currentStep: -1,
        steps: DEFAULT_STEPS.map((step) => ({
          ...step,
          status: "pending" as const,
        })),
        articlesCreated: 0,
      };
    }

    switch (action) {
      case "start":
        currentState = {
          isRunning: true,
          currentStep: 0,
          steps: DEFAULT_STEPS.map((step) => ({
            ...step,
            status: "pending" as const,
          })),
          startedAt: new Date().toISOString(),
          articlesCreated: 0,
          runId: data?.runId || crypto.randomUUID(),
        };
        break;

      case "step-start":
        const startIndex = currentState.steps.findIndex((s) => s.id === stepId);
        if (startIndex !== -1) {
          currentState.currentStep = startIndex;
          currentState.steps[startIndex].status = "running";
          currentState.steps[startIndex].startedAt = new Date().toISOString();
        }
        break;

      case "step-complete":
        const completeIndex = currentState.steps.findIndex(
          (s) => s.id === stepId,
        );
        if (completeIndex !== -1) {
          currentState.steps[completeIndex].status = "completed";
          currentState.steps[completeIndex].completedAt =
            new Date().toISOString();
          if (data?.duration)
            currentState.steps[completeIndex].duration = data.duration;
          if (data?.itemsProcessed !== undefined)
            currentState.steps[completeIndex].itemsProcessed =
              data.itemsProcessed;
        }
        break;

      case "step-error":
        const errorIndex = currentState.steps.findIndex((s) => s.id === stepId);
        if (errorIndex !== -1) {
          currentState.steps[errorIndex].status = "error";
          currentState.steps[errorIndex].error = data?.error || "Unknown error";
        }
        break;

      case "article-created":
        currentState.articlesCreated = (currentState.articlesCreated || 0) + 1;
        break;

      case "complete":
        currentState.isRunning = false;
        currentState.completedAt = new Date().toISOString();
        if (currentState.startedAt) {
          currentState.totalDuration =
            new Date().getTime() - new Date(currentState.startedAt).getTime();
        }
        // Save to history
        await redis.set(
          PIPELINE_HISTORY_KEY,
          JSON.stringify(currentState),
          "EX",
          86400,
        ); // 24 hours
        break;

      case "reset":
        currentState = {
          isRunning: false,
          currentStep: -1,
          steps: DEFAULT_STEPS.map((step) => ({
            ...step,
            status: "pending" as const,
          })),
          articlesCreated: 0,
        };
        break;
    }

    // Save updated state
    await redis.set(
      PIPELINE_STATE_KEY,
      JSON.stringify(currentState),
      "EX",
      3600,
    ); // 1 hour TTL

    return NextResponse.json({ success: true, state: currentState });
  } catch (error) {
    console.error("Failed to update pipeline state:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update pipeline state" },
      { status: 500 },
    );
  }
}
