"use client";

import {
  getPostedQCReceiptLines,
  getPostedQCReceiptsWithCount,
  getQCReceiptHeader,
  getPostedQCReceiptHeader,
  getQCReceiptLines,
  getQCReceiptsWithCount,
  postQCReceipt,
  searchPostedQCReceipts,
  searchQCReceipts,
  updateQCReceiptHeader,
  updateQCReceiptLine,
  deleteQCReceiptHeader,
  generateBardana,
  type QCReceiptHeader,
  type QCReceiptLine,
} from "@/lib/api/services/qc-receipt.service";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState(200);
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
  } | null>(null);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    typeof window !== "undefined"
      ? loadVisibleColumns()
      : getDefaultVisibleColumns(),
  );

  const [hasMore, setHasMore] = useState(false);

  const isLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const lastRequestId = useRef(0);
  const pageRef = useRef(1);

  const statusFilter = initialFilters?.statusFilter;
  const skipDateFilter = initialFilters?.skipDateFilter;

  const { userID } = useAuth();
  const [authBranches, setAuthBranches] = useState<string[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Load user's authorized branches
  useEffect(() => {
    const loadAuthBranches = async () => {
      if (!userID) return;
      setIsAuthLoading(true);
      try {
        const setup = await getAllBranchesFromUserSetup(userID);
        const branches = setup.map((s) => s.Code).filter(Boolean);
        setAuthBranches(branches);
      } catch (error) {
        console.error("Error loading user authorized branches:", error);
      } finally {
        setIsAuthLoading(false);
      }
    };
    loadAuthBranches();
  }, [userID]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize],
  );

  const getOrderByString = useCallback(() => {
    if (!sortColumn || !sortDirection) return undefined;
    return `${sortColumn} ${sortDirection}`;
  }, [sortColumn, sortDirection]);

  const fetchReceipts = useCallback(async (reset = false) => {
    if (userID && isAuthLoading) return;

    if (!skipDateFilter && !dateFilter) {
      setIsLoading(false);
      return;
    }

    const requestId = ++lastRequestId.current;
    if (reset) {
      pageRef.current = 1;
      isLoadingRef.current = true;
      setIsLoading(true);
    } else {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
    }

    try {
      const filterParts: string[] = [];

      // Date filter
      if (dateFilter?.fromDate)
        filterParts.push(`QC_Date ge ${dateFilter.fromDate}`);
      if (dateFilter?.toDate)
        filterParts.push(`QC_Date le ${dateFilter.toDate}`);

      // Status filter from tabs
      if (statusFilter) {
        if (statusFilter === "Approved") {
          filterParts.push("Approve eq true");
        } else {
          filterParts.push(`Approval_Status eq '${statusFilter}'`);
        }
      }

      // Global search - handled by the service to avoid OData OR restrictions
      const searchTerm = searchQuery ? searchQuery : undefined;

      // Column filters
      const colFilterStr = buildQCReceiptFilterString({ columnFilters });
      if (colFilterStr) {
        filterParts.push(colFilterStr);
      }

      // Authorized branches filter
      if (authBranches.length > 0) {
        const branchFilter = authBranches
          .map((branch) => `Shortcut_Dimension_2_Code eq '${branch}'`)
          .join(" or ");
        filterParts.push(`(${branchFilter})`);
      } else if (!isAuthLoading) {
        // If user has no branches assigned and loading finished, they see nothing
        filterParts.push("No eq 'NONE'");
      }

      const filter =
        filterParts.length > 0 ? filterParts.join(" and ") : undefined;

      const select = buildSelectQuery(visibleColumns);
      // For posted receipts, we need to exclude fields that might not exist on the posted entity
      // For unposted receipts, we need to exclude fields that only exist on the posted entity (like Bardana_RPO)
      const fieldsToExclude = initialFilters?.isPosted
        ? ["Approval_Status"]
        : ["Bardana_RPO"];

      const finalSelect = select
        .split(",")
        .filter((col) => !fieldsToExclude.includes(col))
        .join(",");

      const params: any = {
        $select: finalSelect,
        $orderby: getOrderByString(),
        $top: pageSize,
        $skip: (pageRef.current - 1) * pageSize,
        $count: true,
      };

      if (filter) {
        params.$filter = filter;
      }

      const result = initialFilters?.isPosted
        ? await searchPostedQCReceipts({ ...params, searchTerm })
        : await searchQCReceipts({ ...params, searchTerm });

      if (requestId !== lastRequestId.current) return;

      if (pageRef.current === 1) {
        setReceipts(result.receipts || []);
      } else {
        setReceipts(prev => [...prev, ...(result.receipts || [])]);
      }
      setTotalCount(result.totalCount ?? result.receipts?.length ?? 0);
      setHasMore(pageRef.current * pageSize < (result.totalCount ?? 0));
      setCurrentPage(pageRef.current);
    } catch (error) {
      if (requestId !== lastRequestId.current) return;
      console.error("Error fetching QC receipts:", error);
      toastError(error, "Failed to load QC receipts. Please try again.");
      if (pageRef.current === 1) {
        setReceipts([]);
        setTotalCount(0);
      }
    } finally {
      if (requestId === lastRequestId.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
        isLoadingRef.current = false;
        isLoadingMoreRef.current = false;
      }
    }
  }, [
    pageSize,
    visibleColumns,
    getOrderByString,
    searchQuery,
    columnFilters,
    statusFilter,
    dateFilter,
    initialFilters?.isPosted,
    authBranches,
    isAuthLoading,
    userID,
    skipDateFilter,
  ]);

  const loadMore = useCallback(() => {
    if (isLoadingRef.current || isLoadingMoreRef.current || !hasMore) return;
    pageRef.current += 1;
    fetchReceipts(false);
  }, [hasMore, fetchReceipts]);

  useEffect(() => {
    fetchReceipts(true);
  }, [fetchReceipts]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
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
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
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
    },
    [],
  );

  return {
    receipts,
    isLoading,
    isLoadingMore,
    hasMore,
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
    refetch: () => fetchReceipts(true),
    loadMore,
  };
}

export function useQCReceiptDetail(receiptNo: string | null, isPosted: boolean = false) {
  const [receipt, setReceipt] = useState<QCReceiptHeader | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!receiptNo) return;
    setIsLoading(true);
    try {
      const data = isPosted
        ? await getPostedQCReceiptHeader(receiptNo)
        : await getQCReceiptHeader(receiptNo);
      setReceipt(data);
    } catch (error) {
      console.error("Error fetching QC receipt detail:", error);
      toastError(error, "Failed to load QC receipt details.");
    } finally {
      setIsLoading(false);
    }
  }, [receiptNo, isPosted]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { receipt, setReceipt, isLoading, refetch: fetchDetail };
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
        toastError(error, "Failed to load QC receipt lines.");
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
    async (receiptNo: string) => {
      setIsPosting(true);
      try {
        const { getAuthCredentials } = await import("@/lib/auth/storage");
        const creds = getAuthCredentials();
        await postQCReceipt(receiptNo, creds?.userID || "");
        toast.success("QC Receipt posted successfully!");
        return true;
      } catch (error: any) {
        console.error("Error posting QC receipt:", error);
        toastError(error, "Failed to post QC Receipt.");
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
        toastError(error, "Failed to update line");
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
        toastError(error, "Failed to update receipt");
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  return { updateHeader, isUpdating };
}

export function useQCReceiptDeletion() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteReceipt = useCallback(
    async (receiptNo: string) => {
      setIsDeleting(true);
      try {
        await deleteQCReceiptHeader(receiptNo);
        toast.success("QC Receipt deleted successfully!");
        return true;
      } catch (error: any) {
        console.error("Error deleting QC receipt:", error);
        toastError(error, "Failed to delete QC Receipt");
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [],
  );

  return { deleteReceipt, isDeleting };
}

export function useQCReceiptBardana() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async (receiptNo: string) => {
      setIsGenerating(true);
      try {
        await generateBardana(receiptNo);
        toast.success("Bardana generated successfully!");
        return true;
      } catch (error: any) {
        console.error("Error generating bardana:", error);
        toastError(error, "Failed to generate Bardana");
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return { generate, isGenerating };
}
