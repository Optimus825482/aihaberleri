import { useEffect, useRef } from "react";

/**
 * useDebounce hook
 * Delays the execution of a callback function until after a specified delay
 * Useful for search inputs, API calls, and other expensive operations
 *
 * @param callback - Function to execute after delay
 * @param delay - Delay in milliseconds
 * @param dependencies - Array of dependencies that trigger the debounce
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 *
 * useDebounce(() => {
 *   // This will only run 300ms after the user stops typing
 *   fetchSearchResults(searchTerm);
 * }, 300, [searchTerm]);
 * ```
 */
export function useDebounce(
  callback: () => void,
  delay: number,
  dependencies: any[],
): void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);

    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

/**
 * useDebouncedValue hook
 * Returns a debounced version of the input value
 *
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
 *
 * useEffect(() => {
 *   fetchSearchResults(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Import useState for useDebouncedValue
import { useState } from "react";
