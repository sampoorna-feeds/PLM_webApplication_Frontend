"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  getVendorLedgerEntries,
  getVendorBalance,
  type VendorLedgerEntry,
  type VendorLedgerFilters,
} from "@/lib/api/services/vendor-ledger.service";
import { type PageSize } from "@/components/forms/report-ledger/types";

export interface UseVendorLedgerOptions {
  isOutstanding?: boolean;
}

export function useVendorLedger(options: UseVendorLedgerOptions = {}) {
  const [entries, setEntries] = useState<VendorLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);

  const [filters, setFilters] = useState<VendorLedgerFilters>({
    fromDate: "",
    toDate: "",
    vendorNo: "",
    isOutstanding: options.isOutstanding || false,
    columnFilters: {},
    sortField: "Posting_Date",
    sortOrder: "desc"
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize]
  );

  const fetchEntries = useCallback(async () => {
    // Only fetch if vendor is selected
    if (!filters.vendorNo) {
      setEntries([]);
      setTotalCount(0);
      setOpeningBalance(0);
      setClosingBalance(0);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch entries and balances in parallel
      const [entriesRes, openingBal, closingBal] = await Promise.all([
        getVendorLedgerEntries(
          filters,
          pageSize,
          (currentPage - 1) * pageSize
        ),
        filters.fromDate ? getVendorBalance(filters.vendorNo, filters.fromDate, true) : Promise.resolve(0),
        filters.toDate ? getVendorBalance(filters.vendorNo, filters.toDate, false) : getVendorBalance(filters.vendorNo)
      ]);

      setEntries(entriesRes.value);
      setTotalCount(entriesRes["@odata.count"] || entriesRes.value.length);
      setOpeningBalance(openingBal);
      setClosingBalance(closingBal);
    } catch (error) {
      console.error("Error fetching vendor ledger entries:", error);
      toast.error("Failed to load vendor ledger entries.");
      setEntries([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pageSize, currentPage]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleFilterChange = useCallback((newFilters: Partial<VendorLedgerFilters>) => {
    setFilters((prev) => ({ 
      ...prev, 
      ...newFilters,
      // If vendorNo or isOutstanding changes, reset column filters
      columnFilters: (newFilters.vendorNo !== undefined || newFilters.isOutstanding !== undefined) 
        ? {} 
        : prev.columnFilters 
    }));
    setCurrentPage(1);
  }, []);

  const handleColumnFilterChange = useCallback((field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      columnFilters: {
        ...prev.columnFilters,
        [field]: value
      }
    }));
    setCurrentPage(1);
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
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  return {
    entries,
    isLoading,
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    filters,
    openingBalance,
    closingBalance,
    onFilterChange: handleFilterChange,
    onColumnFilterChange: handleColumnFilterChange,
    onSort: handleSort,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    refetch: fetchEntries,
  };
}

