"use client";

import React from "react";
import { Check } from "lucide-react";
import { useFilters } from "./FilterProvider";

const STATUS_OPTIONS = [
  { value: "published", label: "Yayında", color: "bg-green-500" },
  { value: "draft", label: "Taslak", color: "bg-yellow-500" },
  { value: "archived", label: "Arşivlendi", color: "bg-gray-500" },
  { value: "scheduled", label: "Zamanlanmış", color: "bg-blue-500" },
];

export function StatusFilter() {
  const { filters, updateFilter } = useFilters();
  const selectedStatuses = filters.status || [];

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      updateFilter(
        "status",
        selectedStatuses.filter((s) => s !== status),
      );
    } else {
      updateFilter("status", [...selectedStatuses, status]);
    }
  };

  const selectAll = () => {
    updateFilter(
      "status",
      STATUS_OPTIONS.map((opt) => opt.value),
    );
  };

  const clearAll = () => {
    updateFilter("status", []);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">Durum</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Tümü
          </button>
          {selectedStatuses.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {STATUS_OPTIONS.map((option) => {
          const isSelected = selectedStatuses.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleStatus(option.value)}
              className={`w-full px-4 py-3 rounded-lg transition-all flex items-center justify-between ${
                isSelected
                  ? "bg-white/20 border-2 border-white/40"
                  : "bg-white/10 border border-white/20 hover:bg-white/15"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${option.color}`} />
                <span className="text-white font-medium">{option.label}</span>
              </div>
              {isSelected && <Check className="w-5 h-5 text-blue-400" />}
            </button>
          );
        })}
      </div>

      {/* Selected Count */}
      {selectedStatuses.length > 0 && (
        <div className="text-xs text-gray-400 text-center">
          {selectedStatuses.length} durum seçili
        </div>
      )}
    </div>
  );
}
