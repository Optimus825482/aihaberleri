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
import { getQueueStats, QUEUE_NAMES } from "@/lib/queue-manager";

// Redis keys for pipeline state
const PIPELINE_STATE_KEY = "pipeline:current-state";
const PIPELINE_HISTORY_KEY = "pipeline:last-run";

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

const DEFAULT_STEPS: Omit<PipelineStep, "status">[] = [
  {
    id: "duplicate-detector",
    name: "duplicate-detector",
    displayName: "Duplikat Tespiti",
  },
  {
    id: "relevance-filter",
    name: "relevance-filter",
    displayName: "Alakalılık Filtresi",
  },
  {
    id: "trend-enrichment",
    name: "trend-enrichment",
    displayName: "Trend Zenginleştirme",
  },
  {
    id: "content-enricher",
    name: "content-enricher",
    displayName: "İçerik Zenginleştirme",
  },
  {
    id: "visual-generator",
    name: "visual-generator",
    displayName: "Görsel Oluşturma",
  },
  {
    id: "database-publisher",
    name: "database-publisher",
    displayName: "Yayınlama",
  },
];

const STEP_QUEUE_MAP: Record<string, string> = {
  "duplicate-detector": QUEUE_NAMES.UNIQUE_ARTICLES,
  "relevance-filter": QUEUE_NAMES.RELEVANT_ARTICLES,
  "trend-enrichment": QUEUE_NAMES.TREND_ENRICHMENT,
  "content-enricher": QUEUE_NAMES.ENRICHED_ARTICLES,
  "visual-generator": QUEUE_NAMES.ARTICLES_WITH_VISUALS,
  "database-publisher": QUEUE_NAMES.DATABASE_PUBLISHER,
};

async function buildLivePipelineState(): Promise<PipelineState> {
  const liveSteps: PipelineStep[] = await Promise.all(
    DEFAULT_STEPS.map(async (step) => {
      const queueName = STEP_QUEUE_MAP[step.id];
      const stats = await getQueueStats(queueName);

      if (!stats) {
        return { ...step, status: "pending" as const };
      }

      let status: PipelineStep["status"] = "pending";
      if (stats.active > 0) {
        status = "running";
      } else if (stats.waiting > 0 || stats.delayed > 0) {
        status = "pending";
      } else if (stats.completed > 0) {
        status = "completed";
      } else if (stats.failed > 0) {
        status = "error";
      }

      return {
        ...step,
        status,
        itemsProcessed: stats.completed,
      };
    }),
  );

  const currentStep = liveSteps.findIndex((s) => s.status === "running");
  const hasQueuedOrRunning = liveSteps.some(
    (s) => s.status === "running" || s.status === "pending",
  );
  const articlesCreated =
    liveSteps.find((s) => s.id === "database-publisher")?.itemsProcessed ?? 0;

  return {
    isRunning: hasQueuedOrRunning,
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

    // If Redis state exists and indicates active run, prefer Redis metadata but sync statuses from live queues.
    if (pipelineState?.isRunning) {
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
      // Redis state yoksa veya stale/idle ise canlı kuyruk durumunu döndür.
      pipelineState = liveState;

      // If everything looks idle, still try to show last run snapshot from history.
      const allPending = pipelineState.steps.every(
        (s) => s.status === "pending",
      );
      if (allPending && !pipelineState.isRunning && redis) {
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
