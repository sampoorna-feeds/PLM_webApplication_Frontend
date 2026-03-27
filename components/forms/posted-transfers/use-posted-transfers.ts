"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { 
  getPostedTransferShipments, 
  getTransferReceipts,
  type PostedTransferShipment,
  type TransferReceipt
} from "@/lib/api/services/transfer-orders.service";
import { type SortDirection } from "./column-config";
import { type PostedTransferFilters } from "./posted-transfer-filter-form";

export interface UsePostedTransfersOptions {
  type: "shipment" | "receipt";
  initialFilters: PostedTransferFilters | null;
}

export function usePostedTransfers({ type, initialFilters }: UsePostedTransfersOptions) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);

  const buildFilterString = useCallback(() => {
    if (!initialFilters) return "";

    const parts = [];
    if (initialFilters.fromDate) parts.push(`Posting_Date ge ${initialFilters.fromDate}`);
    if (initialFilters.toDate) parts.push(`Posting_Date le ${initialFilters.toDate}`);
    if (initialFilters.fromLocation) parts.push(`Transfer_from_Code eq '${initialFilters.fromLocation}'`);
    if (initialFilters.toLocation) parts.push(`Transfer_to_Code eq '${initialFilters.toLocation}'`);

    // Add local search to server-side filter if possible
    // Note: This is a bit complex because OData 'contains' might not be supported on all fields.
    // In transfer-orders/utils/filter-builder, they build a complex string.
    
    // For now, let's just stick to the initial filters and handle search/column filters server-side if too many.
    // Or just fetch enough for the current page.

    return parts.join(" and ");
  }, [initialFilters]);

  const fetchData = useCallback(async () => {
    if (!initialFilters) return;
    
    setIsLoading(true);
    try {
      const filter = buildFilterString();
      const params = {
        $filter: filter,
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
        $orderby: sortColumn && sortDirection ? `${sortColumn} ${sortDirection}` : "No desc",
      };

      const result = type === "shipment" 
        ? await getPostedTransferShipments(params)
        : await getTransferReceipts(params);
      
      setData(result.orders);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error(`Error fetching posted transfer ${type}s:`, error);
      toast.error(`Failed to load posted ${type}s.`);
      setData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [type, initialFilters, pageSize, currentPage, sortColumn, sortDirection, buildFilterString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : prev === "desc" ? "asc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  }, [sortColumn]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    // Note: Real OData search would need to be integrated into buildFilterString
  }, []);

  const handleColumnFilter = useCallback((columnId: string, value: string, valueTo?: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnId]: { value, valueTo }
    }));
    setCurrentPage(1);
    // Note: Real OData column filtering would need to be integrated into buildFilterString
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setColumnFilters({});
    setCurrentPage(1);
  }, []);

  return {
    data,
    isLoading,
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    sortColumn,
    sortDirection,
    searchQuery,
    columnFilters,
    onPageSizeChange: handlePageSizeChange,
    onPageChange: handlePageChange,
    onSort: handleSort,
    onSearch: handleSearch,
    onColumnFilter: handleColumnFilter,
    onClearFilters: handleClearFilters,
    refetch: fetchData,
  };
}
