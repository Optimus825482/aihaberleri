"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Zap,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export interface PipelineHealthSummary {
  healthyAgents: number;
  unhealthyAgents: number;
  totalAgents: number;
  queueWaiting: number;
  queueActive: number;
  queueFailed: number;
  queueCompleted: number;
  circuitsOpen: number;
  circuitsTotal: number;
  lastPipelineRun: string | null;
  totalArticlesToday: number;
  nextRun: string;
  interval: number;
}

interface PipelineHealthCardProps {
  summary: PipelineHealthSummary | null;
  isLoading?: boolean;
  error?: boolean;
}

function PipelineHealthCardInner({
  summary,
  isLoading,
  error,
}: PipelineHealthCardProps) {
  if (error) {
    return (
      <Card className="border-amber-500/30 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Pipeline durumu yüklenemedi
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !summary) {
    return (
      <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-6 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Pipeline yükleniyor…
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const allHealthy = summary.unhealthyAgents === 0 && summary.circuitsOpen === 0;

  return (
    <Card
      className={`border-primary/20 bg-card/80 backdrop-blur-sm transition-colors ${
        allHealthy ? "hover:border-primary/40" : "border-amber-500/30"
      }`}
    >
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tight">
                Pipeline İzleme
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Agent • Kuyruk • Circuit • Program
              </p>
            </div>
          </div>
          <Link
            href="/admin/agent-settings"
            className="shrink-0 rounded-full p-1.5 hover:bg-muted transition-colors"
            aria-label="Agent ayarları"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Özet satırı */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            {summary.unhealthyAgents === 0 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span className="text-xs font-medium">
              {summary.healthyAgents}/{summary.totalAgents} agent
            </span>
            {summary.unhealthyAgents > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 rounded-full border-amber-500/40 text-amber-500"
              >
                {summary.unhealthyAgents} uyarı
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground text-[10px]">•</span>
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs">
              Kuyruk:{" "}
              <span className="font-semibold text-yellow-500">
                {summary.queueWaiting}
              </span>{" "}
              bekleyen,{" "}
              <span className="font-semibold text-blue-500">
                {summary.queueActive}
              </span>{" "}
              aktif
              {summary.queueFailed > 0 && (
                <>
                  ,{" "}
                  <span className="font-semibold text-red-500">
                    {summary.queueFailed}
                  </span>{" "}
                  hata
                </>
              )}
            </span>
          </div>
        </div>

        {/* Circuit + Son çalışma + Bugün */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {summary.circuitsTotal > 0 && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40">
              <Zap
                className={`h-3.5 w-3.5 shrink-0 ${
                  summary.circuitsOpen > 0 ? "text-amber-500" : "text-emerald-500"
                }`}
              />
              <span className="text-[10px] truncate">
                Circuit:{" "}
                {summary.circuitsOpen > 0 ? (
                  <span className="font-semibold text-amber-500">
                    {summary.circuitsOpen} açık
                  </span>
                ) : (
                  <span className="text-muted-foreground">Tamamı kapalı</span>
                )}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] truncate" suppressHydrationWarning>
              {summary.lastPipelineRun
                ? formatDistanceToNow(new Date(summary.lastPipelineRun), {
                    addSuffix: true,
                    locale: tr,
                  })
                : "—"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40">
            <span className="text-[10px] font-semibold tabular-nums">
              Bugün: {summary.totalArticlesToday} haber
            </span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40">
            <span className="text-[10px] text-muted-foreground">
              Sonraki: {summary.interval} dk
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const PipelineHealthCard = memo(PipelineHealthCardInner);
