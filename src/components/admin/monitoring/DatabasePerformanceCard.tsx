"use client";

import { Database, Activity, Clock, Users } from "lucide-react";

interface DatabaseData {
  activeConnections: number;
  slowQueries: number;
  avgQueryTime: number;
  poolUtilization: number;
}

interface DatabasePerformanceCardProps {
  data: DatabaseData;
}

export default function DatabasePerformanceCard({
  data,
}: DatabasePerformanceCardProps) {
  const getConnectionStatus = (utilization: number) => {
    if (utilization >= 90)
      return { color: "text-red-500", bg: "bg-red-500", label: "Kritik" };
    if (utilization >= 70)
      return { color: "text-yellow-500", bg: "bg-yellow-500", label: "Yüksek" };
    return { color: "text-green-500", bg: "bg-green-500", label: "Normal" };
  };

  const getQueryTimeStatus = (avgTime: number) => {
    if (avgTime >= 1000) return { color: "text-red-500", label: "Çok Yavaş" };
    if (avgTime >= 500) return { color: "text-yellow-500", label: "Yavaş" };
    if (avgTime >= 100) return { color: "text-blue-500", label: "Orta" };
    return { color: "text-green-500", label: "Hızlı" };
  };

  const connectionStatus = getConnectionStatus(data.poolUtilization);
  const queryTimeStatus = getQueryTimeStatus(data.avgQueryTime);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-200 dark:border-purple-800 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="w-6 h-6 text-purple-500" />
          Veritabanı Performansı
        </h3>
        <div
          className={`px-3 py-1 rounded-full text-sm font-bold ${connectionStatus.color}`}
        >
          {connectionStatus.label}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Active Connections */}
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Aktif Bağlantı
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.activeConnections}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Pool: %{data.poolUtilization.toFixed(1)}
          </div>
        </div>

        {/* Slow Queries */}
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Yavaş Sorgu
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.slowQueries}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {data.slowQueries > 10 ? "⚠️ Yüksek" : "✅ Normal"}
          </div>
        </div>
      </div>

      {/* Average Query Time */}
      <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Ortalama Sorgu Süresi
            </span>
          </div>
          <span className={`text-lg font-bold ${queryTimeStatus.color}`}>
            {data.avgQueryTime.toFixed(2)}ms
          </span>
        </div>

        {/* Query Time Progress Bar */}
        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out rounded-full ${
              data.avgQueryTime >= 1000
                ? "bg-red-500"
                : data.avgQueryTime >= 500
                  ? "bg-yellow-500"
                  : data.avgQueryTime >= 100
                    ? "bg-blue-500"
                    : "bg-green-500"
            }`}
            style={{
              width: `${Math.min((data.avgQueryTime / 1000) * 100, 100)}%`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-500">
          <span>{queryTimeStatus.label}</span>
          <span>Eşik: 100ms / 500ms / 1000ms</span>
        </div>
      </div>

      {/* Connection Pool Visualization */}
      <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Connection Pool Kullanımı
          </span>
          <span className={`text-sm font-bold ${connectionStatus.color}`}>
            %{data.poolUtilization.toFixed(1)}
          </span>
        </div>

        {/* Pool Progress Bar */}
        <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full ${connectionStatus.bg} transition-all duration-500 ease-out rounded-full`}
            style={{ width: `${Math.min(data.poolUtilization, 100)}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          </div>

          {/* Threshold Markers */}
          <div className="absolute top-0 left-[70%] h-full w-0.5 bg-yellow-400/50"></div>
          <div className="absolute top-0 left-[90%] h-full w-0.5 bg-red-400/50"></div>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-500">
          <span>0%</span>
          <span>70%</span>
          <span>90%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-800">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div className="font-medium mb-2">💡 Performans İpuçları:</div>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {data.slowQueries > 10 && (
              <li>
                • Yavaş sorguları optimize edin (EXPLAIN ANALYZE kullanın)
              </li>
            )}
            {data.poolUtilization > 70 && (
              <li>• Connection pool boyutunu artırmayı düşünün</li>
            )}
            {data.avgQueryTime > 500 && (
              <li>• Index'leri kontrol edin ve optimize edin</li>
            )}
            {data.activeConnections > 50 && (
              <li>• Connection pooling stratejisini gözden geçirin</li>
            )}
            {data.slowQueries <= 10 &&
              data.poolUtilization <= 70 &&
              data.avgQueryTime <= 500 && (
                <li>✅ Veritabanı performansı optimal seviyede</li>
              )}
          </ul>
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
