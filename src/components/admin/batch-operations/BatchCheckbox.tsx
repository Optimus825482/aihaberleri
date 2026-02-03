"use client";

import React, { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useBatchSelection } from "./BatchSelectionProvider";

/**
 * Memoized checkbox component for batch selection
 * Optimized for large lists with React.memo
 *
 * @param id - Unique identifier for the item
 * @param disabled - Whether the checkbox is disabled
 */
interface BatchCheckboxProps {
  id: string;
  disabled?: boolean;
  "aria-label"?: string;
}

const BatchCheckbox: React.FC<BatchCheckboxProps> = memo(
  ({ id, disabled = false, "aria-label": ariaLabel }) => {
    const { isSelected, toggleItem } = useBatchSelection();
    const isChecked = isSelected(id);

    const handleChange = (checked: boolean) => {
      toggleItem(id);
    };

    return (
      <Checkbox
        checked={isChecked}
        onCheckedChange={handleChange}
        disabled={disabled}
        aria-label={ariaLabel || `Öğe ${id} seç`}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.id === nextProps.id && prevProps.disabled === nextProps.disabled
    );
  },
);

BatchCheckbox.displayName = "BatchCheckbox";

export default BatchCheckbox;

/**
 * Example usage:
 *
 * <BatchCheckbox
 *   id="article-123"
 *   aria-label="Makale 123'ü seç"
 * />
 */
