"use client";

import { Activity, CheckCircle, XCircle, Clock, Zap } from "lucide-react";

interface Worker {
  id: string;
  name: string;
  status: "active" | "idle" | "error";
  lastRun: string;
  jobsProcessed: number;
}

interface WorkerStatusTimelineProps {
  workers: Worker[];
}

export default function WorkerStatusTimeline({
  workers,
}: WorkerStatusTimelineProps) {
  const getStatusColor = (status: Worker["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "idle":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: Worker["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "idle":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: Worker["status"]) => {
    switch (status) {
      case "active":
        return "Aktif";
      case "idle":
        return "Beklemede";
      case "error":
        return "Hata";
      default:
        return "Bilinmiyor";
    }
  };

  const formatLastRun = (lastRun: string) => {
    const date = new Date(lastRun);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Az önce";
    if (diffMins < 60) return `${diffMins} dakika önce`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} saat önce`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} gün önce`;
  };

  const activeCount = workers.filter((w) => w.status === "active").length;
  const errorCount = workers.filter((w) => w.status === "error").length;
  const totalJobs = workers.reduce((sum, w) => sum + w.jobsProcessed, 0);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-200 dark:border-blue-800 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Worker Durumu
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {workers.length} worker izleniyor
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activeCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Aktif
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {errorCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Hata</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalJobs}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              İşlem
            </div>
          </div>
        </div>
      </div>

      {/* Worker List */}
      <div className="space-y-3">
        {workers.map((worker, index) => (
          <div
            key={worker.id}
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              {/* Worker Info */}
              <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                  {getStatusIcon(worker.status)}
                  <div
                    className={`absolute -top-1 -right-1 w-3 h-3 ${getStatusColor(
                      worker.status,
                    )} rounded-full ${
                      worker.status === "active" ? "animate-pulse" : ""
                    }`}
                  ></div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {worker.name}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        worker.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : worker.status === "idle"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {getStatusText(worker.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatLastRun(worker.lastRun)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {worker.jobsProcessed.toLocaleString()} işlem
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-32">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      worker.status === "active"
                        ? "bg-green-500"
                        : worker.status === "idle"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    } transition-all duration-300`}
                    style={{
                      width: `${
                        worker.status === "active"
                          ? 100
                          : worker.status === "idle"
                            ? 50
                            : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {workers.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Henüz worker bulunamadı</p>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Worker'lar her 5 saniyede bir otomatik güncellenir
        </p>
      </div>
    </div>
  );
}
