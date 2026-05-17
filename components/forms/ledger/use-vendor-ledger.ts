"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import {
  getVendorLedgerEntries,
  getVendorBalance,
  getVendorLedgerSums,
  type VendorLedgerEntry,
  type VendorLedgerFilters,
  buildVendorFilterString,
  buildHumanReadableVendorFilters,
} from "@/lib/api/services/vendor-ledger.service";
import { type FilterCondition } from "@/components/forms/report-ledger/types";
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
  const entriesLengthRef = useRef(0);


  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const [debitSum, setDebitSum] = useState(0);
  const [creditSum, setCreditSum] = useState(0);

  const [filters, setFilters] = useState<VendorLedgerFilters>({
    fromDate: "",
    toDate: "",
    vendorNo: "",
    search: "",
    additionalFilters: [],
    columnFilters: {},
    sortField: "Posting_Date",
    sortOrder: options.isOutstanding ? "desc" : "asc",
    isOutstanding: options.isOutstanding
  });



  const LIMIT = 200;
  const isLoadingRef = useRef(false);
  const isFetchingNextPageRef = useRef(false);
  const lastRequestId = useRef(0);

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
    const isDateRangeSelected = !!(filters.fromDate && filters.toDate);
    const shouldSkipFetch = !filters.vendorNo || (!options.isOutstanding && !isDateRangeSelected);
    
    if (shouldSkipFetch) {
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

    const requestId = ++lastRequestId.current;

    if (isAppending) {
      isFetchingNextPageRef.current = true;
      setIsFetchingNextPage(true);
    } else {
      isLoadingRef.current = true;
      setIsLoading(true);
    }

    try {
      const skip = isAppending ? entriesLengthRef.current : 0;

      // Fetch entries and totals
      const [entriesRes, openingBal, sums] = await Promise.all([
        getVendorLedgerEntries({ ...filters, isOutstanding: options.isOutstanding }, LIMIT, skip),
        // Only fetch opening balance on first load and if dates are present
        !isAppending && filters.fromDate 
          ? getVendorBalance(filters.vendorNo || "", filters.fromDate, true) 
          : Promise.resolve(0),
        // Always fetch sums on first load to calculate closing balance and show totals
        !isAppending
          ? getVendorLedgerSums({ ...filters, isOutstanding: options.isOutstanding })
          : Promise.resolve(null)
      ]);

      if (requestId !== lastRequestId.current) return;

      if (isAppending) {
        setEntries(prev => {
          const newEntries = [...prev, ...entriesRes.value];
          entriesLengthRef.current = newEntries.length;
          return newEntries;
        });
      } else {
        setEntries(entriesRes.value);
        entriesLengthRef.current = entriesRes.value.length;
        setOpeningBalance(openingBal);
        
        if (sums) {
          setDebitSum(sums.debitSum);
          setCreditSum(sums.creditSum);
          // Calculate closing balance: Opening + Debit - Credit
          setClosingBalance(openingBal + sums.debitSum - sums.creditSum);
        } else if (!isAppending && !filters.fromDate && !filters.toDate && options.isOutstanding) {
          // If no dates but outstanding mode, fetch total balance as closing balance
          const totalBal = await getVendorBalance(filters.vendorNo || "");
          setClosingBalance(totalBal);
        }
      }

      setTotalCount(entriesRes["@odata.count"] || (isAppending ? totalCount : entriesRes.value.length));
    } catch (error) {
      if (requestId !== lastRequestId.current) return;
      console.error("Error fetching vendor ledger entries:", error);
      toastError(error, "Failed to load vendor ledger entries.");
      if (!isAppending) {
        setEntries([]);
        setTotalCount(0);
      }
    } finally {
      if (requestId === lastRequestId.current) {
        setIsLoading(false);
        setIsFetchingNextPage(false);
        isLoadingRef.current = false;
        isFetchingNextPageRef.current = false;
      }
    }
  }, [filters, options.isOutstanding, LIMIT, totalCount]);

  // Initial fetch on filter change
  useEffect(() => {
    fetchEntries(false);
  }, [fetchEntries]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingRef.current || isFetchingNextPageRef.current) return;
    fetchEntries(true);
  }, [hasMore, fetchEntries]);

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
    if (!options.isOutstanding) return; // Filtering disabled for Ledger

    setFilters((prev) => ({
      ...prev,
      columnFilters: {
        ...prev.columnFilters,
        [field]: valueTo ? `${value},${valueTo}` : value
      }
    }));
  }, [options.isOutstanding]);


  const handleSort = useCallback((field: string) => {
    if (!options.isOutstanding) return; // Sorting disabled for Ledger

    setFilters((prev) => {
      const isAsc = prev.sortField === field && prev.sortOrder === "asc";
      return {
        ...prev,
        sortField: field,
        sortOrder: isAsc ? "desc" : "asc"
      };
    });
  }, [options.isOutstanding]);


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
    currentFilterString: buildVendorFilterString({ ...filters, isOutstanding: options.isOutstanding }),
    humanReadableFilters: buildHumanReadableVendorFilters(filters),
    refetch: () => fetchEntries(false),
  };
}
