"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/auth-context";
import { getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";
import {
  getPurchaseOrdersWithCount,
  searchPurchaseOrders,
  type PurchaseOrder,
} from "@/lib/api/services/purchase-orders.service";
import {
  getPurchaseInvoicesWithCount,
  searchPurchaseInvoices,
} from "@/lib/api/services/purchase-invoices.service";
import {
  getPurchaseReturnOrdersWithCount,
  searchPurchaseReturnOrders,
} from "@/lib/api/services/purchase-return-orders.service";
import {
  getPurchaseCreditMemosWithCount,
  searchPurchaseCreditMemos,
} from "@/lib/api/services/purchase-credit-memos.service";
import {
  type SortDirection,
  getColumnConfig,
} from "@/components/forms/purchase/column-config";
import { buildPurchaseOrderFilterString } from "@/components/forms/purchase/utils/filter-builder";
import type { FilterCondition } from "@/components/forms/purchase/types";
import {
  type PurchaseDocumentType,
  type PurchaseDocumentStatusTab,
} from "./purchase-document-config";

interface DocumentListParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
}

interface DocumentListResponse {
  orders: PurchaseOrder[];
  totalCount: number;
}

type FetchListFn = (
  params: DocumentListParams,
) => Promise<DocumentListResponse>;

type SearchListFn = (
  params: DocumentListParams & { searchTerm?: string },
) => Promise<DocumentListResponse>;

interface DocumentApiHandlers {
  fetchWithCount: FetchListFn;
  search: SearchListFn;
}

const DOCUMENT_API_HANDLERS: Record<PurchaseDocumentType, DocumentApiHandlers> = {
  order: {
    fetchWithCount: getPurchaseOrdersWithCount,
    search: searchPurchaseOrders,
  },
  invoice: {
    fetchWithCount: getPurchaseInvoicesWithCount,
    search: searchPurchaseInvoices,
  },
  "return-order": {
    fetchWithCount: getPurchaseReturnOrdersWithCount,
    search: searchPurchaseReturnOrders,
  },
  "credit-memo": {
    fetchWithCount: getPurchaseCreditMemosWithCount,
    search: searchPurchaseCreditMemos,
  },
};

export interface UsePurchaseDocumentsOptions {
  documentType: PurchaseDocumentType;
  statusFilter?: PurchaseDocumentStatusTab;
}

export function usePurchaseDocuments(options: UsePurchaseDocumentsOptions) {
  const { documentType, statusFilter } = options;
  const { userID } = useAuth();

  const columnConfig = useMemo(() => getColumnConfig(documentType), [documentType]);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
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
  const [additionalFilters, setAdditionalFilters] = useState<FilterCondition[]>(
    [],
  );
  const [poType, setPoType] = useState<string>("Both");

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    typeof window !== "undefined"
      ? getColumnConfig(documentType).loadVisibleColumns()
      : getColumnConfig(documentType).getDefaultVisibleColumns(),
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize],
  );

  useEffect(() => {
    if (!userID) return;

    const fetchBranches = async () => {
      try {
        const branches = await getAllBranchesFromUserSetup(userID);
        const branchCodes = branches.map((branch) => branch.Code);
        setUserBranchCodes(branchCodes);

        if (branchCodes.length > 0) {
          setColumnFilters((prev) =>
            prev.Shortcut_Dimension_2_Code !== undefined
              ? prev
              : {
                  ...prev,
                  Shortcut_Dimension_2_Code: { value: branchCodes.join(",") },
                },
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
    const branchFilterValue = columnFilters["Shortcut_Dimension_2_Code"]?.value;
    const effectiveBranchCodes = branchFilterValue
      ? branchFilterValue
          .split(",")
          .map((code) => code.trim())
          .filter(Boolean)
      : userBranchCodes;

    if (effectiveBranchCodes.length === 0) {
      setOrders([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    const { fetchWithCount, search } = DOCUMENT_API_HANDLERS[documentType];

    setIsLoading(true);
    try {
      const filter = buildPurchaseOrderFilterString({
        branchCodes: effectiveBranchCodes,
        statusFilter,
        columnFilters,
        additionalFilters,
        poType: documentType === "order" ? poType : "Both",
      });

      const commonParams: DocumentListParams = {
        $select: columnConfig.buildSelectQuery(visibleColumns),
        $filter: filter,
        $orderby: getOrderByString(),
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
      };

      const result = searchQuery
        ? await search({ ...commonParams, searchTerm: searchQuery })
        : await fetchWithCount(commonParams);

      setOrders(result.orders);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error fetching purchase documents:", error);
      toast.error("Failed to load purchase documents. Please try again.");
      setOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    additionalFilters,
    columnFilters,
    currentPage,
    documentType,
    getOrderByString,
    pageSize,
    poType,
    searchQuery,
    statusFilter,
    userBranchCodes,
    visibleColumns,
  ]);

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
    setSortColumn((previousColumn) => {
      if (previousColumn === column) {
        setSortDirection((previousDirection) => {
          if (previousDirection === "asc") return "desc";
          if (previousDirection === "desc") return null;
          return "asc";
        });
        return column;
      }

      setSortDirection("asc");
      return column;
    });
    setCurrentPage(1);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleColumnToggle = useCallback((columnId: string) => {
    setVisibleColumns((previousColumns) => {
      const nextColumns = previousColumns.includes(columnId)
        ? previousColumns.filter((id) => id !== columnId)
        : [...previousColumns, columnId];
      columnConfig.saveVisibleColumns(nextColumns);
      return nextColumns;
    });
  }, [columnConfig]);

  const handleResetColumns = useCallback(() => {
    const defaults = columnConfig.getDefaultVisibleColumns();
    setVisibleColumns(defaults);
    columnConfig.saveVisibleColumns(defaults);
  }, [columnConfig]);

  const handleShowAllColumns = useCallback(() => {
    const allColumnIds = columnConfig.allColumns.map((column) => column.id);
    setVisibleColumns(allColumnIds);
    columnConfig.saveVisibleColumns(allColumnIds);
  }, [columnConfig]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setColumnFilters({});
    setAdditionalFilters([]);
    setPoType("Both");
    setSortColumn("No");
    setSortDirection("desc");
    setCurrentPage(1);
  }, []);

  const handleAddAdditionalFilter = useCallback((filter: FilterCondition) => {
    setAdditionalFilters((previousFilters) => [...previousFilters, filter]);
    setCurrentPage(1);
  }, []);

  const handleRemoveAdditionalFilter = useCallback((index: number) => {
    setAdditionalFilters((previousFilters) =>
      previousFilters.filter((_, filterIndex) => filterIndex !== index),
    );
    setCurrentPage(1);
  }, []);

  const handleColumnFilter = useCallback(
    (columnId: string, value: string, valueTo?: string) => {
      setColumnFilters((previousFilters) => {
        if (!value && !valueTo) {
          const { [columnId]: _removed, ...rest } = previousFilters;
          return rest;
        }

        return { ...previousFilters, [columnId]: { value, valueTo } };
      });
      setCurrentPage(1);
    },
    [],
  );

  const handlePoTypeChange = useCallback((value: string) => {
    setPoType(value);
    setCurrentPage(1);
  }, []);

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
    additionalFilters,
    visibleColumns,
    allColumns: columnConfig.allColumns,
    defaultColumns: columnConfig.defaultColumns,
    optionalColumns: columnConfig.optionalColumns,
    poType,
    onPageSizeChange: handlePageSizeChange,
    onPageChange: handlePageChange,
    onSort: handleSort,
    onSearch: handleSearch,
    onColumnFilter: handleColumnFilter,
    onColumnToggle: handleColumnToggle,
    onResetColumns: handleResetColumns,
    onAddAdditionalFilter: handleAddAdditionalFilter,
    onRemoveAdditionalFilter: handleRemoveAdditionalFilter,
    onShowAllColumns: handleShowAllColumns,
    onPoTypeChange: handlePoTypeChange,
    onClearFilters: handleClearFilters,
    refetch: fetchOrders,
  };
}
