"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { useFilters } from "./FilterProvider";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export function DateRangeFilter() {
  const { filters, updateFilter } = useFilters();

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilter("dateFrom", e.target.value);
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilter("dateTo", e.target.value);
  };

  const setPreset = (preset: "today" | "week" | "month" | "year") => {
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");

    switch (preset) {
      case "today":
        updateFilter("dateFrom", today);
        updateFilter("dateTo", today);
        break;
      case "week":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        updateFilter("dateFrom", format(weekAgo, "yyyy-MM-dd"));
        updateFilter("dateTo", today);
        break;
      case "month":
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        updateFilter("dateFrom", format(monthAgo, "yyyy-MM-dd"));
        updateFilter("dateTo", today);
        break;
      case "year":
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        updateFilter("dateFrom", format(yearAgo, "yyyy-MM-dd"));
        updateFilter("dateTo", today);
        break;
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Tarih Aralığı
      </label>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPreset("today")}
          className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-all"
        >
          Bugün
        </button>
        <button
          type="button"
          onClick={() => setPreset("week")}
          className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-all"
        >
          Son 7 Gün
        </button>
        <button
          type="button"
          onClick={() => setPreset("month")}
          className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-all"
        >
          Son 30 Gün
        </button>
        <button
          type="button"
          onClick={() => setPreset("year")}
          className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-all"
        >
          Son 1 Yıl
        </button>
      </div>

      {/* Date Inputs */}
      <div className="grid grid-cols-2 gap-3">
        {/* From Date */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={filters.dateFrom || ""}
            onChange={handleDateFromChange}
            className="w-full pl-10 pr-3 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [color-scheme:dark]"
            placeholder="Başlangıç"
          />
        </div>

        {/* To Date */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={filters.dateTo || ""}
            onChange={handleDateToChange}
            className="w-full pl-10 pr-3 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [color-scheme:dark]"
            placeholder="Bitiş"
          />
        </div>
      </div>

      {/* Selected Range Display */}
      {(filters.dateFrom || filters.dateTo) && (
        <div className="text-xs text-gray-400">
          {filters.dateFrom && filters.dateTo ? (
            <>
              {format(new Date(filters.dateFrom), "d MMMM yyyy", {
                locale: tr,
              })}
              {" - "}
              {format(new Date(filters.dateTo), "d MMMM yyyy", { locale: tr })}
            </>
          ) : filters.dateFrom ? (
            <>
              {format(new Date(filters.dateFrom), "d MMMM yyyy", {
                locale: tr,
              })}
              {" ve sonrası"}
            </>
          ) : (
            <>
              {format(new Date(filters.dateTo!), "d MMMM yyyy", { locale: tr })}
              {" ve öncesi"}
            </>
          )}
        </div>
      )}
    </div>
  );
}
