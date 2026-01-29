"use client";

import React from "react";

interface DataPoint {
  name: string;
  value: number;
  percentage: number;
}

interface DashboardDonutChartProps {
  data: DataPoint[];
  title?: string;
}

export function DashboardDonutChart({ data }: DashboardDonutChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let cumulativePercentage = 0;

  const colors = [
    "#3B82F6", // Blue
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#6366F1", // Indigo
  ];

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground italic">
        <div className="w-16 h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-wider">
          Veri Yükleniyor...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 py-4">
      {/* SVG Donut with Glow Effect */}
      <div className="relative w-48 h-48 shrink-0">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent blur-xl animate-pulse" />

        <svg
          viewBox="0 0 100 100"
          className="w-full h-full -rotate-90 relative z-10"
        >
          <defs>
            {/* Glow filter for segments */}
            <filter id="segment-glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {data.map((item, index) => {
            const startPercentage = cumulativePercentage;
            cumulativePercentage += (item.value / total) * 100;

            // Calculate SVG stroke parameters
            const radius = 40;
            const circumference = 2 * Math.PI * radius;
            const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
            const strokeDashoffset = -(startPercentage / 100) * circumference;

            return (
              <circle
                key={index}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={colors[index % colors.length]}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out hover:stroke-white hover:cursor-pointer hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                style={{ strokeLinecap: "round", filter: "url(#segment-glow)" }}
              />
            );
          })}
          {/* Inner hole with gradient */}
          <circle cx="50" cy="50" r="30" className="fill-card" />
        </svg>

        {/* Center stats with cyberpunk styling */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-4xl font-black bg-gradient-to-br from-violet-400 to-purple-600 bg-clip-text text-transparent tabular-nums">
            {total}
          </span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black mt-1">
            TOPLAM
          </span>
        </div>
      </div>

      {/* Legend with enhanced styling */}
      <div className="flex-1 grid grid-cols-1 gap-2.5 w-full">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between group hover:bg-white/5 rounded-lg px-3 py-2 transition-all duration-300 cursor-pointer border border-transparent hover:border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className="w-3 h-3 rounded-full shrink-0 group-hover:scale-125 transition-transform relative z-10"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                {/* Glow effect on hover */}
                <div
                  className="absolute inset-0 w-3 h-3 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
              </div>
              <span className="text-sm font-bold truncate max-w-[120px] group-hover:text-white transition-colors">
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-muted-foreground font-semibold">
                {item.value}
              </span>
              <div className="flex items-center gap-1">
                <div className="h-1 w-8 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: colors[index % colors.length],
                    }}
                  />
                </div>
                <span
                  className="font-black w-10 text-right"
                  style={{ color: colors[index % colors.length] }}
                >
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
