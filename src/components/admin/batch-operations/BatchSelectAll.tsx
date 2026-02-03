"use client";

import React, { memo, useEffect } from "react";
import { useBatchSelection } from "./BatchSelectionProvider";

interface BatchSelectAllProps {
  allIds: string[];
  className?: string;
}

export const BatchSelectAll = memo(function BatchSelectAll({
  allIds,
  className = "",
}: BatchSelectAllProps) {
  const { selectedIds, selectAll, clearSelection, selectedCount } =
    useBatchSelection();

  const allSelected = allIds.length > 0 && selectedCount === allIds.length;
  const someSelected = selectedCount > 0 && selectedCount < allIds.length;

  const handleChange = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(allIds);
    }
  };

  // Keyboard shortcut: Ctrl+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        selectAll(allIds);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [allIds, selectAll]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="checkbox"
        checked={allSelected}
        ref={(input) => {
          if (input) {
            input.indeterminate = someSelected;
          }
        }}
        onChange={handleChange}
        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all hover:scale-110"
        aria-label="Select all items"
      />
      <span className="text-sm text-gray-600">
        {selectedCount > 0 ? `${selectedCount} seçili` : "Tümünü seç"}
      </span>
      {selectedCount > 0 && (
        <span className="text-xs text-gray-400">(Ctrl+A: Tümünü seç)</span>
      )}
    </div>
  );
});
