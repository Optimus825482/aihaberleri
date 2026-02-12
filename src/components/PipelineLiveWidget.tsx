"use client";

import { useState, useEffect, useCallback } from "react";

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

const STATUS_CONFIG = {
  active: {
    bg: "bg-blue-500/20",
    border: "border-blue-500/60",
    dot: "bg-blue-400",
    text: "text-blue-400",
    label: "İşleniyor",
    pulse: true,
  },
  waiting: {
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/50",
    dot: "bg-yellow-400",
    text: "text-yellow-400",
    label: "Bekliyor",
    pulse: false,
  },
  completed: {
    bg: "bg-green-500/10",
    border: "border-green-500/40",
    dot: "bg-green-400",
    text: "text-green-400",
    label: "Tamamlandı",
    pulse: false,
  },
  failed: {
    bg: "bg-red-500/15",
    border: "border-red-500/50",
    dot: "bg-red-400",
    text: "text-red-400",
    label: "Hata",
    pulse: false,
  },
  idle: {
    bg: "bg-gray-700/30",
    border: "border-gray-600/40",
    dot: "bg-gray-500",
    text: "text-gray-500",
    label: "Boşta",
    pulse: false,
  },
};

function StageNode({
  stage,
  index,
  total,
}: {
  stage: StageData;
  index: number;
  total: number;
}) {
  const config = STATUS_CONFIG[stage.status];
  const totalJobs = stage.waiting + stage.active;

  return (
    <div className="flex items-center">
      {/* Stage Card */}
      <div
        className={`relative flex flex-col items-center p-3 rounded-xl border ${config.bg} ${config.border} min-w-[100px] transition-all duration-300`}
      >
        {/* Pulse ring for active */}
        {config.pulse && (
          <div className="absolute -top-1 -right-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
            </span>
          </div>
        )}

        {/* Icon */}
        <span className="text-2xl mb-1">{stage.icon}</span>

        {/* Label */}
        <span className="text-xs font-medium text-gray-200 text-center leading-tight">
          {stage.shortLabel}
        </span>

        {/* Status */}
        <span className={`text-[10px] mt-1 ${config.text}`}>
          {config.label}
        </span>

        {/* Counters */}
        <div className="flex items-center gap-2 mt-1.5">
          {totalJobs > 0 && (
            <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full">
              {totalJobs} iş
            </span>
          )}
          {stage.completed > 0 && (
            <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full">
              ✓{stage.completed}
            </span>
          )}
          {stage.failed > 0 && (
            <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full">
              ✗{stage.failed}
            </span>
          )}
        </div>
      </div>

      {/* Arrow connector */}
      {index < total - 1 && (
        <div className="flex items-center mx-1">
          <div className="w-6 h-[2px] bg-gray-600" />
          <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-gray-600" />
        </div>
      )}
    </div>
  );
}

export default function PipelineLiveWidget() {
  const [data, setData] = useState<PipelineLiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pipeline-live");
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError("Canlı veri alınamadı");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
        <p className="text-gray-400 text-sm">{error || "Veri yok"}</p>
      </div>
    );
  }

  const pipelineStatusConfig = {
    running: {
      label: "Pipeline Çalışıyor",
      color: "text-blue-400",
      dot: "bg-blue-400",
      pulse: true,
    },
    queued: {
      label: "Kuyrukta Bekliyor",
      color: "text-yellow-400",
      dot: "bg-yellow-400",
      pulse: false,
    },
    idle: {
      label: "Boşta",
      color: "text-gray-400",
      dot: "bg-gray-500",
      pulse: false,
    },
  };

  const pStatus = pipelineStatusConfig[data.pipelineStatus];
  const totalCompleted = data.stages.reduce((sum, s) => sum + s.completed, 0);
  const totalFailed = data.stages.reduce((sum, s) => sum + s.failed, 0);
  const totalActive = data.stages.reduce(
    (sum, s) => sum + s.active + s.waiting,
    0,
  );

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-300">
            🔄 Pipeline Canlı Durum
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              {pStatus.pulse && (
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pStatus.dot} opacity-75`}
                />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${pStatus.dot}`}
              />
            </span>
            <span className={`text-xs ${pStatus.color}`}>{pStatus.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {totalActive > 0 && (
            <span className="text-blue-400">⚡ {totalActive} aktif</span>
          )}
          <span className="text-green-400">✓ {totalCompleted}</span>
          {totalFailed > 0 && (
            <span className="text-red-400">✗ {totalFailed}</span>
          )}
          <span>{new Date(data.timestamp).toLocaleTimeString("tr-TR")}</span>
        </div>
      </div>

      {/* Pipeline Flow */}
      <div className="p-4 overflow-x-auto">
        <div className="flex items-center justify-center min-w-max">
          {data.stages.map((stage, i) => (
            <StageNode
              key={stage.queue}
              stage={stage}
              index={i}
              total={data.stages.length}
            />
          ))}
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div className="px-4 py-2 border-t border-gray-700/50 flex items-center justify-between text-[10px] text-gray-500">
        <span>Her 5 saniyede güncellenir</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> İşleniyor
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400" /> Bekliyor
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" /> Tamamlandı
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" /> Hata
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-500" /> Boşta
          </span>
        </div>
      </div>
    </div>
  );
}
