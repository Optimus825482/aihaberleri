"use client";

import React from "react";
import { X } from "lucide-react";
import { useFilters } from "./FilterProvider";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

/**
 * FilterChips component displays active filters as removable chips
 * Provides quick visual feedback and easy filter removal
 */
export function FilterChips() {
  const { filters, updateFilter, clearFilters } = useFilters();

  const chips: Array<{
    key: string;
    label: string;
    value: string;
    onRemove: () => void;
  }> = [];

  // Search chip
  if (filters.search) {
    chips.push({
      key: "search",
      label: "Arama",
      value: filters.search,
      onRemove: () => updateFilter("search", undefined),
    });
  }

  // Categories chips
  if (filters.categories && filters.categories.length > 0) {
    filters.categories.forEach((category, index) => {
      chips.push({
        key: `category-${index}`,
        label: "Kategori",
        value: category,
        onRemove: () => {
          const newCategories = filters.categories!.filter(
            (c) => c !== category,
          );
          updateFilter(
            "categories",
            newCategories.length > 0 ? newCategories : undefined,
          );
        },
      });
    });
  }

  // Tags chips
  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach((tag, index) => {
      chips.push({
        key: `tag-${index}`,
        label: "Etiket",
        value: tag,
        onRemove: () => {
          const newTags = filters.tags!.filter((t) => t !== tag);
          updateFilter("tags", newTags.length > 0 ? newTags : undefined);
        },
      });
    });
  }

  // Status chips
  if (filters.status && filters.status.length > 0) {
    filters.status.forEach((status, index) => {
      const statusLabels: Record<string, string> = {
        published: "Yayında",
        draft: "Taslak",
        archived: "Arşivlendi",
        scheduled: "Zamanlanmış",
      };

      chips.push({
        key: `status-${index}`,
        label: "Durum",
        value: statusLabels[status] || status,
        onRemove: () => {
          const newStatus = filters.status!.filter((s) => s !== status);
          updateFilter("status", newStatus.length > 0 ? newStatus : undefined);
        },
      });
    });
  }

  // Date range chip
  if (filters.dateFrom || filters.dateTo) {
    let dateValue = "";
    if (filters.dateFrom && filters.dateTo) {
      dateValue = `${format(new Date(filters.dateFrom), "d MMM", { locale: tr })} - ${format(new Date(filters.dateTo), "d MMM", { locale: tr })}`;
    } else if (filters.dateFrom) {
      dateValue = `${format(new Date(filters.dateFrom), "d MMM", { locale: tr })} ve sonrası`;
    } else if (filters.dateTo) {
      dateValue = `${format(new Date(filters.dateTo), "d MMM", { locale: tr })} ve öncesi`;
    }

    chips.push({
      key: "dateRange",
      label: "Tarih",
      value: dateValue,
      onRemove: () => {
        updateFilter("dateFrom", undefined);
        updateFilter("dateTo", undefined);
      },
    });
  }

  // Views range chip
  if (filters.viewsMin !== undefined || filters.viewsMax !== undefined) {
    let viewsValue = "";
    if (filters.viewsMin !== undefined && filters.viewsMax !== undefined) {
      viewsValue = `${filters.viewsMin.toLocaleString("tr-TR")} - ${filters.viewsMax.toLocaleString("tr-TR")}`;
    } else if (filters.viewsMin !== undefined) {
      viewsValue = `${filters.viewsMin.toLocaleString("tr-TR")}+`;
    } else if (filters.viewsMax !== undefined) {
      viewsValue = `≤ ${filters.viewsMax.toLocaleString("tr-TR")}`;
    }

    chips.push({
      key: "viewsRange",
      label: "Görüntülenme",
      value: viewsValue,
      onRemove: () => {
        updateFilter("viewsMin", undefined);
        updateFilter("viewsMax", undefined);
      },
    });
  }

  // Likes range chip
  if (filters.likesMin !== undefined || filters.likesMax !== undefined) {
    let likesValue = "";
    if (filters.likesMin !== undefined && filters.likesMax !== undefined) {
      likesValue = `${filters.likesMin.toLocaleString("tr-TR")} - ${filters.likesMax.toLocaleString("tr-TR")}`;
    } else if (filters.likesMin !== undefined) {
      likesValue = `${filters.likesMin.toLocaleString("tr-TR")}+`;
    } else if (filters.likesMax !== undefined) {
      likesValue = `≤ ${filters.likesMax.toLocaleString("tr-TR")}`;
    }

    chips.push({
      key: "likesRange",
      label: "Beğeni",
      value: likesValue,
      onRemove: () => {
        updateFilter("likesMin", undefined);
        updateFilter("likesMax", undefined);
      },
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-400 font-medium">
        Aktif Filtreler:
      </span>

      {chips.map((chip) => (
        <div
          key={chip.key}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-300 hover:bg-blue-500/30 transition-all group"
        >
          <span className="font-medium text-blue-200">{chip.label}:</span>
          <span className="truncate max-w-[200px]">{chip.value}</span>
          <button
            onClick={chip.onRemove}
            className="p-0.5 hover:bg-blue-500/40 rounded transition-colors"
            aria-label={`${chip.label} filtresini kaldır`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {chips.length > 1 && (
        <button
          onClick={clearFilters}
          className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-300 hover:bg-red-500/30 transition-all font-medium"
        >
          Tümünü Temizle
        </button>
      )}
    </div>
  );
}

/**
 * Example usage:
 *
 * <FilterProvider>
 *   <FilterBar categories={categories} tags={tags} />
 *   <FilterChips />
 *   <ArticleList />
 * </FilterProvider>
 */
