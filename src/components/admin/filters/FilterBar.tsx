"use client";

import React, { useState } from "react";
import { Search, X, Filter, Loader2 } from "lucide-react";
import { useFilters } from "./FilterProvider";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { DateRangeFilter } from "./DateRangeFilter";
import { StatusFilter } from "./StatusFilter";
import { RangeFilter } from "./RangeFilter";
import { SavedFiltersDropdown } from "./SavedFiltersDropdown";
import { FilterChips } from "./FilterChips";
import { useDebounce } from "@/hooks/useDebounce";

interface FilterBarProps {
  categories: string[];
  tags: string[];
}

export function FilterBar({ categories, tags }: FilterBarProps) {
  const { filters, updateFilter, clearFilters, resultCount, isLoading } =
    useFilters();
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounce search input
  useDebounce(
    () => {
      updateFilter("search", searchInput);
    },
    300,
    [searchInput],
  );

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Makale ara (başlık, içerik, yazar...)"
            className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            showAdvanced
              ? "bg-blue-500 text-white"
              : "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
          }`}
        >
          <Filter className="w-5 h-5" />
          Gelişmiş Filtreler
        </button>

        {/* Saved Filters */}
        <SavedFiltersDropdown />

        {/* Clear All */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-6 py-3 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-300 rounded-xl font-medium hover:bg-red-500/30 transition-all flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Temizle
          </button>
        )}
      </div>

      {/* Result Count */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Sonuçlar yükleniyor...</span>
          </>
        ) : (
          <span>
            <span className="text-white font-semibold">
              {resultCount.toLocaleString("tr-TR")}
            </span>{" "}
            makale bulundu
          </span>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Status Filter */}
            <StatusFilter />

            {/* Categories Filter */}
            <MultiSelectFilter
              label="Kategoriler"
              options={categories}
              value={filters.categories || []}
              onChange={(value) => updateFilter("categories", value)}
              placeholder="Kategori seçin"
            />

            {/* Tags Filter */}
            <MultiSelectFilter
              label="Etiketler"
              options={tags}
              value={filters.tags || []}
              onChange={(value) => updateFilter("tags", value)}
              placeholder="Etiket seçin"
            />

            {/* Date Range */}
            <DateRangeFilter />

            {/* Views Range */}
            <RangeFilter
              label="Görüntülenme"
              minValue={filters.viewsMin}
              maxValue={filters.viewsMax}
              onMinChange={(value) => updateFilter("viewsMin", value)}
              onMaxChange={(value) => updateFilter("viewsMax", value)}
              placeholder="Görüntülenme aralığı"
            />

            {/* Likes Range */}
            <RangeFilter
              label="Beğeni"
              minValue={filters.likesMin}
              maxValue={filters.likesMax}
              onMinChange={(value) => updateFilter("likesMin", value)}
              onMaxChange={(value) => updateFilter("likesMax", value)}
              placeholder="Beğeni aralığı"
            />
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && <FilterChips />}
    </div>
  );
}
