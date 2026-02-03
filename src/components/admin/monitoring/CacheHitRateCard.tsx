"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Zap, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface CacheData {
  hitRate: number;
  missRate: number;
  evictions: number;
  memoryUsage: number;
}

interface CacheHitRateCardProps {
  data: CacheData;
}

export default function CacheHitRateCard({ data }: CacheHitRateCardProps) {
  const pieData = [
    { name: "Hit", value: data.hitRate, color: "#10b981" },
    { name: "Miss", value: data.missRate, color: "#ef4444" },
  ];

  const getHitRateStatus = (rate: number) => {
    if (rate >= 90)
      return {
        color: "text-green-500",
        label: "🟢 Mükemmel",
        bg: "bg-green-100 dark:bg-green-900/30",
      };
    if (rate >= 70)
      return {
        color: "text-blue-500",
        label: "🔵 İyi",
        bg: "bg-blue-100 dark:bg-blue-900/30",
      };
    if (rate >= 50)
      return {
        color: "text-yellow-500",
        label: "🟡 Orta",
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
      };
    return {
      color: "text-red-500",
      label: "🔴 Düşük",
      bg: "bg-red-100 dark:bg-red-900/30",
    };
  };

  const getMemoryStatus = (usage: number) => {
    if (usage >= 90) return { color: "text-red-500", bg: "bg-red-500" };
    if (usage >= 75) return { color: "text-yellow-500", bg: "bg-yellow-500" };
    return { color: "text-green-500", bg: "bg-green-500" };
  };

  const hitRateStatus = getHitRateStatus(data.hitRate);
  const memoryStatus = getMemoryStatus(data.memoryUsage);

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-200 dark:border-cyan-800 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-500" />
            Cache Performansı
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Hit rate ve bellek kullanımı
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-bold ${hitRateStatus.bg} ${hitRateStatus.color}`}
        >
          {hitRateStatus.label}
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Hit Rate */}
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Hit Rate
            </span>
          </div>
          <div className="text-4xl font-bold text-green-600 dark:text-green-400">
            {data.hitRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Cache başarı oranı
          </div>
        </div>

        {/* Miss Rate */}
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Miss Rate
            </span>
          </div>
          <div className="text-4xl font-bold text-red-600 dark:text-red-400">
            {data.missRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Cache kaçırma oranı
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="h-48 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `${value.toFixed(1)}%`}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Evictions */}
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Evictions
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.evictions}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {data.evictions > 100 ? "⚠️ Yüksek" : "✅ Normal"}
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Bellek
            </span>
          </div>
          <div className={`text-2xl font-bold ${memoryStatus.color}`}>
            {data.memoryUsage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Cache bellek kullanımı
          </div>
        </div>
      </div>

      {/* Memory Usage Progress Bar */}
      <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Bellek Kullanımı
          </span>
          <span className={`text-sm font-bold ${memoryStatus.color}`}>
            %{data.memoryUsage.toFixed(1)}
          </span>
        </div>

        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full ${memoryStatus.bg} transition-all duration-500 ease-out rounded-full`}
            style={{ width: `${Math.min(data.memoryUsage, 100)}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </div>

          {/* Threshold Markers */}
          <div className="absolute top-0 left-[75%] h-full w-0.5 bg-yellow-400/50"></div>
          <div className="absolute top-0 left-[90%] h-full w-0.5 bg-red-400/50"></div>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-500">
          <span>Normal</span>
          <span>Uyarı (75%)</span>
          <span>Kritik (90%)</span>
        </div>
      </div>

      {/* Performance Recommendations */}
      <div className="mt-6 pt-6 border-t border-cyan-200 dark:border-cyan-800">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div className="font-medium mb-2">💡 Optimizasyon Önerileri:</div>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {data.hitRate < 70 && (
              <li>• Cache stratejisini gözden geçirin (TTL, invalidation)</li>
            )}
            {data.evictions > 100 && (
              <li>• Cache boyutunu artırmayı düşünün</li>
            )}
            {data.memoryUsage > 90 && (
              <li>• Bellek kullanımı kritik seviyede, temizlik yapın</li>
            )}
            {data.missRate > 30 && (
              <li>• Sık kullanılan verileri pre-cache edin</li>
            )}
            {data.hitRate >= 90 &&
              data.evictions <= 100 &&
              data.memoryUsage <= 75 && (
                <li>✅ Cache performansı optimal seviyede</li>
              )}
          </ul>
        </div>
      </div>

      {/* Performance Thresholds */}
      <div className="mt-4 p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
        <div className="text-sm text-cyan-800 dark:text-cyan-400">
          <div className="font-medium mb-2">Performans Eşikleri:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>🟢 Mükemmel: ≥ 90%</div>
            <div>🔵 İyi: 70-90%</div>
            <div>🟡 Orta: 50-70%</div>
            <div>🔴 Düşük: &lt; 50%</div>
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
