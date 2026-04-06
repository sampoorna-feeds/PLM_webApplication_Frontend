"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  getVendorLedgerEntries,
  getVendorBalance,
  type VendorLedgerEntry,
  type VendorLedgerFilters,
  buildVendorFilterString,
  buildHumanReadableVendorFilters,
} from "@/lib/api/services/vendor-ledger.service";
import { type PageSize, type FilterCondition } from "@/components/forms/report-ledger/types";
import { 
  getDefaultVisibleColumns, 
  loadVisibleColumns, 
  saveVisibleColumns,
  loadColumnWidths,
  saveColumnWidths,
  loadColumnOrder,
  saveColumnOrder,
  resetVendorTableUI,
  ALL_COLUMNS,
} from "@/components/forms/ledger/vendor-ledger-column-config";

export interface UseVendorLedgerOptions {
  isOutstanding?: boolean;
}

export function useVendorLedger(options: UseVendorLedgerOptions = {}) {
  const [entries, setEntries] = useState<VendorLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);

  const [filters, setFilters] = useState<VendorLedgerFilters>({
    fromDate: "",
    toDate: "",
    vendorNo: "",
    search: "",
    additionalFilters: [],
    columnFilters: {},
    sortField: "Posting_Date",
    sortOrder: "desc"
  });

  const LIMIT = 50;

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    typeof window !== "undefined"
      ? loadVisibleColumns(options.isOutstanding)
      : getDefaultVisibleColumns(options.isOutstanding),
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
    // Only fetch if vendor is selected
    if (!filters.vendorNo) {
      setEntries([]);
      setTotalCount(0);
      setOpeningBalance(0);
      setClosingBalance(0);
      return;
    }

    if (isAppending) {
      setIsFetchingNextPage(true);
    } else {
      setIsLoading(true);
    }

    try {
      const skip = isAppending ? entries.length : 0;
      
      // Fetch entries and balances
      const [entriesRes, openingBal, closingBal] = await Promise.all([
        getVendorLedgerEntries(filters, LIMIT, skip),
        // Only fetch balances on first load
        !isAppending && filters.fromDate 
          ? getVendorBalance(filters.vendorNo, filters.fromDate, true) 
          : !isAppending ? Promise.resolve(0) : Promise.resolve(openingBalance),
        !isAppending 
          ? (filters.toDate ? getVendorBalance(filters.vendorNo, filters.toDate, false) : getVendorBalance(filters.vendorNo))
          : Promise.resolve(closingBalance)
      ]);

      if (isAppending) {
        setEntries(prev => [...prev, ...entriesRes.value]);
      } else {
        setEntries(entriesRes.value);
        setOpeningBalance(openingBal);
        setClosingBalance(closingBal);
      }
      setTotalCount(entriesRes["@odata.count"] || entriesRes.value.length);
    } catch (error) {
      console.error("Error fetching vendor ledger entries:", error);
      toast.error("Failed to load vendor ledger entries.");
      if (!isAppending) {
        setEntries([]);
        setTotalCount(0);
      }
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [filters, entries.length, openingBalance, closingBalance]);

  // Initial fetch on filter change
  useEffect(() => {
    fetchEntries(false);
  }, [filters]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isFetchingNextPage) return;
    fetchEntries(true);
  }, [hasMore, isLoading, isFetchingNextPage, fetchEntries]);

  const handleFilterChange = useCallback((newFilters: Partial<VendorLedgerFilters>) => {
    setFilters((prev) => ({ 
      ...prev, 
      ...newFilters,
      columnFilters: (newFilters.vendorNo !== undefined || newFilters.isOutstanding !== undefined) 
        ? {} 
        : prev.columnFilters 
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
      saveVisibleColumns(newColumns, options.isOutstanding);
      return newColumns;
    });
  }, [options.isOutstanding]);

  const handleResetColumns = useCallback(() => {
    const defaultColumns = getDefaultVisibleColumns(options.isOutstanding);
    setVisibleColumns(defaultColumns);
    setColumnWidths({});
    setColumnOrder([]);
    resetVendorTableUI();
    saveVisibleColumns(defaultColumns, options.isOutstanding);
  }, [options.isOutstanding]);

  const handleShowAllColumns = useCallback(() => {
    const allColumnIds = ALL_COLUMNS.map((col) => col.id);
    setVisibleColumns(allColumnIds);
    saveVisibleColumns(allColumnIds, options.isOutstanding);
  }, [options.isOutstanding]);

  return {
    entries,
    isLoading,
    isFetchingNextPage,
    hasMore,
    totalCount,
    filters,
    openingBalance,
    closingBalance,
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
    currentFilterString: buildVendorFilterString(filters),
    humanReadableFilters: buildHumanReadableVendorFilters(filters),
    refetch: () => fetchEntries(false),
  };
}

