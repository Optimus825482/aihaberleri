"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMemo } from "react";

interface RealtimeAreaChartProps {
  data: Array<{
    label: string;
    visitors: number;
  }>;
  title?: string;
}

export function RealtimeAreaChart({ data, title }: RealtimeAreaChartProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        current: 0,
        previous: 0,
        change: 0,
        changePercent: 0,
        trend: "neutral" as "up" | "down" | "neutral",
        max: 0,
        min: 0,
        avg: 0,
      };
    }

    const values = data.map((d) => d.visitors);
    const current = values[values.length - 1] || 0;
    const previous = values[values.length - 2] || 0;
    const change = current - previous;
    const changePercent =
      previous > 0 ? ((change / previous) * 100).toFixed(1) : 0;
    const trend =
      change > 0 ? "up" : change < 0 ? "down" : ("neutral" as const);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

    return { current, previous, change, changePercent, trend, max, min, avg };
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs font-bold text-muted-foreground mb-1">
            {label}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <p className="text-sm font-black text-foreground">
              {payload[0].value} ziyaretçi
            </p>
          </div>
          {payload[0].value > stats.avg && (
            <p className="text-[10px] text-green-500 font-bold mt-1">
              ↑ Ortalamanın üzerinde
            </p>
          )}
          {payload[0].value < stats.avg && (
            <p className="text-[10px] text-orange-500 font-bold mt-1">
              ↓ Ortalamanın altında
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* Stats Header - Google Analytics Style */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-500/10">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-3xl font-black text-blue-500 tabular-nums">
              {stats.current}
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Şu An Aktif
            </div>
          </div>
          <div className="h-10 w-px bg-blue-500/20" />
          <div className="flex items-center gap-2">
            {stats.trend === "up" && (
              <div className="flex items-center gap-1 text-green-500">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-black">
                  +{Math.abs(stats.change)}
                </span>
              </div>
            )}
            {stats.trend === "down" && (
              <div className="flex items-center gap-1 text-red-500">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-black">
                  -{Math.abs(stats.change)}
                </span>
              </div>
            )}
            {stats.trend === "neutral" && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Minus className="w-4 h-4" />
                <span className="text-sm font-black">0</span>
              </div>
            )}
            <span className="text-xs font-bold text-muted-foreground">
              vs önceki
            </span>
          </div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-lg font-black text-foreground tabular-nums">
              {stats.avg}
            </div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase">
              Ortalama
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-green-500 tabular-nums">
              {stats.max}
            </div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase">
              Pik
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              {/* Gradient for area fill */}
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              {/* Glow effect for line */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid - subtle like Google Analytics */}
            <CartesianGrid
              strokeDasharray="0"
              stroke="hsl(var(--border))"
              opacity={0.1}
              vertical={false}
            />

            {/* Average reference line */}
            <ReferenceLine
              y={stats.avg}
              stroke="#6366f1"
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.3}
            />

            <XAxis
              dataKey="label"
              tick={{
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))", opacity: 0.2 }}
              interval="preserveStartEnd"
            />

            <YAxis
              tick={{
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, "dataMax + 5"]}
            />

            <Tooltip content={<CustomTooltip />} cursor={false} />

            {/* Area with smooth curve */}
            <Area
              type="monotone"
              dataKey="visitors"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorVisitors)"
              animationDuration={800}
              animationEasing="ease-in-out"
              filter="url(#glow)"
              dot={{
                r: 0,
                strokeWidth: 0,
              }}
              activeDot={{
                r: 6,
                fill: "#3b82f6",
                stroke: "#fff",
                strokeWidth: 2,
                filter: "url(#glow)",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Mini Stats Footer */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-blue-500/10">
        <div className="text-center">
          <div className="text-xs font-black text-foreground tabular-nums">
            {data.length}
          </div>
          <div className="text-[9px] font-bold text-muted-foreground uppercase">
            Veri Noktası
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs font-black text-foreground tabular-nums">
            {stats.min}
          </div>
          <div className="text-[9px] font-bold text-muted-foreground uppercase">
            Minimum
          </div>
        </div>
        <div className="text-center">
          <div
            className={`text-xs font-black tabular-nums ${
              stats.trend === "up"
                ? "text-green-500"
                : stats.trend === "down"
                  ? "text-red-500"
                  : "text-muted-foreground"
            }`}
          >
            {stats.changePercent}%
          </div>
          <div className="text-[9px] font-bold text-muted-foreground uppercase">
            Değişim
          </div>
        </div>
      </div>
    </div>
  );
}
