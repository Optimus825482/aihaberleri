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
      <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
        <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-wider">
          Veri Yükleniyor...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {data.slice(0, 6).map((item, index) => {
        const percentage =
          total > 0 ? Math.round((item.value / total) * 100) : 0;
        const width = (item.value / maxValue) * 100;
        const flag = FLAG_MAP[item.name] || "🌍";

        return (
          <div
            key={item.name}
            className="group hover:bg-white/5 rounded-lg px-3 py-2 -mx-3 transition-all duration-300 cursor-pointer border border-transparent hover:border-emerald-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xl group-hover:scale-110 transition-transform">
                  {flag}
                </span>
                <span className="text-sm font-bold text-foreground/70 group-hover:text-foreground transition-colors">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-500 tabular-nums">
                  {item.value}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  ({percentage}%)
                </span>
              </div>
            </div>
            <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
              {/* Background glow */}
              <div
                className={`absolute inset-0 ${COLORS[index % COLORS.length]} opacity-20 blur-sm`}
                style={{ width: `${width}%` }}
              />
              {/* Actual bar */}
              <div
                className={`relative h-full ${COLORS[index % COLORS.length]} rounded-full transition-all duration-700 ease-out group-hover:brightness-125`}
                style={{ width: `${width}%` }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-gradient" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
