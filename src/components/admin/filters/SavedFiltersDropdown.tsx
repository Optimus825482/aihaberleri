"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bookmark, Plus, Trash2, ChevronDown } from "lucide-react";
import { useFilters } from "./FilterProvider";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export function SavedFiltersDropdown() {
  const {
    savedFilters,
    saveCurrentFilters,
    loadSavedFilter,
    deleteSavedFilter,
    filters,
  } = useFilters();
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowSaveDialog(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = () => {
    if (filterName.trim()) {
      saveCurrentFilters(filterName.trim());
      setFilterName("");
      setShowSaveDialog(false);
    }
  };

  const handleLoad = (id: string) => {
    loadSavedFilter(id);
    setIsOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedFilter(id);
  };

  const hasActiveFilters = Object.keys(filters).length > 0;
  const canSaveMore = savedFilters.length < 10;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all flex items-center gap-2"
      >
        <Bookmark className="w-5 h-5" />
        Kayıtlı Filtreler
        {savedFilters.length > 0 && (
          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
            {savedFilters.length}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 w-80 mt-2 bg-gray-800/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
          {/* Save Current Filters */}
          {hasActiveFilters && canSaveMore && (
            <div className="p-3 border-b border-white/10">
              {showSaveDialog ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    placeholder="Filtre adı girin"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") setShowSaveDialog(false);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={!filterName.trim()}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      className="px-3 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="w-full px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-lg font-medium hover:bg-blue-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Mevcut Filtreleri Kaydet
                </button>
              )}
            </div>
          )}

          {/* Saved Filters List */}
          <div className="max-h-96 overflow-y-auto">
            {savedFilters.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Henüz kayıtlı filtre yok</p>
                <p className="text-xs mt-1">Filtre uygulayıp kaydedin</p>
              </div>
            ) : (
              savedFilters.map((saved) => (
                <div
                  key={saved.id}
                  className="group px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => handleLoad(saved.id)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-white mb-1">
                        {saved.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(
                          new Date(saved.createdAt),
                          "d MMM yyyy, HH:mm",
                          { locale: tr },
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Object.keys(saved.filters).length} filtre
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleDelete(saved.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {savedFilters.length > 0 && (
            <div className="p-3 border-t border-white/10 text-xs text-gray-400 text-center">
              {savedFilters.length} / 10 kayıtlı filtre
            </div>
          )}
        </div>
      )}
    </div>
  );
}
