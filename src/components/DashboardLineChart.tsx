"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

export function DashboardLineChart({
  data,
  title = "İçerik Trendi",
}: {
  data: any[];
  title?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm italic">
        Veri bulunamadı
      </div>
    );
  }

  return (
    <div className="w-full h-[300px] pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#ffffff10"
          />
          <XAxis
            dataKey="label"
            stroke="#888888"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            stroke="#888888"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b", // zinc-950
              border: "1px solid #27272a", // zinc-800
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            itemStyle={{ color: "#e4e4e7" }} // zinc-200
            cursor={{ stroke: "#3b82f6", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCount)"
            activeDot={{ r: 6, strokeWidth: 0, fill: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
