import { useState } from "react";

/**
 * Bulk Selection Hook for Admin Tables
 *
 * Usage:
 * ```tsx
 * const { selected, toggleSelection, toggleAll, clearSelection, count, isSelected } =
 *   useBulkSelection(articles);
 *
 * // Render checkbox
 * <Checkbox
 *   checked={isSelected(article.id)}
 *   onCheckedChange={() => toggleSelection(article.id)}
 * />
 *
 * // Bulk actions
 * if (count > 0) {
 *   await bulkDelete(selected);
 * }
 * ```
 */
export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /**
   * Toggle single item selection
   */
  const toggleSelection = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * Toggle all items (select all / deselect all)
   */
  const toggleAll = () => {
    if (selected.size === items.length && items.length > 0) {
      // Deselect all
      setSelected(new Set());
    } else {
      // Select all
      setSelected(new Set(items.map((item) => item.id)));
    }
  };

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    setSelected(new Set());
  };

  /**
   * Check if item is selected
   */
  const isSelected = (id: string): boolean => {
    return selected.has(id);
  };

  /**
   * Check if all items are selected
   */
  const isAllSelected = (): boolean => {
    return items.length > 0 && selected.size === items.length;
  };

  /**
   * Check if some (but not all) items are selected
   */
  const isSomeSelected = (): boolean => {
    return selected.size > 0 && selected.size < items.length;
  };

  /**
   * Get selected items
   */
  const selectedItems = items.filter((item) => selected.has(item.id));

  /**
   * Get selected IDs as array
   */
  const selectedIds = Array.from(selected);

  return {
    selected, // Set of selected IDs
    selectedItems, // Array of selected items
    selectedIds, // Array of selected IDs
    count: selected.size, // Number of selected items
    isSelected, // Check if item is selected
    isAllSelected, // Check if all items are selected
    isSomeSelected, // Check if some items are selected
    toggleSelection, // Toggle single item
    toggleAll, // Toggle all items
    clearSelection, // Clear all selections
  };
}
