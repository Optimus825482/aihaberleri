"use client";

import React, { memo, useEffect, useState } from "react";
import { useBatchSelection } from "./BatchSelectionProvider";
import { Trash2, Archive, Eye, EyeOff, X } from "lucide-react";
import toast from "react-hot-toast";

interface FloatingActionBarProps {
  onDelete?: (ids: string[]) => Promise<void>;
  onArchive?: (ids: string[]) => Promise<void>;
  onPublish?: (ids: string[]) => Promise<void>;
  onUnpublish?: (ids: string[]) => Promise<void>;
  onProgressStart?: () => void;
}

export const FloatingActionBar = memo(function FloatingActionBar({
  onDelete,
  onArchive,
  onPublish,
  onUnpublish,
  onProgressStart,
}: FloatingActionBarProps) {
  const { selectedIds, selectedCount, clearSelection } = useBatchSelection();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(selectedCount > 0);
  }, [selectedCount]);

  // Keyboard shortcut: Escape to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedCount > 0) {
        clearSelection();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedCount, clearSelection]);

  const handleAction = async (
    action: ((ids: string[]) => Promise<void>) | undefined,
    actionName: string,
  ) => {
    if (!action) return;

    const ids = Array.from(selectedIds);
    onProgressStart?.();

    try {
      await action(ids);
      toast.success(`${selectedCount} öğe ${actionName} işlemi başarılı`);
      clearSelection();
    } catch (error) {
      toast.error(
        `${actionName} işlemi başarısız: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
      );
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up"
      role="toolbar"
      aria-label="Batch operations toolbar"
    >
      {/* Glassmorphism container */}
      <div className="bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-2xl px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-4 border-r border-gray-300">
            <span className="text-sm font-semibold text-gray-700">
              {selectedCount} seçili
            </span>
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-gray-200/50 rounded-lg transition-colors"
              aria-label="Clear selection"
              title="Seçimi temizle (Esc)"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {onPublish && (
              <button
                onClick={() => handleAction(onPublish, "yayınlama")}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md"
                title="Seçili öğeleri yayınla"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">Yayınla</span>
              </button>
            )}

            {onUnpublish && (
              <button
                onClick={() => handleAction(onUnpublish, "yayından kaldırma")}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md"
                title="Seçili öğeleri yayından kaldır"
              >
                <EyeOff className="w-4 h-4" />
                <span className="text-sm font-medium">Yayından Kaldır</span>
              </button>
            )}

            {onArchive && (
              <button
                onClick={() => handleAction(onArchive, "arşivleme")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md"
                title="Seçili öğeleri arşivle"
              >
                <Archive className="w-4 h-4" />
                <span className="text-sm font-medium">Arşivle</span>
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => handleAction(onDelete, "silme")}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md"
                title="Seçili öğeleri sil (Delete)"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Sil</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
