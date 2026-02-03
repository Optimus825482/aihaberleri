"use client";

import React from "react";
import { Minus } from "lucide-react";

interface RangeFilterProps {
  label: string;
  minValue?: number;
  maxValue?: number;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
  placeholder?: string;
}

export function RangeFilter({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  placeholder = "Aralık",
}: RangeFilterProps) {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onMinChange(value === "" ? undefined : parseInt(value));
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onMaxChange(value === "" ? undefined : parseInt(value));
  };

  const clearRange = () => {
    onMinChange(undefined);
    onMaxChange(undefined);
  };

  const hasValue = minValue !== undefined || maxValue !== undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
        {hasValue && (
          <button
            type="button"
            onClick={clearRange}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Temizle
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Min Input */}
        <div className="flex-1">
          <input
            type="number"
            value={minValue ?? ""}
            onChange={handleMinChange}
            placeholder="Min"
            className="w-full px-3 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            min="0"
          />
        </div>

        {/* Separator */}
        <Minus className="w-4 h-4 text-gray-400 flex-shrink-0" />

        {/* Max Input */}
        <div className="flex-1">
          <input
            type="number"
            value={maxValue ?? ""}
            onChange={handleMaxChange}
            placeholder="Max"
            className="w-full px-3 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            min="0"
          />
        </div>
      </div>

      {/* Range Display */}
      {hasValue && (
        <div className="text-xs text-gray-400">
          {minValue !== undefined && maxValue !== undefined ? (
            <>
              {minValue.toLocaleString("tr-TR")} -{" "}
              {maxValue.toLocaleString("tr-TR")}
            </>
          ) : minValue !== undefined ? (
            <>{minValue.toLocaleString("tr-TR")} ve üzeri</>
          ) : (
            <>{maxValue!.toLocaleString("tr-TR")} ve altı</>
          )}
        </div>
      )}
    </div>
  );
}
