"use client";

import { useState, useEffect, useCallback, memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow } from "lucide-react";

interface StageData {
  queue: string;
  label: string;
  shortLabel: string;
  icon: string;
  status: "idle" | "active" | "waiting" | "completed" | "failed";
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface PipelineLiveData {
  stages: StageData[];
  pipelineStatus: "running" | "queued" | "idle";
  timestamp: string;
}

const STATUS_STYLES = {
  active: {
    card: "border-blue-500/40 bg-blue-500/10",
    dot: "bg-blue-400",
    text: "text-blue-400",
    label: "İşleniyor",
  },
  waiting: {
    card: "border-yellow-500/30 bg-yellow-500/5",
    dot: "bg-yellow-400",
    text: "text-yellow-400",
    label: "Bekliyor",
  },
  completed: {
    card: "border-emerald-500/30 bg-emerald-500/5",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    label: "Tamam",
  },
  failed: {
    card: "border-red-500/30 bg-red-500/5",
    dot: "bg-red-400",
    text: "text-red-400",
    label: "Hata",
  },
  idle: {
    card: "border-border/30 bg-muted/20",
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground/60",
    label: "Boşta",
  },
};

// === Stage Node — Mobile-first compact card ===
const StageNode = memo(function StageNode({ stage }: { stage: StageData }) {
  const s = STATUS_STYLES[stage.status];
  const inProgress = stage.active + stage.waiting;
  const isActive = stage.status === "active";

  return (
    <div
      className={`relative flex flex-col items-center p-2.5 sm:p-3 rounded-xl border ${s.card} min-w-[72px] sm:min-w-[90px] transition-all duration-300`}
    >
      {/* Active pulse indicator */}
      {isActive && (
        <div className="absolute -top-1 -right-1">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </span>
        </div>
      )}

      <span className="text-lg sm:text-xl mb-0.5">{stage.icon}</span>
      <span className="text-[10px] sm:text-xs font-bold text-foreground text-center leading-tight">
        {stage.shortLabel}
      </span>
      <span
        className={`text-[9px] sm:text-[10px] mt-0.5 font-medium ${s.text}`}
      >
        {s.label}
      </span>

      {/* Counters row */}
      <div className="flex items-center gap-1 mt-1.5 flex-wrap justify-center">
        {inProgress > 0 && (
          <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-bold">
            {inProgress}
          </span>
        )}
        {stage.completed > 0 && (
          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
            ✓{stage.completed}
          </span>
        )}
        {stage.failed > 0 && (
          <span className="text-[9px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full font-bold">
            ✗{stage.failed}
          </span>
        )}
      </div>
    </div>
  );
});

// === Arrow connector ===
const Arrow = memo(function Arrow() {
  return (
    <div className="flex items-center shrink-0 mx-0.5">
      <div className="w-3 sm:w-5 h-[2px] bg-border/50" />
      <div className="w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-border/50" />
    </div>
  );
});

// === Main Widget ===
function DashboardPipelineWidget() {
  const [data, setData] = useState<PipelineLiveData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pipeline-live");
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      /* silent */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 3 seconds when pipeline is running, 5 seconds otherwise
    const pollInterval = data?.pipelineStatus === "running" ? 3000 : 5000;
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [fetchData, data?.pipelineStatus]);

  const pipelineLabel =
    data?.pipelineStatus === "running"
      ? "Çalışıyor"
      : data?.pipelineStatus === "queued"
        ? "Kuyrukta"
        : "Boşta";

  const pipelineColor =
    data?.pipelineStatus === "running"
      ? "bg-blue-500"
      : data?.pipelineStatus === "queued"
        ? "bg-yellow-500"
        : "bg-muted-foreground/40";

  const totalActive =
    data?.stages.reduce((s, st) => s + st.active + st.waiting, 0) ?? 0;
  const totalDone = data?.stages.reduce((s, st) => s + st.completed, 0) ?? 0;
  const totalFail = data?.stages.reduce((s, st) => s + st.failed, 0) ?? 0;

  return (
    <Card className="border-cyan-500/20 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 rounded-xl">
              <Workflow className="h-4 w-4 text-cyan-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                Pipeline Monitor
                {data && (
                  <span className="relative flex h-2 w-2">
                    {data.pipelineStatus === "running" && (
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pipelineColor} opacity-75`}
                      />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${pipelineColor}`}
                    />
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-[10px]">
                Canlı pipeline durumu • Realtime güncelleme
              </CardDescription>
            </div>
          </div>
          {data && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] h-5 rounded-full font-bold ${
                  data.pipelineStatus === "running"
                    ? "text-blue-400 border-blue-500/30"
                    : data.pipelineStatus === "queued"
                      ? "text-yellow-400 border-yellow-500/30"
                      : "text-muted-foreground border-border/50"
                }`}
              >
                {pipelineLabel}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="h-[100px] animate-pulse bg-muted/30 rounded-xl" />
        ) : !data ? (
          <div className="h-[100px] flex items-center justify-center text-muted-foreground text-xs">
            Veri alınamadı
          </div>
        ) : (
          <>
            {/* Pipeline Flow — Horizontal scroll on mobile */}
            <div className="overflow-x-auto scrollbar-none -mx-1 px-1 pb-2">
              <div className="flex items-center min-w-max">
                {data.stages.map((stage, i) => (
                  <div key={stage.queue} className="flex items-center">
                    <StageNode stage={stage} />
                    {i < data.stages.length - 1 && <Arrow />}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary stats bar */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/30 text-[10px]">
              <div className="flex items-center gap-3">
                {totalActive > 0 && (
                  <span className="text-blue-400 font-bold">
                    ⚡ {totalActive} aktif
                  </span>
                )}
                <span className="text-emerald-400 font-bold">
                  ✓ {totalDone} tamamlandı
                </span>
                {totalFail > 0 && (
                  <span className="text-red-400 font-bold">
                    ✗ {totalFail} hata
                  </span>
                )}
              </div>
              <span className="text-muted-foreground">
                {data.timestamp
                  ? new Date(data.timestamp).toLocaleTimeString("tr-TR")
                  : ""}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default DashboardPipelineWidget;
