"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  getLOBsFromUserSetup,
  getAllBranchesFromUserSetup,
} from "@/lib/api/services/dimension.service";
import {
  getFinishedProductionOrdersWithCount,
  ProductionOrder,
} from "@/lib/api/services/production-orders.service";
import type { PageSize } from "./types";
import {
  type SortDirection,
  loadVisibleColumns,
  saveVisibleColumns,
  getDefaultVisibleColumns,
  buildSelectQuery,
  FINISHED_ORDERS_EXCLUDED_COLUMNS,
  getAvailableColumns,
} from "./column-config";
import {
  buildFilterString as buildODataFilter,
  buildOrderByString,
} from "./utils/filter-builder";

export function useFinishedProductionOrders() {
  const { userID } = useAuth();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [lobCodes, setLobCodes] = useState<string[]>([]);
  const [userBranchCodes, setUserBranchCodes] = useState<string[]>([]);
  const [branchOptions, setBranchOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(
    "Last_Date_Modified",
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Column filters
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { value: string; valueTo?: string }>
  >({});

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    typeof window !== "undefined"
      ? loadVisibleColumns()
      : getDefaultVisibleColumns(),
  );

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  // Fetch LOB codes and Branch codes from user setup
  useEffect(() => {
    if (!userID) return;

    const fetchData = async () => {
      try {
        const [lobs, branches] = await Promise.all([
          getLOBsFromUserSetup(userID),
          getAllBranchesFromUserSetup(userID),
        ]);

        const lCodes = lobs.map((lob) => lob.Code);
        setLobCodes(lCodes);

        const bCodes = branches.map((b) => b.Code);
        setUserBranchCodes(bCodes);
        setBranchOptions(bCodes.map((code) => ({ label: code, value: code })));

        // Select all branches by default - User requirement: "Branch -> ALL Selected"
        if (bCodes.length > 0) {
          setColumnFilters((prev) => ({
            ...prev,
            Shortcut_Dimension_2_Code: { value: bCodes.join(",") },
          }));
        }
      } catch (error) {
        console.error("Error fetching user setup:", error);
        toast.error("Failed to load user settings");
        setLobCodes([]);
        setUserBranchCodes([]);
        setBranchOptions([]);
      }
    };

    fetchData();
  }, [userID]);

  // Build filter string for OData using the utility
  const buildFilterString = useCallback(
    (searchField?: "No" | "Search_Description") => {
      return buildODataFilter({
        lobCodes,
        searchQuery: searchQuery.trim(),
        searchField,
        columnFilters,
        excludeColumns: FINISHED_ORDERS_EXCLUDED_COLUMNS,
      });
    },
    [lobCodes, searchQuery, columnFilters],
  );

  // Build orderby string for OData
  const getOrderByString = useCallback(() => {
    return buildOrderByString(sortColumn, sortDirection);
  }, [sortColumn, sortDirection]);

  // Fetch production orders
  const fetchOrders = useCallback(async () => {
    if (lobCodes.length === 0) return;

    setIsLoading(true);
    try {
      const params = {
        $select: buildSelectQuery(
          visibleColumns,
          FINISHED_ORDERS_EXCLUDED_COLUMNS,
        ),
        $filter: buildFilterString("Search_Description"),
        $orderby: getOrderByString(),
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
      };

      // Calculate branch codes to use (User allowed + Filter)
      const branchFilterValue =
        columnFilters["Shortcut_Dimension_2_Code"]?.value;
      const effectiveBranchCodes = branchFilterValue
        ? branchFilterValue.split(",")
        : userBranchCodes;

      const result = await getFinishedProductionOrdersWithCount(
        params,
        lobCodes,
        effectiveBranchCodes,
      );
      setOrders(result.orders);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error fetching finished production orders:", error);
      toast.error(
        "Failed to load finished production orders. Please try again.",
      );
      setOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    lobCodes,
    userBranchCodes,
    pageSize,
    currentPage,
    visibleColumns,
    searchQuery,
    sortColumn,
    sortDirection,
    columnFilters,
  ]);

  // Fetch orders when dependencies change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handlers
  const handlePageSizeChange = useCallback((size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSort = useCallback((column: string) => {
    // Prevent sorting by columns not available in finished orders
    if (FINISHED_ORDERS_EXCLUDED_COLUMNS.includes(column)) return;

    setSortColumn((prevColumn) => {
      if (prevColumn === column) {
        setSortDirection((prevDir) => {
          if (prevDir === "asc") return "desc";
          if (prevDir === "desc") return null;
          return "asc";
        });
        return column;
      }
      setSortDirection("asc");
      return column;
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    // Reset to all branches selected when clearing filters
    if (userBranchCodes.length > 0) {
      setColumnFilters({
        Shortcut_Dimension_2_Code: { value: userBranchCodes.join(",") },
      });
    } else {
      setColumnFilters({});
    }
    setCurrentPage(1);
  }, [userBranchCodes]);

  const handleColumnFilter = useCallback(
    (columnId: string, value: string, valueTo?: string) => {
      setColumnFilters((prev) => {
        if (!value && !valueTo) {
          const newFilters = { ...prev };
          delete newFilters[columnId];
          return newFilters;
        }
        return { ...prev, [columnId]: { value, valueTo } };
      });
      setCurrentPage(1);
    },
    [],
  );

  const handleColumnToggle = useCallback((columnId: string) => {
    // Prevent toggling columns not available in finished orders
    if (FINISHED_ORDERS_EXCLUDED_COLUMNS.includes(columnId)) return;

    setVisibleColumns((prev) => {
      const newColumns = prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId];
      saveVisibleColumns(newColumns);
      return newColumns;
    });
  }, []);

  const handleResetColumns = useCallback(() => {
    const defaultColumns = getDefaultVisibleColumns();
    setVisibleColumns(defaultColumns);
    saveVisibleColumns(defaultColumns);
  }, []);

  const handleShowAllColumns = useCallback(() => {
    const availableColumns = getAvailableColumns(
      FINISHED_ORDERS_EXCLUDED_COLUMNS,
    );
    const allColumnIds = availableColumns.map((col) => col.id);
    setVisibleColumns(allColumnIds);
    saveVisibleColumns(allColumnIds);
  }, []);

  return {
    orders,
    isLoading,
    // Pagination
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    onPageSizeChange: handlePageSizeChange,
    onPageChange: handlePageChange,
    // Sorting
    sortColumn,
    sortDirection,
    onSort: handleSort,
    // Filtering
    searchQuery,
    onSearch: handleSearch,
    onClearFilters: handleClearFilters,
    columnFilters,
    onColumnFilter: handleColumnFilter,
    // Column visibility
    visibleColumns,
    onColumnToggle: handleColumnToggle,
    onResetColumns: handleResetColumns,
    onShowAllColumns: handleShowAllColumns,
    // Data
    branchOptions,
    userBranchCodes,
    refetch: fetchOrders,
  };
}
