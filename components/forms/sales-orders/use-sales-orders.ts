"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/auth-context";
import { getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";
import {
  getSalesOrdersWithCount,
  type SalesOrder,
} from "@/lib/api/services/sales-orders.service";
import {
  type SortDirection,
  loadVisibleColumns,
  saveVisibleColumns,
  getDefaultVisibleColumns,
  buildSelectQuery,
  ALL_COLUMNS,
} from "./column-config";
import { buildSalesOrderFilterString } from "./utils/filter-builder";

export type SalesOrderStatusTab = "Open" | "Pending Approval" | "Released";

export interface UseSalesOrdersOptions {
  /** Status filter for tab (Open | Pending Approval | Released). Applied at API level. */
  statusFilter?: SalesOrderStatusTab;
}

export function useSalesOrders(options: UseSalesOrdersOptions = {}) {
  const { statusFilter } = options;
  const { userID } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize],
  );

  // Fetch user branch codes and default column filter to all branches
  useEffect(() => {
    if (!userID) return;

    const fetchBranches = async () => {
      try {
        const branches = await getAllBranchesFromUserSetup(userID);
        const bCodes = branches.map((b) => b.Code);
        setUserBranchCodes(bCodes);
        if (bCodes.length > 0) {
          setColumnFilters((prev) =>
            prev.Shortcut_Dimension_2_Code !== undefined
              ? prev
              : { ...prev, Shortcut_Dimension_2_Code: { value: bCodes.join(",") } },
          );
        }
      } catch (error) {
        console.error("Error fetching user branches:", error);
        toast.error("Failed to load user settings. Using defaults.");
        setUserBranchCodes([]);
      }
    };

    fetchBranches();
  }, [userID]);

  const getOrderByString = useCallback(() => {
    if (!sortColumn || !sortDirection) return "No desc";
    return `${sortColumn} ${sortDirection}`;
  }, [sortColumn, sortDirection]);

  const fetchOrders = useCallback(async () => {
    const branchFilterValue =
      columnFilters["Shortcut_Dimension_2_Code"]?.value;
    const effectiveBranchCodes = branchFilterValue
      ? branchFilterValue.split(",").map((c) => c.trim()).filter(Boolean)
      : userBranchCodes;

    if (effectiveBranchCodes.length === 0) {
      setOrders([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const filter = buildSalesOrderFilterString({
        branchCodes: effectiveBranchCodes,
        statusFilter,
        searchQuery,
        columnFilters,
      });

      const result = await getSalesOrdersWithCount({
        $select: buildSelectQuery(visibleColumns),
        $filter: filter,
        $orderby: getOrderByString(),
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
      });

      setOrders(result.orders);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
      toast.error("Failed to load sales orders. Please try again.");
      setOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    visibleColumns,
    searchQuery,
    columnFilters,
    userBranchCodes,
    statusFilter,
    getOrderByString,
  ]);

  // Reset to page 1 when status tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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
  };
}
