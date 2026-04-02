/**
 * Pipeline Tracer - Lightweight tracing for news pipeline
 * Her pipeline adımını DB'ye kaydeder, süre/hata/metadata takibi yapar
 */

import { db } from "@/lib/db";

// Prisma client type workaround — TS server cache may not recognize new models
// Runtime'da Prisma client doğru modelleri biliyor, sadece IDE cache sorunu
const prisma = db as any;

interface SpanAttributes {
  [key: string]: string | number | boolean | null;
}

class PipelineSpanBuilder {
  private spanId: string | null = null;
  private startTime: number;

  constructor(
    private traceId: string,
    private name: string,
    private parentSpanId?: string,
  ) {
    this.startTime = Date.now();
  }

  async start(attributes?: SpanAttributes): Promise<string> {
    try {
      const span = await prisma.pipelineSpan.create({
        data: {
          traceId: this.traceId,
          parentSpanId: this.parentSpanId,
          name: this.name,
          status: "RUNNING",
          attributes: attributes ? (attributes as any) : undefined,
        },
      });
      this.spanId = span.id;
      return span.id;
    } catch (e) {
      console.warn(`[Tracer] Span create failed: ${this.name}`, e);
      return "noop";
    }
  }

  async end(attributes?: SpanAttributes): Promise<void> {
    if (!this.spanId) return;
    const duration = Date.now() - this.startTime;
    try {
      await prisma.pipelineSpan.update({
        where: { id: this.spanId },
        data: {
          status: "SUCCESS",
          duration,
          completedAt: new Date(),
          attributes: attributes ? (attributes as any) : undefined,
        },
      });
    } catch (e) {
      // Non-critical
    }
  }

  async fail(error: string, attributes?: SpanAttributes): Promise<void> {
    if (!this.spanId) return;
    const duration = Date.now() - this.startTime;
    try {
      await prisma.pipelineSpan.update({
        where: { id: this.spanId },
        data: {
          status: "FAILED",
          duration,
          completedAt: new Date(),
          error,
          attributes: attributes ? (attributes as any) : undefined,
        },
      });
    } catch (e) {
      // Non-critical
    }
  }
}

export class PipelineTracer {
  private traceId: string | null = null;
  private startTime: number = Date.now();

  constructor(private pipelineName: string) {}

  async startTrace(
    agentLogId?: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    this.startTime = Date.now();
    try {
      const trace = await prisma.pipelineTrace.create({
        data: {
          pipelineName: this.pipelineName,
          agentLogId: agentLogId || null,
          status: "RUNNING",
          metadata: metadata ? (metadata as any) : undefined,
        },
      });
      this.traceId = trace.id;
      return trace.id;
    } catch (e) {
      console.warn(`[Tracer] Trace create failed: ${this.pipelineName}`, e);
      return "noop";
    }
  }

  span(name: string, parentSpanId?: string): PipelineSpanBuilder {
    return new PipelineSpanBuilder(this.traceId || "noop", name, parentSpanId);
  }

  async endTrace(
    status: "SUCCESS" | "FAILED" | "PARTIAL",
    metadata?: Record<string, any>,
  ): Promise<void> {
    if (!this.traceId) return;
    const totalDuration = Date.now() - this.startTime;
    try {
      await prisma.pipelineTrace.update({
        where: { id: this.traceId },
        data: {
          status,
          totalDuration,
          completedAt: new Date(),
          metadata: metadata ? (metadata as any) : undefined,
        },
      });
    } catch (e) {
      // Non-critical
    }
  }

  getTraceId(): string | null {
    return this.traceId;
  }
}

/**
 * Convenience: Wrap an async function with automatic span tracking
 */
export async function withSpan<T>(
  tracer: PipelineTracer,
  spanName: string,
  fn: () => Promise<T>,
  attributes?: SpanAttributes,
): Promise<T> {
  const span = tracer.span(spanName);
  await span.start(attributes);
  try {
    const result = await fn();
    await span.end(attributes);
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await span.fail(msg, attributes);
    throw error;
  }
}

// Type for trace records from DB
interface TraceRecord {
  id: string;
  pipelineName: string;
  status: string;
  totalDuration: number | null;
  createdAt: Date;
}

// Type for span groupBy results
// NOTE: Prisma groupBy({ _count: true }) returns { _count: { _all: number } }, not plain number
interface SpanGroupResult {
  name: string;
  status: string;
  _count: { _all: number };
  _avg: { duration: number | null };
  _max: { duration: number | null };
  _min: { duration: number | null };
}

/**
 * Pipeline Metrics API - Dashboard için aggregated metrikler
 */
export async function getPipelineMetrics(days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [traces, spans, spanStats] = await Promise.all([
    // Trace-level stats
    prisma.pipelineTrace.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        pipelineName: true,
        status: true,
        totalDuration: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }) as Promise<TraceRecord[]>,
    // Span-level aggregation by name
    prisma.pipelineSpan.groupBy({
      by: ["name", "status"],
      where: { startedAt: { gte: since } },
      _count: true,
      _avg: { duration: true },
      _max: { duration: true },
      _min: { duration: true },
    }) as Promise<SpanGroupResult[]>,
    // Overall span stats
    // NOTE: Prisma aggregate({ _count: true }) returns { _count: { _all: number } }
    prisma.pipelineSpan.aggregate({
      where: { startedAt: { gte: since } },
      _count: true,
      _avg: { duration: true },
    }) as Promise<{ _count: { _all: number }; _avg: { duration: number | null } }>,
  ]);

  // Build step-level metrics
  const stepMetrics: Record<
    string,
    {
      name: string;
      totalRuns: number;
      successCount: number;
      failCount: number;
      avgDuration: number;
      maxDuration: number;
      minDuration: number;
      successRate: number;
    }
  > = {};

  for (const s of spans) {
    if (!stepMetrics[s.name]) {
      stepMetrics[s.name] = {
        name: s.name,
        totalRuns: 0,
        successCount: 0,
        failCount: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        successRate: 0,
      };
    }
    const m = stepMetrics[s.name];
    const spanCount = s._count._all;
    m.totalRuns += spanCount;
    if (s.status === "SUCCESS") {
      m.successCount += spanCount;
      m.avgDuration = s._avg.duration || 0;
      m.maxDuration = Math.max(m.maxDuration, s._max.duration || 0);
      m.minDuration = Math.min(m.minDuration, s._min.duration || 0);
    } else if (s.status === "FAILED") {
      m.failCount += spanCount;
    }
  }

  // Calculate success rates
  for (const key of Object.keys(stepMetrics)) {
    const m = stepMetrics[key];
    m.successRate =
      m.totalRuns > 0 ? Math.round((m.successCount / m.totalRuns) * 100) : 0;
    if (m.minDuration === Infinity) m.minDuration = 0;
  }

  // Pipeline-level summary
  const pipelineSummary = {
    totalRuns: traces.length,
    successCount: traces.filter((t: TraceRecord) => t.status === "SUCCESS")
      .length,
    failCount: traces.filter((t: TraceRecord) => t.status === "FAILED").length,
    partialCount: traces.filter((t: TraceRecord) => t.status === "PARTIAL")
      .length,
    avgDuration:
      traces.length > 0
        ? Math.round(
            traces.reduce(
              (sum: number, t: TraceRecord) => sum + (t.totalDuration || 0),
              0,
            ) / traces.length,
          )
        : 0,
    totalSpans: spanStats._count._all ?? 0,
  };

  return {
    summary: pipelineSummary,
    steps: Object.values(stepMetrics).sort((a, b) => b.totalRuns - a.totalRuns),
    recentTraces: traces.slice(0, 20),
  };
}
