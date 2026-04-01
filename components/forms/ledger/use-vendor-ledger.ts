"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  getVendorLedgerEntries,
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

  const [filters, setFilters] = useState<VendorLedgerFilters>({
    fromDate: "",
    toDate: "",
    vendorNo: "",
    isOutstanding: options.isOutstanding || false,
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize]
  );

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getVendorLedgerEntries(
        filters,
        pageSize,
        (currentPage - 1) * pageSize
      );
      setEntries(response.value);
      setTotalCount(response["@odata.count"] || response.value.length);
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
    setFilters((prev) => ({ ...prev, ...newFilters }));
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
    onFilterChange: handleFilterChange,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    refetch: fetchEntries,
  };
}
