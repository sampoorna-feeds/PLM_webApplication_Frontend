"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { useAuth } from "@/lib/contexts/auth-context";
import { getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";
import {
  getPostedShipmentsWithCount,
  searchPostedShipments,
} from "@/lib/api/services/sales-posted-shipments.service";
import {
  getPostedInvoicesWithCount,
  searchPostedInvoices,
} from "@/lib/api/services/sales-posted-invoices.service";
import {
  type SalesPostedDocumentType,
  getPostedDocumentColumnConfig,
} from "./sales-posted-document-config";
import type { SortDirection } from "./column-config";
import type { FilterCondition } from "./types";

function escapeOData(v: string) {
  return v.replace(/'/g, "''");
}

function buildFilterString(
  branchCodes: string[],
  columnFilters: Record<string, { value: string; valueTo?: string }>,
  allColumnIds: string[],
  additionalFilters: FilterCondition[],
): string | undefined {
  const parts: string[] = [];

  // Branch filter — always applied from user setup, not from column filters
  if (branchCodes.length > 0) {
    const branchParts = branchCodes
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => `Shortcut_Dimension_2_Code eq '${escapeOData(c)}'`);
    if (branchParts.length > 0) parts.push(`(${branchParts.join(" or ")})`);
  }

  Object.entries(columnFilters).forEach(([id, f]) => {
    // Skip branch — handled above by the fixed user-setup filter
    if (id === "Shortcut_Dimension_2_Code") return;
    if (!allColumnIds.includes(id)) return;
    const { value, valueTo } = f;
    if (!value && !valueTo) return;

    if (id.includes("_Date") || id === "Posting_Date" || id === "Document_Date") {
      if (value) parts.push(`${id} ge ${value}`);
      if (valueTo) parts.push(`${id} le ${valueTo}`);
    } else if (
      id === "Amount_Including_VAT" ||
      id === "Amount" ||
      id === "Remaining_Amount"
    ) {
      if (valueTo) {
        if (value) parts.push(`${id} ge ${value}`);
        parts.push(`${id} le ${valueTo}`);
      } else if (value) {
        parts.push(`${id} eq ${value}`);
      }
    } else {
      const escaped = escapeOData(value);
      const orParts = escaped
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => `contains(${id},'${v}')`);
      if (orParts.length === 1) parts.push(orParts[0]);
      else if (orParts.length > 1) parts.push(`(${orParts.join(" or ")})`);
    }
  });

  additionalFilters.forEach((f) => {
    const escaped = escapeOData(f.value);
    switch (f.operator) {
      case "contains":
        parts.push(`contains(${f.field},'${escaped}')`);
        break;
      case "startswith":
        parts.push(`startswith(${f.field},'${escaped}')`);
        break;
      case "endswith":
        parts.push(`endswith(${f.field},'${escaped}')`);
        break;
      case "eq":
      case "ne":
      case "gt":
      case "ge":
      case "lt":
      case "le":
        if (f.type === "number" || f.type === "date") {
          parts.push(`${f.field} ${f.operator} ${f.value}`);
        } else {
          parts.push(`${f.field} ${f.operator} '${escaped}'`);
        }
        break;
    }
  });

  return parts.length > 0 ? parts.join(" and ") : undefined;
}

export function useSalesPostedDocuments(documentType: SalesPostedDocumentType) {
  const { userID } = useAuth();
  const columnConfig = useMemo(
    () => getPostedDocumentColumnConfig(documentType),
    [documentType],
  );

  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState(200);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isSetupLoaded, setIsSetupLoaded] = useState(false);
  const [userBranchCodes, setUserBranchCodes] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>("Posting_Date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { value: string; valueTo?: string }>
  >({});
  const [additionalFilters, setAdditionalFilters] = useState<FilterCondition[]>([]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    typeof window !== "undefined"
      ? columnConfig.loadVisibleColumns()
      : columnConfig.getDefaultVisibleColumns(),
  );

  const isLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const lastRequestId = useRef(0);
  const pageRef = useRef(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize],
  );

  useEffect(() => {
    if (!userID) return;
    const fetchSetup = async () => {
      try {
        const branches = await getAllBranchesFromUserSetup(userID);
        setUserBranchCodes(branches.map((b) => b.Code));
      } catch {
        setUserBranchCodes([]);
      } finally {
        setIsSetupLoaded(true);
      }
    };
    fetchSetup();
  }, [userID]);

  const fetchOrders = useCallback(async (reset = false) => {
    if (!isSetupLoaded) return;

    if (userBranchCodes.length === 0) {
      setOrders([]);
      setTotalCount(0);
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
      const allIds = columnConfig.allColumns.map((c) => c.id);
      const filter = buildFilterString(
        userBranchCodes,
        columnFilters,
        allIds,
        additionalFilters,
      );
      const orderby =
        sortColumn && sortDirection
          ? `${sortColumn} ${sortDirection}`
          : "Posting_Date desc";
      const $select = columnConfig.buildSelectQuery(visibleColumns);
      const params = {
        $select,
        $filter: filter,
        $orderby: orderby,
        $top: pageSize,
        $skip: (pageRef.current - 1) * pageSize,
        searchTerm: searchQuery || undefined,
      };

      const result =
        documentType === "posted-shipment"
          ? await searchPostedShipments(params)
          : await searchPostedInvoices(params);

      if (requestId !== lastRequestId.current) return;

      if (pageRef.current === 1) {
        setOrders(result.orders as unknown as Record<string, unknown>[]);
      } else {
        setOrders(prev => [...prev, ...(result.orders as unknown as Record<string, unknown>[])]);
      }
      setTotalCount(result.totalCount);
      setHasMore(pageRef.current * pageSize < result.totalCount);
      setCurrentPage(pageRef.current);
    } catch (error) {
      if (requestId !== lastRequestId.current) return;
      toastError(error, "Failed to load documents. Please try again.");
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
    additionalFilters,
    columnConfig,
    columnFilters,
    documentType,
    isSetupLoaded,
    pageSize,
    searchQuery,
    sortColumn,
    sortDirection,
    userBranchCodes,
    visibleColumns,
  ]);

  const loadMore = useCallback(() => {
    if (isLoadingRef.current || isLoadingMoreRef.current || !hasMore) return;
    pageRef.current += 1;
    fetchOrders(false);
  }, [hasMore, fetchOrders]);

  useEffect(() => {
    fetchOrders(true);
  }, [fetchOrders, sortColumn, sortDirection, searchQuery, columnFilters, additionalFilters, visibleColumns, pageSize]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSort = useCallback((column: string) => {
    setSortColumn((prev) => {
      if (prev === column) {
        setSortDirection((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
        return column;
      }
      setSortDirection("asc");
      return column;
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleColumnFilter = useCallback(
    (columnId: string, value: string, valueTo?: string) => {
      setColumnFilters((prev) => {
        if (!value && !valueTo) {
          const { [columnId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [columnId]: { value, valueTo } };
      });
    },
    [],
  );

  const handleColumnToggle = useCallback(
    (columnId: string) => {
      setVisibleColumns((prev) => {
        const next = prev.includes(columnId)
          ? prev.filter((id) => id !== columnId)
          : [...prev, columnId];
        columnConfig.saveVisibleColumns(next);
        return next;
      });
    },
    [columnConfig],
  );

  const handleResetColumns = useCallback(() => {
    const defaults = columnConfig.getDefaultVisibleColumns();
    setVisibleColumns(defaults);
    columnConfig.saveVisibleColumns(defaults);
  }, [columnConfig]);

  const handleShowAllColumns = useCallback(() => {
    const all = columnConfig.allColumns.map((c) => c.id);
    setVisibleColumns(all);
    columnConfig.saveVisibleColumns(all);
  }, [columnConfig]);

  const handleAddAdditionalFilter = useCallback((filter: FilterCondition) => {
    setAdditionalFilters((prev) => [...prev, filter]);
  }, []);

  const handleRemoveAdditionalFilter = useCallback((index: number) => {
    setAdditionalFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setColumnFilters({});
    setAdditionalFilters([]);
    setSortColumn("Posting_Date");
    setSortDirection("desc");
  }, []);

  return {
    orders,
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
    additionalFilters,
    visibleColumns,
    allColumns: columnConfig.allColumns,
    defaultColumns: columnConfig.defaultColumns,
    optionalColumns: columnConfig.optionalColumns,
    onPageSizeChange: handlePageSizeChange,
    onPageChange: handlePageChange,
    onSort: handleSort,
    onSearch: handleSearch,
    onColumnFilter: handleColumnFilter,
    onColumnToggle: handleColumnToggle,
    onResetColumns: handleResetColumns,
    onShowAllColumns: handleShowAllColumns,
    onAddAdditionalFilter: handleAddAdditionalFilter,
    onRemoveAdditionalFilter: handleRemoveAdditionalFilter,
    onClearFilters: handleClearFilters,
    refetch: () => fetchOrders(true),
    loadMore,
  };
}
