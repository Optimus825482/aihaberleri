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
import { Clock } from "lucide-react";

interface TimelineData {
  timestamp: string;
  searxng: number;
  brave: number;
  tavily: number;
}

interface ProviderTimelineChartProps {
  timeline: TimelineData[];
}

export default function ProviderTimelineChart({
  timeline,
}: ProviderTimelineChartProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-2">
            {formatTimestamp(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-gray-700 dark:text-gray-300">
                  {entry.name}:
                </span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">
                {entry.value} istek
              </span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Toplam:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {payload.reduce(
                  (sum: number, entry: any) => sum + entry.value,
                  0,
                )}{" "}
                istek
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  const totalRequests = timeline.reduce(
    (sum, item) => sum + item.searxng + item.brave + item.tavily,
    0,
  );
  const avgPerPeriod =
    timeline.length > 0 ? totalRequests / timeline.length : 0;

  const providerTotals = {
    searxng: timeline.reduce((sum, item) => sum + item.searxng, 0),
    brave: timeline.reduce((sum, item) => sum + item.brave, 0),
    tavily: timeline.reduce((sum, item) => sum + item.tavily, 0),
  };

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-200 dark:border-cyan-800 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-cyan-500" />
            İstek Zaman Çizelgesi
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Son 24 saat içindeki istek dağılımı
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
            {totalRequests.toLocaleString("tr-TR")}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Toplam İstek
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Ort: {avgPerPeriod.toFixed(0)}/dönem
          </div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
            />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
              className="dark:stroke-gray-400"
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
              className="dark:stroke-gray-400"
              label={{
                value: "İstek Sayısı",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: "12px", fill: "#6b7280" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {value}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="searxng"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4, fill: "#10b981" }}
              activeDot={{ r: 6 }}
              name="SearXNG"
            />
            <Line
              type="monotone"
              dataKey="brave"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: "#3b82f6" }}
              activeDot={{ r: 6 }}
              name="Brave"
            />
            <Line
              type="monotone"
              dataKey="tavily"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 4, fill: "#8b5cf6" }}
              activeDot={{ r: 6 }}
              name="Tavily"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Provider Statistics */}
      <div className="mt-6 pt-6 border-t border-cyan-200 dark:border-cyan-800">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                SearXNG
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {providerTotals.searxng.toLocaleString("tr-TR")}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Ort: {(providerTotals.searxng / timeline.length).toFixed(0)}/dönem
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Brave
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {providerTotals.brave.toLocaleString("tr-TR")}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Ort: {(providerTotals.brave / timeline.length).toFixed(0)}/dönem
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tavily
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {providerTotals.tavily.toLocaleString("tr-TR")}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Ort: {(providerTotals.tavily / timeline.length).toFixed(0)}/dönem
            </div>
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="mt-4 p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
        <div className="text-sm text-cyan-800 dark:text-cyan-400">
          <span className="font-medium">📊 Analiz:</span>{" "}
          {timeline.length > 0 && (
            <>
              Son dönemde{" "}
              {timeline[timeline.length - 1].searxng +
                timeline[timeline.length - 1].brave +
                timeline[timeline.length - 1].tavily}{" "}
              istek işlendi.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
