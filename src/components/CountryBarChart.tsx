"use client";

import { useMemo } from "react";

interface CountryBarChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const FLAG_MAP: Record<string, string> = {
  Turkey: "🇹🇷",
  "United States": "🇺🇸",
  Germany: "🇩🇪",
  "United Kingdom": "🇬🇧",
  France: "🇫🇷",
  Netherlands: "🇳🇱",
  Russia: "🇷🇺",
  India: "🇮🇳",
  Japan: "🇯🇵",
  China: "🇨🇳",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  Australia: "🇦🇺",
  Italy: "🇮🇹",
  Spain: "🇪🇸",
  Unknown: "🌍",
};

const COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-orange-500",
  "bg-teal-500",
];

export function CountryBarChart({ data }: CountryBarChartProps) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );
  const total = useMemo(
    () => data.reduce((acc, d) => acc + d.value, 0),
    [data],
  );

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Veri yok
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 6).map((item, index) => {
        const percentage =
          total > 0 ? Math.round((item.value / total) * 100) : 0;
        const width = (item.value / maxValue) * 100;
        const flag = FLAG_MAP[item.name] || "🌍";

        return (
          <div key={item.name} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{flag}</span>
                <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                  {item.name}
                </span>
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                {item.value} ({percentage}%)
              </span>
            </div>
            <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
              <div
                className={`h-full ${COLORS[index % COLORS.length]} rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
