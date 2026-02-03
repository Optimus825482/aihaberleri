"use client";

import { Cpu, HardDrive, MemoryStick, Clock } from "lucide-react";

interface SystemHealthData {
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
}

interface SystemHealthCardProps {
  data: SystemHealthData;
}

export default function SystemHealthCard({ data }: SystemHealthCardProps) {
  const getStatusColor = (
    value: number,
    thresholds: { warning: number; critical: number },
  ) => {
    if (value >= thresholds.critical) return "text-red-500";
    if (value >= thresholds.warning) return "text-yellow-500";
    return "text-green-500";
  };

  const getProgressColor = (
    value: number,
    thresholds: { warning: number; critical: number },
  ) => {
    if (value >= thresholds.critical) return "bg-red-500";
    if (value >= thresholds.warning) return "bg-yellow-500";
    return "bg-green-500";
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}g ${hours}s`;
    if (hours > 0) return `${hours}s ${minutes}d`;
    return `${minutes}d`;
  };

  const metrics = [
    {
      icon: Cpu,
      label: "CPU Kullanımı",
      value: data.cpu,
      unit: "%",
      thresholds: { warning: 70, critical: 85 },
    },
    {
      icon: MemoryStick,
      label: "Bellek Kullanımı",
      value: data.memory,
      unit: "%",
      thresholds: { warning: 75, critical: 90 },
    },
    {
      icon: HardDrive,
      label: "Disk Kullanımı",
      value: data.disk,
      unit: "%",
      thresholds: { warning: 80, critical: 95 },
    },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-200 dark:border-blue-800 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Cpu className="w-6 h-6 text-blue-500" />
          Sistem Sağlığı
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Uptime: {formatUptime(data.uptime)}</span>
        </div>
      </div>

      <div className="space-y-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const statusColor = getStatusColor(metric.value, metric.thresholds);
          const progressColor = getProgressColor(
            metric.value,
            metric.thresholds,
          );

          return (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${statusColor}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {metric.label}
                  </span>
                </div>
                <span className={`text-lg font-bold ${statusColor}`}>
                  {metric.value.toFixed(1)}
                  {metric.unit}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full ${progressColor} transition-all duration-500 ease-out rounded-full`}
                  style={{ width: `${Math.min(metric.value, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>

                {/* Threshold Markers */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-yellow-400/50"
                  style={{ left: `${metric.thresholds.warning}%` }}
                ></div>
                <div
                  className="absolute top-0 h-full w-0.5 bg-red-400/50"
                  style={{ left: `${metric.thresholds.critical}%` }}
                ></div>
              </div>

              {/* Status Text */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  {metric.value < metric.thresholds.warning && "Normal"}
                  {metric.value >= metric.thresholds.warning &&
                    metric.value < metric.thresholds.critical &&
                    "Uyarı"}
                  {metric.value >= metric.thresholds.critical && "Kritik"}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Eşik: {metric.thresholds.warning}% /{" "}
                  {metric.thresholds.critical}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Status Badge */}
      <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Genel Durum
          </span>
          <div
            className={`px-3 py-1 rounded-full text-sm font-bold ${
              data.cpu >= 85 || data.memory >= 90 || data.disk >= 95
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                : data.cpu >= 70 || data.memory >= 75 || data.disk >= 80
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                  : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            }`}
          >
            {data.cpu >= 85 || data.memory >= 90 || data.disk >= 95
              ? "🔴 Kritik"
              : data.cpu >= 70 || data.memory >= 75 || data.disk >= 80
                ? "🟡 Uyarı"
                : "🟢 Sağlıklı"}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
