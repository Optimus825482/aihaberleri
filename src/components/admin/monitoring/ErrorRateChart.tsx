"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle } from "lucide-react";

interface ErrorData {
  timestamp: string;
  count: number;
  type: string;
}

interface ErrorRateChartProps {
  data: ErrorData[];
  timeRange: string;
}

export default function ErrorRateChart({
  data,
  timeRange,
}: ErrorRateChartProps) {
  // Group errors by timestamp and type
  const chartData = data.reduce((acc: any[], error) => {
    const existing = acc.find((item) => item.timestamp === error.timestamp);
    if (existing) {
      existing[error.type] = (existing[error.type] || 0) + error.count;
      existing.total = (existing.total || 0) + error.count;
    } else {
      acc.push({
        timestamp: error.timestamp,
        [error.type]: error.count,
        total: error.count,
      });
    }
    return acc;
  }, []);

  // Sort by timestamp
  chartData.sort(
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

  // Get unique error types
  const errorTypes = Array.from(new Set(data.map((d) => d.type)));

  // Color mapping for error types
  const colorMap: Record<string, string> = {
    "4xx": "#f59e0b", // yellow
    "5xx": "#ef4444", // red
    timeout: "#8b5cf6", // purple
    network: "#3b82f6", // blue
    validation: "#ec4899", // pink
  };

  const totalErrors = chartData.reduce(
    (sum, item) => sum + (item.total || 0),
    0,
  );
  const avgErrorRate =
    chartData.length > 0 ? totalErrors / chartData.length : 0;

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 backdrop-blur-xl rounded-2xl p-6 border border-red-200 dark:border-red-800 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Hata Oranı
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Zaman içinde hata dağılımı
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {totalErrors}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Toplam Hata
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Ort: {avgErrorRate.toFixed(1)}/dönem
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
              labelFormatter={(label) => `Zaman: ${formatTimestamp(label)}`}
            />
            <Legend />
            {errorTypes.map((type) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={colorMap[type] || "#6b7280"}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name={type.toUpperCase()}
              />
            ))}
            <Line
              type="monotone"
              dataKey="total"
              stroke="#dc2626"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
              name="TOPLAM"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Error Type Summary */}
      <div className="mt-6 pt-6 border-t border-red-200 dark:border-red-800">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {errorTypes.map((type) => {
            const typeTotal = data
              .filter((d) => d.type === type)
              .reduce((sum, d) => sum + d.count, 0);
            const percentage =
              totalErrors > 0
                ? ((typeTotal / totalErrors) * 100).toFixed(1)
                : "0";

            return (
              <div key={type} className="text-center">
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: colorMap[type] || "#6b7280" }}
                ></div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {type.toUpperCase()}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {typeTotal}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  %{percentage}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert Threshold */}
      <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-400">
          <AlertTriangle className="w-4 h-4" />
          <span>
            Uyarı Eşiği:{" "}
            {avgErrorRate > 10
              ? "🔴 Yüksek hata oranı tespit edildi"
              : "🟢 Normal seviyede"}
          </span>
        </div>
      </div>
    </div>
  );
}
