"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  getGLEntries,
  getGLBalance,
  type GLEntry,
  type GLEntryFilters,
  buildGLFilterString,
} from "@/lib/api/services/gl-entry.service";
import type { FilterCondition } from "@/components/forms/report-ledger/types";
import { 
  loadVisibleColumns, 
  saveVisibleColumns,
  loadColumnWidths,
  saveColumnWidths,
  loadColumnOrder,
  saveColumnOrder,
  resetGLTableUI,
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

  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);

  const [filters, setFilters] = useState<GLEntryFilters>({
    fromDate: "",
    toDate: "",
    accountNo: "",
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

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => 
    typeof window !== "undefined" ? loadColumnWidths() : {}
  );

  const [columnOrder, setColumnOrder] = useState<string[]>(() => 
    typeof window !== "undefined" ? loadColumnOrder() : []
  );

  const hasNextPage = useMemo(
    () => entries.length < totalCount || (entries.length === 0 && isLoading),
    [entries.length, totalCount, isLoading]
  );

  const fetchEntries = useCallback(async (isAppending = false) => {
    // If no account is selected, we don't fetch anything
    const accountNo = filters.accountNo || filters.columnFilters?.["G_L_Account_No"];
    const isDateRangeSelected = !!(filters.fromDate && filters.toDate);
    
    if (!accountNo || !isDateRangeSelected) {
      setEntries([]);
      setTotalCount(0);
      setOpeningBalance(0);
      setClosingBalance(0);
      setIsLoading(false);
      setIsFetchingNextPage(false);
      return;
    }

    if (isAppending) {
      setIsFetchingNextPage(true);
    } else {
      setIsLoading(true);
    }

    try {
      const skip = isAppending ? entries.length : 0;
      
      const [response, openingBal, closingBal] = await Promise.all([
        getGLEntries(filters, LIMIT, skip),
        // Fetch balances on initial load if account is selected
        !isAppending && accountNo && filters.fromDate 
          ? getGLBalance(accountNo, filters.fromDate, true)
          : !isAppending ? Promise.resolve(0) : Promise.resolve(openingBalance),
        !isAppending && accountNo 
          ? (filters.toDate ? getGLBalance(accountNo, filters.toDate, false) : getGLBalance(accountNo))
          : !isAppending ? Promise.resolve(0) : Promise.resolve(closingBalance)
      ]);

      if (isAppending) {
        setEntries(prev => [...prev, ...response.value]);
      } else {
        setEntries(response.value);
        setOpeningBalance(openingBal);
        setClosingBalance(closingBal);
      }
      setTotalCount(response["@odata.count"] || (response.value.length < LIMIT ? entries.length + (isAppending ? entries.length : 0) + response.value.length : 1000000));
    } catch (error) {
      console.error("Error fetching GL entries:", error);
      toast.error("Failed to load general ledger entries.");
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [filters, entries.length, LIMIT, openingBalance, closingBalance]);

  useEffect(() => {
    fetchEntries(false);
  }, [filters]);

  const loadMore = useCallback(() => {
    if (entries.length >= totalCount && totalCount > 0) return;
    if (isLoading || isFetchingNextPage) return;
    fetchEntries(true);
  }, [entries.length, totalCount, isLoading, isFetchingNextPage, fetchEntries]);

  const handleFilterChange = useCallback((newFilters: Partial<GLEntryFilters>) => {
    setFilters((prev) => ({ 
      ...prev, 
      ...newFilters,
      columnFilters: newFilters.accountNo !== undefined ? {} : prev.columnFilters
    }));
  }, []);

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
    const filterValue = valueTo ? `${value},${valueTo}` : value;
    
    setFilters((prev) => {
      const isAccountFilter = field === "G_L_Account_No";
      
      return {
        ...prev,
        accountNo: isAccountFilter ? value : prev.accountNo,
        columnFilters: {
          ...prev.columnFilters,
          [field]: filterValue
        }
      };
    });
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
    setColumnWidths({});
    setColumnOrder([]);
    resetGLTableUI();
    saveVisibleColumns(defaultCols);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      fromDate: "",
      toDate: "",
      accountNo: "",
      search: "",
      columnFilters: {},
      additionalFilters: [],
      sortField: "Entry_No",
      sortOrder: "desc"
    });
    setOpeningBalance(0);
    setClosingBalance(0);
  }, []);

  return {
    entries,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    totalCount,
    openingBalance,
    closingBalance,
    loadMore,
    refetch: () => fetchEntries(false),
    
    // Filters
    filters,
    onFilterChange: handleFilterChange,
    handleSearch,
    handleSort,
    handleColumnFilterChange,
    handleAdditionalFiltersChange,
    clearFilters,
    
    // Columns
    visibleColumns,
    setVisibleColumns: handleColumnToggle,
    handleResetColumns,
    columnWidths,
    setColumnWidths,
    saveColumnWidths,
    columnOrder,
    setColumnOrder,
    saveColumnOrder,
    currentFilterString: buildGLFilterString(filters),
  };
}
