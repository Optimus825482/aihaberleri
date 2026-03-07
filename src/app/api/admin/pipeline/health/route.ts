/**
 * Pipeline Health API – Tek özet endpoint
 *
 * GET /api/admin/pipeline/health
 * Agent sağlığı + kuyruk istatistikleri + circuit breaker + program bilgisi.
 * Admin ana sayfada "Pipeline İzleme" kartı bu endpoint'i kullanır.
 */

import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { PIPELINE_STEP_DEFINITIONS } from "@/lib/pipeline-registry";
import { getAllQueueStats } from "@/lib/queue-manager";
import { getAllAgentHealthStatuses } from "@/services/multi-agent-pipeline.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  try {
    let queueStats: Awaited<ReturnType<typeof getAllQueueStats>> = [];
    try {
      queueStats = (await getAllQueueStats()) || [];
    } catch {
      // Redis/queue unavailable
    }

    const queueList = queueStats.filter((s): s is NonNullable<typeof s> => s !== null);
    const waiting = queueList.reduce((s, q) => s + (q.waiting || 0), 0);
    const active = queueList.reduce((s, q) => s + (q.active || 0), 0);
    const failed = queueList.reduce((s, q) => s + (q.failed || 0), 0);
    const completed = queueList.reduce((s, q) => s + (q.completed || 0), 0);

    let circuits: { name: string; state: string; unhealthy: number }[] = [];
    try {
      const { CircuitBreaker } = await import("@/lib/circuit-breaker");
      const summary = CircuitBreaker.getHealthSummary();
      circuits = summary.circuits.map((c) => ({
        name: c.name,
        state: c.state,
        unhealthy: c.failures,
      }));
    } catch {
      // circuit breaker not available
    }
    const circuitsOpen = circuits.filter((c) => c.state === "OPEN").length;

    let schedule: {
      interval: number;
      reason: string;
      nextRun: string;
      turkeyTime: string;
    } = {
      interval: 15,
      reason: "NORMAL",
      nextRun: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      turkeyTime: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    };
    try {
      const { getScheduleInfo } = await import("@/lib/smart-scheduler");
      const info = await getScheduleInfo();
      schedule = {
        interval: info.interval,
        reason: info.reason,
        nextRun: info.nextRun.toISOString(),
        turkeyTime: info.turkeyTime,
      };
    } catch {
      // ignore
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalArticlesToday = await db.article.count({
      where: { createdAt: { gte: today } },
    });

    const lastRun = await db.agentLog.findFirst({
      orderBy: { executionTime: "desc" },
      select: { executionTime: true },
    });

    let agentStatuses: Awaited<ReturnType<typeof getAllAgentHealthStatuses>> = [];
    try {
      agentStatuses = await getAllAgentHealthStatuses();
    } catch {
      // ignore
    }
    const healthByAgent = new Map(agentStatuses.map((s) => [s.agentName, s]));
    const agents = PIPELINE_STEP_DEFINITIONS.map((step) => {
      const stat = queueList.find((s) => s.queueName === step.queueName);
      const health = healthByAgent.get(step.id) ?? healthByAgent.get(step.agentName);
      const isHealthy = health?.isHealthy ?? true;
      return {
        id: step.id,
        displayName: step.displayName,
        queueName: step.queueName,
        status: (stat?.active ?? 0) > 0 ? "running" : (stat?.waiting ?? 0) + (stat?.delayed ?? 0) > 0 ? "queued" : (stat?.failed ?? 0) > 0 ? "error" : "idle",
        waiting: stat?.waiting ?? 0,
        active: stat?.active ?? 0,
        failed: stat?.failed ?? 0,
        completed: stat?.completed ?? 0,
        isHealthy,
      };
    });
    const healthyAgents = agents.filter((a) => a.isHealthy).length;
    const totalAgents = agents.length;

    const summary = {
      healthyAgents,
      unhealthyAgents: totalAgents - healthyAgents,
      totalAgents,
      queueWaiting: waiting,
      queueActive: active,
      queueFailed: failed,
      queueCompleted: completed,
      circuitsOpen,
      circuitsTotal: circuits.length,
      lastPipelineRun: lastRun?.executionTime?.toISOString() ?? null,
      totalArticlesToday,
      nextRun: schedule.nextRun,
      interval: schedule.interval,
    };

    return NextResponse.json({
      success: true,
      summary,
      agents,
      queues: queueList.map((q) => ({
        queueName: q.queueName,
        waiting: q.waiting,
        active: q.active,
        failed: q.failed,
        completed: q.completed,
      })),
      circuits,
      schedule,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Pipeline health error:", error);
    return NextResponse.json(
      { success: false, error: "Pipeline health alınamadı" },
      { status: 500 },
    );
  }
}
