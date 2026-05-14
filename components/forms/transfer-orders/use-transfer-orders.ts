"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { useAuth } from "@/lib/contexts/auth-context";
import { getAllBranchesFromUserSetup, getLOBsFromUserSetup } from "@/lib/api/services/dimension.service";
import {
  getTransferOrdersWithCount,
  searchTransferOrders,
  type TransferOrder,
} from "@/lib/api/services/transfer-orders.service";
import {
  type SortDirection,
  loadVisibleColumns,
  saveVisibleColumns,
  getDefaultVisibleColumns,
  buildSelectQuery,
  ALL_COLUMNS,
} from "./column-config";
import { buildTransferOrderFilterString } from "./utils/filter-builder";

export type TransferOrderStatusTab = "Open" | "Pending Approval" | "Released";

export interface UseTransferOrdersOptions {
  /** Status filter for tab (Open | Pending Approval | Released). Applied at API level. */
  statusFilter?: TransferOrderStatusTab;
}

export function useTransferOrders(options: UseTransferOrdersOptions = {}) {
  const { statusFilter } = options;
  const { userID } = useAuth();
  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState(200);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isSetupLoaded, setIsSetupLoaded] = useState(false);

  const [userLobCodes, setUserLobCodes] = useState<string[]>([]);
  const [userBranchCodes, setUserBranchCodes] = useState<string[]>([]);

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

  const isLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const lastRequestId = useRef(0);
  const pageRef = useRef(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize],
  );

  // Fetch user branch codes and default column filter to all branches
  useEffect(() => {
    if (!userID) return;

    const fetchUserSetup = async () => {
      try {
        const [lobData, branchData] = await Promise.all([
          getLOBsFromUserSetup(userID),
          getAllBranchesFromUserSetup(userID),
        ]);

        const lCodes = lobData.map((l) => l.Code);
        const bCodes = branchData.map((b) => b.Code);

        setUserLobCodes(lCodes);
        setUserBranchCodes(bCodes);

        const newFilters: Record<string, { value: string }> = {};

        if (lCodes.length > 0 && columnFilters.Shortcut_Dimension_1_Code === undefined) {
          newFilters.Shortcut_Dimension_1_Code = { value: lCodes.join(",") };
        }

        if (bCodes.length > 0 && columnFilters.Shortcut_Dimension_2_Code === undefined) {
          newFilters.Shortcut_Dimension_2_Code = { value: bCodes.join(",") };
        }

        if (Object.keys(newFilters).length > 0) {
          setColumnFilters((prev) => ({ ...prev, ...newFilters }));
        }
        setIsSetupLoaded(true);
      } catch (error) {
        console.error("Error fetching user setup:", error);
        toastError(error, "Failed to load user settings. Using defaults.");
        setUserLobCodes([]);
        setUserBranchCodes([]);
        setIsSetupLoaded(true); // Still set to true to allow fallback fetching if needed, or we could keep it false
      }
    };

    fetchUserSetup();
  }, [userID]);

  const getOrderByString = useCallback(() => {
    if (!sortColumn || !sortDirection) return "No desc";
    return `${sortColumn} ${sortDirection}`;
  }, [sortColumn, sortDirection]);

  const fetchOrders = useCallback(async (reset = false) => {
    if (!isSetupLoaded) return;

    const requestId = ++lastRequestId.current;
    
    if (reset) {
      pageRef.current = 1;
      isLoadingRef.current = true;
      setIsLoading(true);
    } else {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
    }

    const lobFilterValue = columnFilters["Shortcut_Dimension_1_Code"]?.value;
    const effectiveLobCodes = lobFilterValue
      ? lobFilterValue
          .split(",")
          .map((c) => c.trim())
          .filter((c) => userLobCodes.includes(c))
      : userLobCodes;

    const branchFilterValue = columnFilters["Shortcut_Dimension_2_Code"]?.value;
    const effectiveBranchCodes = branchFilterValue
      ? branchFilterValue
          .split(",")
          .map((c) => c.trim())
          .filter((c) => userBranchCodes.includes(c))
      : userBranchCodes;

    try {
      const filter = buildTransferOrderFilterString({
        lobCodes: effectiveLobCodes,
        branchCodes: effectiveBranchCodes,
        statusFilter,
        columnFilters,
      });

      const commonParams = {
        $select: buildSelectQuery(visibleColumns),
        $filter: filter,
        $orderby: getOrderByString(),
        $top: pageSize,
        $skip: (pageRef.current - 1) * pageSize,
      };

      const result = searchQuery
        ? await searchTransferOrders({
            ...commonParams,
            searchTerm: searchQuery,
          })
        : await getTransferOrdersWithCount(commonParams);

      if (requestId !== lastRequestId.current) return;

      if (pageRef.current === 1) {
        setOrders(result.orders);
      } else {
        setOrders((prev) => [...prev, ...result.orders]);
      }
      setTotalCount(result.totalCount);
      setHasMore(pageRef.current * pageSize < result.totalCount);
      setCurrentPage(pageRef.current);
    } catch (error) {
      if (requestId !== lastRequestId.current) return;
      console.warn("Error fetching transfer orders:", error);
      toastError(error, "Failed to load transfer orders. Please try again.");
      if (pageRef.current === 1) {
        setOrders([]);
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
    isSetupLoaded,
    pageSize,
    visibleColumns,
    searchQuery,
    columnFilters,
    userLobCodes,
    userBranchCodes,
    statusFilter,
    getOrderByString,
  ]);

  // Reset to page 1 when status tab changes
  useEffect(() => {
    fetchOrders(true);
  }, [statusFilter, searchQuery, columnFilters, sortColumn, sortDirection, visibleColumns, pageSize, fetchOrders]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const loadMore = useCallback(() => {
    if (isLoadingRef.current || isLoadingMoreRef.current || !hasMore) return;
    pageRef.current += 1;
    fetchOrders(false);
  }, [hasMore, fetchOrders]);

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
    orders,
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
    refetch: fetchOrders,
    loadMore,
    hasMore,
    isLoadingMore,
  };
}
