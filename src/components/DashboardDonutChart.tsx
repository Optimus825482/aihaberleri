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
        Veri bulunamadı
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 py-4">
      {/* SVG Donut */}
      <div className="relative w-48 h-48 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
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
                className="transition-all duration-1000 ease-out hover:stroke-white hover:cursor-pointer"
                style={{ strokeLinecap: "round" }}
              />
            );
          })}
          {/* Inner hole */}
          <circle cx="50" cy="50" r="30" className="fill-card" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black">{total}</span>
          <span className="text-[10px] uppercase tracking-tighter text-muted-foreground font-bold">
            Toplam Haber
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 grid grid-cols-1 gap-2 w-full">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm font-semibold truncate max-w-[120px]">
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-muted-foreground">{item.value} adet</span>
              <span className="font-bold w-10 text-right text-primary">
                %{item.percentage.toFixed(0)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
