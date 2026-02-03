"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

interface BatchSelectionContextType {
  selectedIds: Set<string>;
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  toggleItem: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

const BatchSelectionContext = createContext<
  BatchSelectionContextType | undefined
>(undefined);

export function useBatchSelection() {
  const context = useContext(BatchSelectionContext);
  if (!context) {
    throw new Error(
      "useBatchSelection must be used within BatchSelectionProvider",
    );
  }
  return context;
}

interface BatchSelectionProviderProps {
  children: React.ReactNode;
}

export function BatchSelectionProvider({
  children,
}: BatchSelectionProviderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectItem = useCallback((id: string) => {
    setSelectedIds((prev) => new Set(prev).add(id));
  }, []);

  const deselectItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.has(id);
    },
    [selectedIds],
  );

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const value = useMemo(
    () => ({
      selectedIds,
      selectItem,
      deselectItem,
      toggleItem,
      selectAll,
      clearSelection,
      isSelected,
      selectedCount,
    }),
    [
      selectedIds,
      selectItem,
      deselectItem,
      toggleItem,
      selectAll,
      clearSelection,
      isSelected,
      selectedCount,
    ],
  );

  return (
    <BatchSelectionContext.Provider value={value}>
      {children}
    </BatchSelectionContext.Provider>
  );
}
