"use client";

import {
  getPostedQCReceiptLines,
  getPostedQCReceiptsWithCount,
  getQCReceiptLines,
  getQCReceiptsWithCount,
  postQCReceipt,
  updateQCReceiptHeader,
  updateQCReceiptLine,
  type QCReceiptHeader,
  type QCReceiptLine,
} from "@/lib/api/services/qc-receipt.service";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ALL_COLUMNS,
  buildSelectQuery,
  getDefaultVisibleColumns,
  loadVisibleColumns,
  saveVisibleColumns,
  type SortDirection,
} from "./column-config";
import { buildQCReceiptFilterString } from "./utils/filter-builder";

export function useQCReceipts(initialFilters?: {
  statusFilter?: string;
  isPosted?: boolean;
  skipDateFilter?: boolean;
}) {
  const [receipts, setReceipts] = useState<QCReceiptHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [sortColumn, setSortColumn] = useState<string | null>("QC_Date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { value: string; valueTo?: string }>
  >({});
  const [dateFilter, setDateFilter] = useState<{
    fromDate: string;
    toDate: string;
  } | null>(
    initialFilters?.skipDateFilter
      ? {
          fromDate: new Date(new Date().setDate(new Date().getDate() - 30))
            .toISOString()
            .split("T")[0],
          toDate: new Date().toISOString().split("T")[0],
        }
      : null,
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    typeof window !== "undefined"
      ? loadVisibleColumns()
      : getDefaultVisibleColumns(),
  );

  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const statusFilter = initialFilters?.statusFilter;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize],
  );

  const getOrderByString = useCallback(() => {
    if (!sortColumn || !sortDirection) return undefined;
    return `${sortColumn} ${sortDirection}`;
  }, [sortColumn, sortDirection]);

  const fetchReceipts = useCallback(async () => {
    if (!dateFilter) return;

    setIsLoading(true);

    try {
      const filterParts: string[] = [];

      // Date filter
      if (dateFilter.fromDate)
        filterParts.push(`QC_Date ge ${dateFilter.fromDate}`);
      if (dateFilter.toDate)
        filterParts.push(`QC_Date le ${dateFilter.toDate}`);

      // Status filter from tabs
      if (statusFilter) {
        filterParts.push(`Approval_Status eq '${statusFilter}'`);
      }

      // Global search
      if (searchQuery) {
        const escaped = searchQuery.replace(/'/g, "''");
        filterParts.push(
          `(contains(No,'${escaped}') or contains(Item_No,'${escaped}') or contains(Item_Name,'${escaped}') or contains(Buy_from_Vendor_Name,'${escaped}'))`,
        );
      }

      // Column filters
      const colFilterStr = buildQCReceiptFilterString({ columnFilters });
      if (colFilterStr) {
        filterParts.push(colFilterStr);
      }

      const filter =
        filterParts.length > 0 ? filterParts.join(" and ") : undefined;

      const select = buildSelectQuery(visibleColumns);
      // For posted receipts, we need to exclude fields that might not exist on the posted entity
      const fieldsToExclude = ["Approval_Status", "Vehicle_No"];
      const finalSelect = initialFilters?.isPosted
        ? select
            .split(",")
            .filter((col) => !fieldsToExclude.includes(col))
            .join(",")
        : select;

      const params: any = {
        $select: finalSelect,
        $orderby: getOrderByString(),
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
        $count: true,
      };

      if (filter) {
        params.$filter = filter;
      }

      const result = initialFilters?.isPosted
        ? await getPostedQCReceiptsWithCount(params)
        : await getQCReceiptsWithCount(params);

      setReceipts(result.receipts);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error fetching QC receipts:", error);
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
    columnFilters,
    statusFilter,
    dateFilter,
    initialFilters?.isPosted,
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
    setSortColumn("QC_Date");
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
    dateFilter,
    visibleColumns,
    setDateFilter,
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

export function useQCReceiptLines(
  receiptNo: string | null,
  isPosted: boolean = false,
) {
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
        const data = isPosted
          ? await getPostedQCReceiptLines(receiptNo)
          : await getQCReceiptLines(receiptNo);
        setLines(data);
      } catch (error) {
        console.error("Error fetching QC lines:", error);
        toast.error("Failed to load QC receipt lines.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLines();
  }, [receiptNo, isPosted]);

  return { lines, setLines, isLoading };
}

export function useQCReceiptPosting() {
  const [isPosting, setIsPosting] = useState(false);

  const postReceipt = useCallback(
    async (header: QCReceiptHeader, lines: QCReceiptLine[]) => {
      setIsPosting(true);
      try {
        await postQCReceipt(header, lines);
        toast.success("QC Receipt posted successfully!");
        return true;
      } catch (error: any) {
        console.error("Error posting QC receipt:", error);
        toast.error(error.message || "Failed to post QC Receipt.");
        return false;
      } finally {
        setIsPosting(false);
      }
    },
    [],
  );

  return { postReceipt, isPosting };
}

export function useQCReceiptLineUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateLine = useCallback(
    async (
      receiptNo: string,
      lineNo: number,
      etag: string,
      fields: Partial<QCReceiptLine>,
    ) => {
      setIsUpdating(true);
      try {
        const result = await updateQCReceiptLine(
          receiptNo,
          lineNo,
          etag,
          fields,
        );
        toast.success("Line updated successfully");
        return result;
      } catch (error: any) {
        console.error("Error updating QC line:", error);
        toast.error(error.message || "Failed to update line");
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  return { updateLine, isUpdating };
}

export function useQCReceiptUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateHeader = useCallback(
    async (
      receiptNo: string,
      etag: string,
      fields: Partial<QCReceiptHeader>,
    ) => {
      setIsUpdating(true);
      try {
        const result = await updateQCReceiptHeader(receiptNo, etag, fields);
        toast.success("Receipt updated successfully");
        return result;
      } catch (error: any) {
        console.error("Error updating QC receipt:", error);
        toast.error(error.message || "Failed to update receipt");
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  return { updateHeader, isUpdating };
}
