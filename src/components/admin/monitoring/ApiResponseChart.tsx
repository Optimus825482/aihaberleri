"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Zap } from "lucide-react";

interface ApiResponseData {
  timestamp: string;
  avgTime: number;
  p95: number;
  p99: number;
}

interface ApiResponseChartProps {
  data: ApiResponseData[];
  timeRange: string;
}

export default function ApiResponseChart({
  data,
  timeRange,
}: ApiResponseChartProps) {
  // Sort by timestamp
  const sortedData = [...data].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Format timestamp based on time range
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (timeRange === "1h" || timeRange === "6h") {
      return date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (timeRange === "24h") {
      return date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("tr-TR", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Calculate statistics
  const avgResponseTime =
    sortedData.length > 0
      ? sortedData.reduce((sum, item) => sum + item.avgTime, 0) /
        sortedData.length
      : 0;

  const maxP99 =
    sortedData.length > 0 ? Math.max(...sortedData.map((d) => d.p99)) : 0;

  const getPerformanceStatus = (avg: number) => {
    if (avg < 100)
      return {
        color: "text-green-500",
        label: "🟢 Mükemmel",
        bg: "bg-green-100 dark:bg-green-900/30",
      };
    if (avg < 300)
      return {
        color: "text-blue-500",
        label: "🔵 İyi",
        bg: "bg-blue-100 dark:bg-blue-900/30",
      };
    if (avg < 500)
      return {
        color: "text-yellow-500",
        label: "🟡 Orta",
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
      };
    return {
      color: "text-red-500",
      label: "🔴 Yavaş",
      bg: "bg-red-100 dark:bg-red-900/30",
    };
  };

  const status = getPerformanceStatus(avgResponseTime);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl rounded-2xl p-6 border border-green-200 dark:border-green-800 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-green-500" />
            API Yanıt Süreleri
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Ortalama, P95 ve P99 metrikleri
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${status.color}`}>
            {avgResponseTime.toFixed(0)}ms
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Ortalama
          </div>
          <div
            className={`text-xs font-medium mt-1 px-2 py-1 rounded ${status.bg} ${status.color}`}
          >
            {status.label}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sortedData}>
            <defs>
              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorP99" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
              label={{ value: "ms", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
              labelFormatter={(label) => `Zaman: ${formatTimestamp(label)}`}
              formatter={(value: number) => [`${value.toFixed(2)}ms`, ""]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="avgTime"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAvg)"
              name="Ortalama"
            />
            <Area
              type="monotone"
              dataKey="p95"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorP95)"
              name="P95"
            />
            <Area
              type="monotone"
              dataKey="p99"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorP99)"
              name="P99"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Metrics */}
      <div className="mt-6 pt-6 border-t border-green-200 dark:border-green-800">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Ortalama
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {avgResponseTime.toFixed(0)}ms
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {avgResponseTime < 100
                ? "Mükemmel"
                : avgResponseTime < 300
                  ? "İyi"
                  : "Yavaş"}
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              P95
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {sortedData.length > 0
                ? (
                    sortedData.reduce((sum, item) => sum + item.p95, 0) /
                    sortedData.length
                  ).toFixed(0)
                : 0}
              ms
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              %95 kullanıcı
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              P99
            </div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {maxP99.toFixed(0)}ms
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              En yavaş %1
            </div>
          </div>
        </div>
      </div>

      {/* Performance Thresholds */}
      <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
        <div className="text-sm text-blue-800 dark:text-blue-400">
          <div className="font-medium mb-2">Performans Eşikleri:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>🟢 Mükemmel: &lt; 100ms</div>
            <div>🔵 İyi: 100-300ms</div>
            <div>🟡 Orta: 300-500ms</div>
            <div>🔴 Yavaş: &gt; 500ms</div>
          </div>
        </div>
      </div>
    </div>
  );
}
