"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface ProviderStats {
  usagePercent: number;
}

interface ProviderUsageChartProps {
  data: {
    searxng: ProviderStats;
    brave: ProviderStats;
    tavily: ProviderStats;
  };
}

export default function ProviderUsageChart({ data }: ProviderUsageChartProps) {
  const chartData = [
    {
      name: "SearXNG",
      value: data.searxng.usagePercent,
      color: "#10b981", // Green
    },
    {
      name: "Brave",
      value: data.brave.usagePercent,
      color: "#3b82f6", // Blue
    },
    {
      name: "Tavily",
      value: data.tavily.usagePercent,
      color: "#8b5cf6", // Purple
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">
            {payload[0].name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Kullanım:{" "}
            <span className="font-bold">{payload[0].value.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const totalUsage = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 backdrop-blur-xl rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-500" />
            Kullanım Dağılımı
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Sağlayıcılar arası kullanım yüzdesi
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {totalUsage.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Toplam Kullanım
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {value} ({entry.payload.value.toFixed(1)}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Provider Breakdown */}
      <div className="mt-6 pt-6 border-t border-indigo-200 dark:border-indigo-800">
        <div className="space-y-3">
          {chartData.map((provider) => (
            <div
              key={provider.name}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: provider.color }}
                ></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {provider.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${provider.value}%`,
                      backgroundColor: provider.color,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white w-12 text-right">
                  {provider.value.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-4 p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
        <div className="text-sm text-indigo-800 dark:text-indigo-400">
          <span className="font-medium">💡 Öneri:</span>{" "}
          {data.searxng.usagePercent >= 80
            ? "SearXNG kullanımı hedef seviyede. Mükemmel!"
            : `SearXNG kullanımını artırın (Hedef: %80, Mevcut: %${data.searxng.usagePercent.toFixed(1)})`}
        </div>
      </div>
    </div>
  );
}
