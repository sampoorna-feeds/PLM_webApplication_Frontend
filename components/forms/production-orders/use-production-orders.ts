"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { getLOBsFromUserSetup } from "@/lib/api/services/dimension.service";
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
  buildSelectQuery,
  getDefaultVisibleColumns,
} from "./column-config";

const DEFAULT_LOB_CODES = ["CATTLE", "CBF", "FEED"];

export function useProductionOrders() {
  const { userID } = useAuth();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [lobCodes, setLobCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>("Last_Date_Modified");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState<string>("");
  const [dueDateTo, setDueDateTo] = useState<string>("");

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => 
    typeof window !== 'undefined' ? loadVisibleColumns() : getDefaultVisibleColumns()
  );

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  // Fetch LOB codes from user setup
  useEffect(() => {
    if (!userID) return;

    const fetchLOBCodes = async () => {
      try {
        const lobs = await getLOBsFromUserSetup(userID);
        const codes = lobs.map((lob) => lob.Code);
        setLobCodes(codes.length > 0 ? codes : DEFAULT_LOB_CODES);
      } catch (error) {
        console.error("Error fetching LOB codes:", error);
        setLobCodes(DEFAULT_LOB_CODES);
      }
    };

    fetchLOBCodes();
  }, [userID]);

  // Build filter string for OData
  const buildFilterString = useCallback(() => {
    const filterParts: string[] = [];

    // Base filter: Status and LOB codes
    const lobFilter = lobCodes.map((c) => `'${c}'`).join(",");
    filterParts.push(`Status eq 'Released' and Shortcut_Dimension_1_Code in (${lobFilter})`);

    // Search filter - BC OData doesn't support OR across different fields
    // So we only search on Search_Description (which is typically a combined search field)
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.trim().replace(/'/g, "''"); // Escape single quotes
      filterParts.push(`contains(Search_Description,'${searchTerm}')`);
    }

    // Date range filter for Due_Date
    if (dueDateFrom) {
      filterParts.push(`Due_Date ge ${dueDateFrom}`);
    }
    if (dueDateTo) {
      filterParts.push(`Due_Date le ${dueDateTo}`);
    }

    return filterParts.join(" and ");
  }, [lobCodes, searchQuery, dueDateFrom, dueDateTo]);

  // Build orderby string for OData
  const buildOrderByString = useCallback(() => {
    if (!sortColumn || !sortDirection) return undefined;
    return `${sortColumn} ${sortDirection}`;
  }, [sortColumn, sortDirection]);

  // Fetch production orders
  const fetchOrders = useCallback(async () => {
    if (lobCodes.length === 0) return;

    setIsLoading(true);
    try {
      const result = await getProductionOrdersWithCount({
        $select: buildSelectQuery(visibleColumns),
        $filter: buildFilterString(),
        $orderby: buildOrderByString(),
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
      });
      
      setOrders(result.orders);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error fetching production orders:", error);
      setOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [lobCodes, pageSize, currentPage, visibleColumns, buildFilterString, buildOrderByString]);

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
    setSortColumn((prevColumn) => {
      if (prevColumn === column) {
        // Toggle direction: asc -> desc -> null
        setSortDirection((prevDir) => {
          if (prevDir === 'asc') return 'desc';
          if (prevDir === 'desc') return null;
          return 'asc';
        });
        return column;
      } else {
        setSortDirection('asc');
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

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setDueDateFrom("");
    setDueDateTo("");
    setSortColumn(null);
    setSortDirection(null);
    setCurrentPage(1);
  }, []);

  return {
    // Data
    orders,
    isLoading,
    lobCodes,
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
    // Filtering
    searchQuery,
    dueDateFrom,
    dueDateTo,
    onSearch: handleSearch,
    onDateFilter: handleDateFilter,
    onClearFilters: handleClearFilters,
    // Column visibility
    visibleColumns,
    onColumnToggle: handleColumnToggle,
    onResetColumns: handleResetColumns,
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
