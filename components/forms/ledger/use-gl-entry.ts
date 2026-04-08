"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  getGLEntries,
  getGLBalance,
  getGLEntrySums,
  type GLEntry,
  type GLEntryFilters,
  buildGLFilterString,
} from "@/lib/api/services/gl-entry.service";
import { type FilterCondition } from "@/components/forms/report-ledger/types";
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

export function useGLEntry() {
  const [entries, setEntries] = useState<GLEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const [debitSum, setDebitSum] = useState(0);
  const [creditSum, setCreditSum] = useState(0);

  const [filters, setFilters] = useState<GLEntryFilters>({
    fromDate: "",
    toDate: "",
    accountNo: "",
    search: "",
    additionalFilters: [],
    columnFilters: {},
    sortField: "Entry_No",
    sortOrder: "desc"
  });

  const LIMIT = 50;

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    typeof window !== "undefined"
      ? loadVisibleColumns()
      : ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.id),
  );

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => 
    typeof window !== "undefined" ? loadColumnWidths() : {}
  );

  const [columnOrder, setColumnOrder] = useState<string[]>(() => 
    typeof window !== "undefined" ? loadColumnOrder() : []
  );
  
  const hasMore = useMemo(
    () => entries.length < totalCount,
    [entries.length, totalCount]
  );

  const fetchEntries = useCallback(async (isAppending = false) => {
    if (!filters.accountNo || !filters.fromDate || !filters.toDate) {
      setEntries([]);
      setTotalCount(0);
      setOpeningBalance(0);
      setClosingBalance(0);
      setDebitSum(0);
      setCreditSum(0);
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
      
      const [entriesRes, openingBal, closingBal, sums] = await Promise.all([
        getGLEntries(filters, LIMIT, skip),
        !isAppending 
          ? getGLBalance(filters.accountNo, filters.fromDate, true) 
          : Promise.resolve(openingBalance),
        !isAppending 
          ? (filters.toDate ? getGLBalance(filters.accountNo, filters.toDate, false) : getGLBalance(filters.accountNo))
          : Promise.resolve(closingBalance),
        !isAppending
          ? getGLEntrySums(filters)
          : Promise.resolve({ debitSum, creditSum })
      ]);

      if (isAppending) {
        setEntries(prev => [...prev, ...entriesRes.value]);
      } else {
        setEntries(entriesRes.value);
        setOpeningBalance(openingBal);
        setClosingBalance(closingBal);
        setDebitSum(sums.debitSum);
        setCreditSum(sums.creditSum);
      }
      setTotalCount(entriesRes["@odata.count"] || entriesRes.value.length);
    } catch (error) {
      console.error("Error fetching GL entries:", error);
      toast.error("Failed to load general ledger entries.");
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [filters, entries.length, openingBalance, closingBalance, debitSum, creditSum]);

  useEffect(() => {
    fetchEntries(false);
  }, [fetchEntries]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isFetchingNextPage) return;
    fetchEntries(true);
  }, [hasMore, isLoading, isFetchingNextPage, fetchEntries]);

  const handleFilterChange = useCallback((newFilters: Partial<GLEntryFilters>) => {
    setFilters((prev) => ({ 
      ...prev, 
      ...newFilters,
      columnFilters: newFilters.accountNo !== undefined ? {} : prev.columnFilters 
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

  const handleSort = useCallback((field: string) => {
    setFilters((prev) => {
      const isAsc = prev.sortField === field && prev.sortOrder === "asc";
      return {
        ...prev,
        sortField: field,
        sortOrder: isAsc ? "desc" : "asc"
      };
    });
  }, []);

  const handleAddAdditionalFilter = useCallback((filter: FilterCondition) => {
    setFilters((prev) => ({
      ...prev,
      additionalFilters: [...(prev.additionalFilters || []), filter]
    }));
  }, []);

  const handleRemoveAdditionalFilter = useCallback((index: number) => {
    setFilters((prev) => ({
      ...prev,
      additionalFilters: (prev.additionalFilters || []).filter((_, i) => i !== index)
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
    const defaultColumns = ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);
    setVisibleColumns(defaultColumns);
    setColumnWidths({});
    setColumnOrder([]);
    resetGLTableUI();
    saveVisibleColumns(defaultColumns);
  }, []);

  const handleShowAllColumns = useCallback(() => {
    const allColumnIds = ALL_COLUMNS.map((col) => col.id);
    setVisibleColumns(allColumnIds);
    saveVisibleColumns(allColumnIds);
  }, []);

  return {
    entries,
    isLoading,
    isFetchingNextPage,
    hasMore,
    totalCount,
    filters,
    openingBalance,
    closingBalance,
    debitSum,
    creditSum,
    visibleColumns,
    onFilterChange: handleFilterChange,
    onColumnFilterChange: handleColumnFilterChange,
    onSort: handleSort,
    onAddAdditionalFilter: handleAddAdditionalFilter,
    onRemoveAdditionalFilter: handleRemoveAdditionalFilter,
    loadMore,
    onColumnToggle: handleColumnToggle,
    onResetColumns: handleResetColumns,
    onShowAllColumns: handleShowAllColumns,
    columnWidths,
    setColumnWidths,
    saveColumnWidths,
    columnOrder,
    setColumnOrder,
    saveColumnOrder,
    currentFilterString: buildGLFilterString(filters),
    refetch: () => fetchEntries(false),
  };
}
