"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  getQCReceiptsWithCount,
  getQCReceiptLines,
  type QCReceiptHeader,
  type QCReceiptLine,
} from "@/lib/api/services/qc-receipt.service";
import {
  type SortDirection,
  loadVisibleColumns,
  saveVisibleColumns,
  getDefaultVisibleColumns,
  buildSelectQuery,
  ALL_COLUMNS,
} from "./column-config";

export function useQCReceipts() {
  const [receipts, setReceipts] = useState<QCReceiptHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { value: string; valueTo?: string }>
  >({});

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    typeof window !== "undefined"
      ? loadVisibleColumns()
      : getDefaultVisibleColumns(),
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize],
  );

  const getOrderByString = useCallback(() => {
    if (!sortColumn || !sortDirection) return "No desc";
    return `${sortColumn} ${sortDirection}`;
  }, [sortColumn, sortDirection]);

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true);
    try {
      let filter = "";
      
      if (searchQuery) {
        // Simple search across No, Item_No, Item_Name, Buy_from_Vendor_Name
        const escaped = searchQuery.replace(/'/g, "''");
        filter = `(contains(No,'${escaped}') or contains(Item_No,'${escaped}') or contains(Item_Name,'${escaped}') or contains(Buy_from_Vendor_Name,'${escaped}'))`;
      }

      const params: any = {
        $select: buildSelectQuery(visibleColumns),
        $orderby: getOrderByString(),
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
        $count: true,
      };

      if (filter) {
        params.$filter = filter;
      }

      const result = await getQCReceiptsWithCount(params);

      setReceipts(result.receipts);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.warn("Error fetching QC receipts:", error);
      toast.error("Failed to load QC receipts. Please try again.");
      setReceipts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    visibleColumns,
    getOrderByString,
    searchQuery,
  ]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSort = useCallback((column: string) => {
    setSortColumn((prevColumn) => {
      if (prevColumn === column) {
        setSortDirection((prevDir) => {
          if (prevDir === "asc") return "desc";
          if (prevDir === "desc") return null;
          return "asc";
        });
        return column;
      } else {
        setSortDirection("asc");
        return column;
      }
    });
    setCurrentPage(1);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
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
    const defaults = getDefaultVisibleColumns();
    setVisibleColumns(defaults);
    saveVisibleColumns(defaults);
  }, []);

  const handleShowAllColumns = useCallback(() => {
    const allColumnIds = ALL_COLUMNS.map((c) => c.id);
    setVisibleColumns(allColumnIds);
    saveVisibleColumns(allColumnIds);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setColumnFilters({});
    setSortColumn("No");
    setSortDirection("desc");
    setCurrentPage(1);
  }, []);

  const handleColumnFilter = useCallback(
    (columnId: string, value: string, valueTo?: string) => {
      setColumnFilters((prev) => {
        if (!value && !valueTo) {
          const { [columnId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [columnId]: { value, valueTo } };
      });
      setCurrentPage(1);
    },
    [],
  );

  return {
    receipts,
    isLoading,
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    sortColumn,
    sortDirection,
    searchQuery,
    columnFilters,
    visibleColumns,
    onPageSizeChange: handlePageSizeChange,
    onPageChange: handlePageChange,
    onSort: handleSort,
    onSearch: handleSearch,
    onColumnFilter: handleColumnFilter,
    onColumnToggle: handleColumnToggle,
    onResetColumns: handleResetColumns,
    onShowAllColumns: handleShowAllColumns,
    onClearFilters: handleClearFilters,
    refetch: fetchReceipts,
  };
}

export function useQCReceiptLines(receiptNo: string | null) {
  const [lines, setLines] = useState<QCReceiptLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!receiptNo) {
      setLines([]);
      return;
    }

    const fetchLines = async () => {
      setIsLoading(true);
      try {
        const data = await getQCReceiptLines(receiptNo);
        setLines(data);
      } catch (error) {
        console.error("Error fetching QC lines:", error);
        toast.error("Failed to load QC receipt lines.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLines();
  }, [receiptNo]);

  return { lines, isLoading };
}
