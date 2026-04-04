"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  getGLEntries,
  type GLEntry,
  type GLEntryFilters,
  buildGLFilterString,
} from "@/lib/api/services/gl-entry.service";
import type { FilterCondition } from "@/components/forms/report-ledger/types";
import { 
  loadVisibleColumns, 
  saveVisibleColumns,
  ALL_COLUMNS,
} from "@/components/forms/ledger/gl-entry-column-config";

export interface UseGLEntryOptions {
  pageSize?: number;
}

export function useGLEntry(options: UseGLEntryOptions = {}) {
  const [entries, setEntries] = useState<GLEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState<GLEntryFilters>({
    search: "",
    columnFilters: {},
    additionalFilters: [],
    sortField: "Entry_No",
    sortOrder: "desc"
  });

  const LIMIT = options.pageSize || 50;

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    typeof window !== "undefined"
      ? loadVisibleColumns()
      : ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.id)
  );

  const hasNextPage = useMemo(
    () => entries.length < totalCount || (entries.length === 0 && isLoading),
    [entries.length, totalCount, isLoading]
  );

  const fetchEntries = useCallback(async (isAppending = false) => {
    if (isAppending) {
      setIsFetchingNextPage(true);
    } else {
      setIsLoading(true);
    }

    try {
      const skip = isAppending ? entries.length : 0;
      const response = await getGLEntries(filters, LIMIT, skip);

      if (isAppending) {
        setEntries(prev => [...prev, ...response.value]);
      } else {
        setEntries(response.value);
      }
      setTotalCount(response["@odata.count"] || (response.value.length < LIMIT ? entries.length + response.value.length : 1000000));
    } catch (error) {
      console.error("Error fetching GL entries:", error);
      toast.error("Failed to load general ledger entries.");
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [filters, entries.length, LIMIT]);

  useEffect(() => {
    fetchEntries(false);
  }, [filters]);

  const loadMore = useCallback(() => {
    if (entries.length >= totalCount && totalCount > 0) return;
    if (isLoading || isFetchingNextPage) return;
    fetchEntries(true);
  }, [entries.length, totalCount, isLoading, isFetchingNextPage, fetchEntries]);

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const handleSort = useCallback((field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortField: field,
      sortOrder: prev.sortField === field && prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleColumnFilterChange = useCallback((field: string, value: string, valueTo?: string) => {
    setFilters((prev) => ({
      ...prev,
      columnFilters: {
        ...prev.columnFilters,
        [field]: valueTo ? `${value},${valueTo}` : value
      }
    }));
  }, []);

  const handleAdditionalFiltersChange = useCallback((additionalFilters: FilterCondition[]) => {
    setFilters((prev) => ({
      ...prev,
      additionalFilters
    }));
  }, []);

  const handleColumnToggle = useCallback((columnId: string) => {
    setVisibleColumns((prev) => {
      const newColumns = prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId];
      saveVisibleColumns(newColumns);
      return newColumns;
    });
  }, []);

  const handleResetColumns = useCallback(() => {
    const defaultCols = ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);
    setVisibleColumns(defaultCols);
    saveVisibleColumns(defaultCols);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      columnFilters: {},
      additionalFilters: [],
      sortField: "Entry_No",
      sortOrder: "desc"
    });
  }, []);

  return {
    entries,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    totalCount,
    loadMore,
    refetch: () => fetchEntries(false),
    
    // Filters
    filters,
    handleSearch,
    handleSort,
    handleColumnFilterChange,
    handleAdditionalFiltersChange,
    clearFilters,
    
    // Columns
    visibleColumns,
    setVisibleColumns: handleColumnToggle,
    handleResetColumns,
  };
}
