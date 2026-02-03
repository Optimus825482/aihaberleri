"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface FilterState {
  search?: string;
  categories?: string[];
  tags?: string[];
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  viewsMin?: number;
  viewsMax?: number;
  likesMin?: number;
  likesMax?: number;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

interface FilterContextType {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  updateFilter: (key: keyof FilterState, value: any) => void;
  clearFilters: () => void;
  savedFilters: SavedFilter[];
  saveCurrentFilters: (name: string) => void;
  loadSavedFilter: (id: string) => void;
  deleteSavedFilter: (id: string) => void;
  resultCount: number;
  isLoading: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const SAVED_FILTERS_KEY = "admin_saved_filters";
const MAX_SAVED_FILTERS = 10;

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFiltersState] = useState<FilterState>({});
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_FILTERS_KEY);
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved filters:", e);
      }
    }
  }, []);

  // Initialize filters from URL
  useEffect(() => {
    const initialFilters: FilterState = {};

    const search = searchParams.get("search");
    if (search) initialFilters.search = search;

    const categories = searchParams.get("categories");
    if (categories) initialFilters.categories = categories.split(",");

    const tags = searchParams.get("tags");
    if (tags) initialFilters.tags = tags.split(",");

    const status = searchParams.get("status");
    if (status) initialFilters.status = status.split(",");

    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) initialFilters.dateFrom = dateFrom;

    const dateTo = searchParams.get("dateTo");
    if (dateTo) initialFilters.dateTo = dateTo;

    const viewsMin = searchParams.get("viewsMin");
    if (viewsMin) initialFilters.viewsMin = parseInt(viewsMin);

    const viewsMax = searchParams.get("viewsMax");
    if (viewsMax) initialFilters.viewsMax = parseInt(viewsMax);

    const likesMin = searchParams.get("likesMin");
    if (likesMin) initialFilters.likesMin = parseInt(likesMin);

    const likesMax = searchParams.get("likesMax");
    if (likesMax) initialFilters.likesMax = parseInt(likesMax);

    setFiltersState(initialFilters);
  }, [searchParams]);

  // Fetch result count when filters change
  useEffect(() => {
    const fetchCount = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        Object.entries(filters || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            if (Array.isArray(value)) {
              params.set(key, value.join(","));
            } else {
              params.set(key, String(value));
            }
          }
        });
        params.set("countOnly", "true");

        const response = await fetch(`/api/admin/articles/advanced?${params}`);
        const data = await response.json();
        setResultCount(data.total || 0);
      } catch (error) {
        console.error("Failed to fetch count:", error);
        setResultCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchCount, 300); // Debounce
    return () => clearTimeout(timer);
  }, [filters]);

  const setFilters = useCallback(
    (newFilters: FilterState) => {
      setFiltersState(newFilters);

      // Update URL
      const params = new URLSearchParams();
      Object.entries(newFilters || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value)) {
            params.set(key, value.join(","));
          } else {
            params.set(key, String(value));
          }
        }
      });

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const updateFilter = useCallback(
    (key: keyof FilterState, value: any) => {
      setFilters({ ...filters, [key]: value });
    },
    [filters, setFilters],
  );

  const clearFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  const saveCurrentFilters = useCallback(
    (name: string) => {
      const newFilter: SavedFilter = {
        id: Date.now().toString(),
        name,
        filters: { ...filters },
        createdAt: new Date().toISOString(),
      };

      const updated = [newFilter, ...savedFilters].slice(0, MAX_SAVED_FILTERS);
      setSavedFilters(updated);
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    },
    [filters, savedFilters],
  );

  const loadSavedFilter = useCallback(
    (id: string) => {
      const saved = savedFilters.find((f) => f.id === id);
      if (saved) {
        setFilters(saved.filters);
      }
    },
    [savedFilters, setFilters],
  );

  const deleteSavedFilter = useCallback(
    (id: string) => {
      const updated = savedFilters.filter((f) => f.id !== id);
      setSavedFilters(updated);
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    },
    [savedFilters],
  );

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilters,
        updateFilter,
        clearFilters,
        savedFilters,
        saveCurrentFilters,
        loadSavedFilter,
        deleteSavedFilter,
        resultCount,
        isLoading,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within FilterProvider");
  }
  return context;
}
