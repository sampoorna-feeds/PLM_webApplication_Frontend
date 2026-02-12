"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  getLOBsFromUserSetup,
  getAllBranchesFromUserSetup,
} from "@/lib/api/services/dimension.service";
import {
  getProductionOrdersWithCount,
  getProductionOrderByNo,
  getProductionOrderLines,
  getProductionOrderComponents,
  ProductionOrder,
  ProductionOrderLine,
  ProductionOrderComponent,
} from "@/lib/api/services/production-orders.service";
import type {
  PageSize,
  SheetMode,
  ProductionOrderFormData,
  SourceType,
  BatchSize,
} from "./types";
import { EMPTY_FORM_DATA } from "./types";
import {
  type SortDirection,
  loadVisibleColumns,
  saveVisibleColumns,
  getDefaultVisibleColumns,
  buildSelectQuery,
  RELEASED_ORDERS_EXCLUDED_COLUMNS,
  getAvailableColumns,
} from "./column-config";
import {
  buildFilterString as buildODataFilter,
  buildOrderByString,
} from "./utils/filter-builder";

export function useProductionOrders() {
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
  const [dueDateFrom, setDueDateFrom] = useState<string>("");
  const [dueDateTo, setDueDateTo] = useState<string>("");

  // Column filters - stores filter values keyed by column ID
  // Note: Status default is ALL (empty), so we initialize as empty object
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
        dueDateFrom,
        dueDateTo,
        columnFilters,
        excludeColumns: RELEASED_ORDERS_EXCLUDED_COLUMNS,
      });
    },
    [lobCodes, searchQuery, dueDateFrom, dueDateTo, columnFilters],
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
      const baseParams = {
        $select: buildSelectQuery(
          visibleColumns,
          RELEASED_ORDERS_EXCLUDED_COLUMNS,
        ),
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

      // If there's a search query, make 2 parallel API calls
      if (searchQuery.trim()) {
        const [resultByNo, resultByDesc] = await Promise.all([
          getProductionOrdersWithCount(
            {
              ...baseParams,
              $filter: buildFilterString("No"),
            },
            lobCodes,
            effectiveBranchCodes,
          ),
          getProductionOrdersWithCount(
            {
              ...baseParams,
              $filter: buildFilterString("Search_Description"),
            },
            lobCodes,
            effectiveBranchCodes,
          ),
        ]);

        // Merge results and remove duplicates by No
        const seen = new Set<string>();
        const mergedOrders: ProductionOrder[] = [];

        for (const order of [...resultByNo.orders, ...resultByDesc.orders]) {
          if (!seen.has(order.No)) {
            seen.add(order.No);
            mergedOrders.push(order);
          }
        }

        // Limit to pageSize and estimate total count
        setOrders(mergedOrders.slice(0, pageSize));
        setTotalCount(Math.max(resultByNo.totalCount, resultByDesc.totalCount));
      } else {
        const result = await getProductionOrdersWithCount(
          {
            ...baseParams,
            $filter: buildFilterString(),
          },
          lobCodes,
          effectiveBranchCodes,
        );

        setOrders(result.orders);
        setTotalCount(result.totalCount);
      }
    } catch (error) {
      console.error("Error fetching production orders:", error);
      toast.error("Failed to load production orders. Please try again.");
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
    buildFilterString,
    getOrderByString,
    columnFilters,
  ]);

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
    if (RELEASED_ORDERS_EXCLUDED_COLUMNS.includes(column)) return;
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

  const handleDateFilter = useCallback((from: string, to: string) => {
    setDueDateFrom(from);
    setDueDateTo(to);
    setCurrentPage(1);
  }, []);

  const handleColumnToggle = useCallback((columnId: string) => {
    if (RELEASED_ORDERS_EXCLUDED_COLUMNS.includes(columnId)) return;
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
    const availableColumns = getAvailableColumns(
      RELEASED_ORDERS_EXCLUDED_COLUMNS,
    );
    const allColumnIds = availableColumns.map((c) => c.id);
    setVisibleColumns(allColumnIds);
    saveVisibleColumns(allColumnIds);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setDueDateFrom("");
    setDueDateTo("");

    // Reset to defaults: Status=All (Empty), Branch=All User Branches
    const defaultFilters: Record<string, { value: string; valueTo?: string }> =
      {};

    if (userBranchCodes.length > 0) {
      defaultFilters["Shortcut_Dimension_2_Code"] = {
        value: userBranchCodes.join(","),
      };
    }

    setColumnFilters(defaultFilters);
    // Reset to default sort: Last Modified Desc
    setSortColumn("Last_Date_Modified");
    setSortDirection("desc");
    setCurrentPage(1);
  }, [userBranchCodes]);

  // Generic column filter handler
  const handleColumnFilter = useCallback(
    (columnId: string, value: string, valueTo?: string) => {
      setColumnFilters((prev) => {
        if (!value && !valueTo) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [columnId]: _, ...rest } = prev;
          return rest;
        }
        return {
          ...prev,
          [columnId]: { value, valueTo },
        };
      });
      setCurrentPage(1);
    },
    [],
  );

  return {
    // Data
    orders,
    isLoading,
    lobCodes,
    userBranchCodes,
    branchOptions,
    // Pagination
    pageSize,
    currentPage,
    totalCount,
    totalPages,
    onPageSizeChange: handlePageSizeChange,
    onPageChange: handlePageChange,
    // Sorting
    sortColumn,
    sortDirection,
    onSort: handleSort,
    // Filtering - Basic
    searchQuery,
    dueDateFrom,
    dueDateTo,
    onSearch: handleSearch,
    onDateFilter: handleDateFilter,
    onClearFilters: handleClearFilters,
    // Column filters (generic)
    columnFilters,
    onColumnFilter: handleColumnFilter,
    // Column visibility
    visibleColumns,
    onColumnToggle: handleColumnToggle,
    onResetColumns: handleResetColumns,
    onShowAllColumns: handleShowAllColumns,
    // Refresh
    refetch: fetchOrders,
    addOrder: useCallback((order: ProductionOrder) => {
      setOrders((prev) => [order, ...prev]);
      setTotalCount((prev) => prev + 1);
    }, []),
  };
}

export function useProductionOrderSheet() {
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<SheetMode>("view");

  // Open sheet to view/edit existing order
  const openOrderDetail = async (orderNo: string) => {
    setIsLoading(true);
    try {
      const order = await getProductionOrderByNo(orderNo);
      if (order) {
        setSelectedOrder(order);
        setMode("view");
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Open sheet to create new order
  const openCreateOrder = () => {
    setSelectedOrder(null);
    setMode("create");
    setIsOpen(true);
  };

  // Close sheet and reset state
  const closeSheet = () => {
    setIsOpen(false);
    setSelectedOrder(null);
    setMode("view");
  };

  // Handle save (create or update)
  const handleSave = async (data: ProductionOrderFormData): Promise<void> => {
    setIsSaving(true);
    try {
      if (mode === "create") {
        // TODO: Call create API when available
        console.log("Creating new order:", data);
        // await createProductionOrder(data);
      } else if (mode === "edit") {
        // TODO: Call update API when available
        console.log("Updating order:", data);
        // await updateProductionOrder(data);
      }
      closeSheet();
    } catch (error) {
      console.error("Error saving order:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Convert ProductionOrder to form data
  const getFormData = (): ProductionOrderFormData => {
    if (!selectedOrder) return EMPTY_FORM_DATA;

    // Map Source_Type from API to form format
    const mapSourceType = (apiType?: string): SourceType => {
      if (!apiType) return "";
      // API might return different formats, normalize them
      const normalized = apiType.toLowerCase();
      if (normalized === "item" || normalized === "0") return "Item";
      if (normalized === "family" || normalized === "1") return "Family";
      if (
        normalized === "sales header" ||
        normalized === "salesheader" ||
        normalized === "2"
      )
        return "Sales Header";
      return "";
    };

    return {
      No: selectedOrder.No,
      Description: selectedOrder.Description || "",
      Shortcut_Dimension_1_Code: selectedOrder.Shortcut_Dimension_1_Code || "",
      Shortcut_Dimension_2_Code: selectedOrder.Shortcut_Dimension_2_Code || "",
      Shortcut_Dimension_3_Code: selectedOrder.Shortcut_Dimension_3_Code || "",
      Source_Type: mapSourceType(selectedOrder.Source_Type),
      Source_No: selectedOrder.Source_No || "",
      Quantity: selectedOrder.Quantity || 0,
      Due_Date: selectedOrder.Due_Date || "",
      Location_Code: selectedOrder.Location_Code || "",
      Hatching_Date: selectedOrder.Hatching_Date || "",
      Prod_Bom_No: selectedOrder.Prod_Bom_No || "",
      BOM_Version_No: selectedOrder.BOM_Version_No || "",
      isProdBomFromItem: !!selectedOrder.Prod_Bom_No, // If BOM exists, assume from item
      Batch_Size: (selectedOrder.Batch_Size as BatchSize) || "",
    };
  };

  return {
    selectedOrder,
    isOpen,
    isLoading,
    isSaving,
    mode,
    formData: getFormData(),
    setMode,
    setIsOpen,
    openOrderDetail,
    openCreateOrder,
    closeSheet,
    handleSave,
  };
}

/**
 * Hook for fetching production order lines
 */
export function useProductionOrderLines(orderNo: string | null) {
  const [lines, setLines] = useState<ProductionOrderLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!orderNo) {
      setLines([]);
      return;
    }

    const fetchLines = async () => {
      setIsLoading(true);
      try {
        const data = await getProductionOrderLines(orderNo);
        setLines(data);
      } catch (error) {
        console.error("Error fetching order lines:", error);
        setLines([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLines();
  }, [orderNo]);

  return {
    lines,
    isLoading,
  };
}

/**
 * Hook for fetching production order components for a specific line
 */
export function useProductionOrderComponents(
  orderNo: string | null,
  lineNo: number | null,
) {
  const [components, setComponents] = useState<ProductionOrderComponent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!orderNo || !lineNo) {
      setComponents([]);
      return;
    }

    const fetchComponents = async () => {
      setIsLoading(true);
      try {
        const data = await getProductionOrderComponents(orderNo, lineNo);
        setComponents(data);
      } catch (error) {
        console.error("Error fetching order components:", error);
        setComponents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComponents();
  }, [orderNo, lineNo]);

  return {
    components,
    isLoading,
  };
}
