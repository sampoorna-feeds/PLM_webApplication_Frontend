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
  getDefaultVisibleColumns,
  buildSelectQuery,
  ALL_COLUMNS,
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
  
  // Column filters - stores filter values keyed by column ID
  // For date columns, stores {value: 'from', valueTo: 'to'}
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({
    Status: { value: 'Released' } // Default to Released
  });

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
  // searchField parameter allows specifying which field to search (for dual API calls)
  const buildFilterString = useCallback((searchField?: 'No' | 'Search_Description') => {
    const filterParts: string[] = [];

    // Base filter: LOB codes
    const lobFilter = lobCodes.map((c) => `'${c}'`).join(",");
    filterParts.push(`Shortcut_Dimension_1_Code in (${lobFilter})`);

    // Search filter - only add if searchField is specified (for dual API calls)
    if (searchQuery.trim() && searchField) {
      const searchTerm = searchQuery.trim().replace(/'/g, "''");
      filterParts.push(`contains(${searchField},'${searchTerm}')`);
    }

    // Due Date range filter (from filter bar)
    if (dueDateFrom) {
      filterParts.push(`Due_Date ge ${dueDateFrom}`);
    }
    if (dueDateTo) {
      filterParts.push(`Due_Date le ${dueDateTo}`);
    }

    // Column filters
    Object.entries(columnFilters).forEach(([columnId, filter]) => {
      if (!filter.value && !filter.valueTo) return;
      
      const column = ALL_COLUMNS.find(c => c.id === columnId);
      if (!column) return;

      const escapedValue = filter.value.replace(/'/g, "''");

      switch (column.filterType) {
        case 'text':
          if (filter.value.trim()) {
            // Split by comma and trim each value
            const values = filter.value.split(',').map(v => v.trim()).filter(v => v);
            
            if (values.length === 1) {
              // Single value - simple contains
              const escaped = values[0].replace(/'/g, "''");
              filterParts.push(`contains(${columnId},'${escaped}')`);
            } else if (values.length > 1) {
              // Multiple values - OR condition
              const orConditions = values.map(v => {
                const escaped = v.replace(/'/g, "''");
                return `contains(${columnId},'${escaped}')`;
              });
              filterParts.push(`(${orConditions.join(' or ')})`);
            }
          }
          break;
        case 'enum':
          if (filter.value) {
            filterParts.push(`${columnId} eq '${escapedValue}'`);
          }
          break;
        case 'boolean':
          if (filter.value === 'true') {
            filterParts.push(`${columnId} eq true`);
          } else if (filter.value === 'false') {
            filterParts.push(`${columnId} eq false`);
          }
          break;
        case 'date':
          if (filter.value) {
            filterParts.push(`${columnId} ge ${filter.value}`);
          }
          if (filter.valueTo) {
            filterParts.push(`${columnId} le ${filter.valueTo}`);
          }
          break;
        case 'number':
          // Number filters can be: "eq:100", "gt:50", "lt:200", or range with valueTo
          if (filter.valueTo) {
            // Range filter
            if (filter.value) filterParts.push(`${columnId} ge ${filter.value}`);
            filterParts.push(`${columnId} le ${filter.valueTo}`);
          } else if (filter.value) {
            const [operator, numValue] = filter.value.includes(':') 
              ? filter.value.split(':') 
              : ['eq', filter.value];
            switch(operator) {
              case 'gt': filterParts.push(`${columnId} gt ${numValue}`); break;
              case 'lt': filterParts.push(`${columnId} lt ${numValue}`); break;
              default: filterParts.push(`${columnId} eq ${numValue}`);
            }
          }
          break;
      }
    });

    return filterParts.join(" and ");
  }, [lobCodes, searchQuery, dueDateFrom, dueDateTo, columnFilters]);

  // Build orderby string for OData
  const buildOrderByString = useCallback(() => {
    if (!sortColumn || !sortDirection) return undefined;
    return `${sortColumn} ${sortDirection}`;
  }, [sortColumn, sortDirection]);

  // Fetch production orders
  // When searching, makes 2 parallel API calls (one for No, one for Search_Description)
  // then merges and deduplicates results
  const fetchOrders = useCallback(async () => {
    if (lobCodes.length === 0) return;

    setIsLoading(true);
    try {
      const baseParams = {
        $select: buildSelectQuery(visibleColumns),
        $orderby: buildOrderByString(),
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
      };

      // If there's a search query, make 2 parallel API calls
      if (searchQuery.trim()) {
        const [resultByNo, resultByDesc] = await Promise.all([
          getProductionOrdersWithCount({
            ...baseParams,
            $filter: buildFilterString('No'),
          }),
          getProductionOrdersWithCount({
            ...baseParams,
            $filter: buildFilterString('Search_Description'),
          }),
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
        // Use max of both counts as approximation (actual deduped count is complex to calculate)
        setTotalCount(Math.max(resultByNo.totalCount, resultByDesc.totalCount));
      } else {
        // No search - single API call without search filter
        const result = await getProductionOrdersWithCount({
          ...baseParams,
          $filter: buildFilterString(),
        });
        
        setOrders(result.orders);
        setTotalCount(result.totalCount);
      }
    } catch (error) {
      console.error("Error fetching production orders:", error);
      setOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [lobCodes, pageSize, currentPage, visibleColumns, searchQuery, buildFilterString, buildOrderByString]);

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

  const handleShowAllColumns = useCallback(() => {
    const allColumnIds = ALL_COLUMNS.map(c => c.id);
    setVisibleColumns(allColumnIds);
    saveVisibleColumns(allColumnIds);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setDueDateFrom("");
    setDueDateTo("");
    setColumnFilters({ Status: { value: 'Released' } }); // Reset to default
    setSortColumn(null);
    setSortDirection(null);
    setCurrentPage(1);
  }, []);

  // Generic column filter handler
  const handleColumnFilter = useCallback((columnId: string, value: string, valueTo?: string) => {
    setColumnFilters(prev => {
      if (!value && !valueTo) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [columnId]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [columnId]: { value, valueTo }
      };
    });
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
