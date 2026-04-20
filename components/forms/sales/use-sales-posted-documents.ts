"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  getAllBranchesFromUserSetup,
  getLOBsFromUserSetup,
  getAllLOCsFromUserSetup,
} from "@/lib/api/services/dimension.service";
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
  lobCodes: string[],
  branchCodes: string[],
  locCodes: string[],
  columnFilters: Record<string, { value: string; valueTo?: string }>,
  allColumnIds: string[],
  additionalFilters: FilterCondition[],
): string | undefined {
  const parts: string[] = [];

  // LOB filter (Shortcut_Dimension_1_Code)
  if (lobCodes.length > 0) {
    if (lobCodes.length === 1) {
      parts.push(`Shortcut_Dimension_1_Code eq '${escapeOData(lobCodes[0])}'`);
    } else {
      const group = lobCodes
        .map((c) => `Shortcut_Dimension_1_Code eq '${escapeOData(c)}'`)
        .join(" or ");
      parts.push(`(${group})`);
    }
  }

  // Branch filter (Shortcut_Dimension_2_Code)
  if (branchCodes.length > 0) {
    const list = branchCodes
      .map((c) => `'${escapeOData(c.trim())}'`)
      .filter(Boolean)
      .join(",");
    if (list) parts.push(`Shortcut_Dimension_2_Code in (${list})`);
  }

  // LOC filter (Location_Code)
  if (locCodes.length > 0) {
    if (locCodes.length === 1) {
      parts.push(`Location_Code eq '${escapeOData(locCodes[0])}'`);
    } else {
      const group = locCodes
        .map((c) => `Location_Code eq '${escapeOData(c)}'`)
        .join(" or ");
      parts.push(`(${group})`);
    }
  }

  Object.entries(columnFilters).forEach(([id, f]) => {
    // Skip dimension/location columns handled above
    if (
      id === "Shortcut_Dimension_1_Code" ||
      id === "Shortcut_Dimension_2_Code" ||
      id === "Location_Code"
    )
      return;
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
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isSetupLoaded, setIsSetupLoaded] = useState(false);
  const [userLobCodes, setUserLobCodes] = useState<string[]>([]);
  const [userBranchCodes, setUserBranchCodes] = useState<string[]>([]);
  const [userLocCodes, setUserLocCodes] = useState<string[]>([]);
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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize],
  );

  useEffect(() => {
    if (!userID) return;
    const fetchSetup = async () => {
      try {
        const [lobData, branchData, locData] = await Promise.all([
          getLOBsFromUserSetup(userID),
          getAllBranchesFromUserSetup(userID),
          getAllLOCsFromUserSetup(userID),
        ]);
        const lCodes = lobData.map((l) => l.Code);
        const bCodes = branchData.map((b) => b.Code);
        const locCodes = locData.map((l) => l.Code);
        setUserLobCodes(lCodes);
        setUserBranchCodes(bCodes);
        setUserLocCodes(locCodes);
        setColumnFilters((prev) => {
          const merged = { ...prev };
          if (lCodes.length > 0 && prev.Shortcut_Dimension_1_Code === undefined)
            merged.Shortcut_Dimension_1_Code = { value: lCodes.join(",") };
          if (bCodes.length > 0 && prev.Shortcut_Dimension_2_Code === undefined)
            merged.Shortcut_Dimension_2_Code = { value: bCodes.join(",") };
          if (locCodes.length > 0 && prev.Location_Code === undefined)
            merged.Location_Code = { value: locCodes.join(",") };
          return merged;
        });
      } catch {
        setUserBranchCodes([]);
      } finally {
        setIsSetupLoaded(true);
      }
    };
    fetchSetup();
  }, [userID]);

  const fetchOrders = useCallback(async () => {
    if (!isSetupLoaded) return;

    const lobFilterValue = columnFilters["Shortcut_Dimension_1_Code"]?.value;
    const effectiveLobs = lobFilterValue
      ? lobFilterValue.split(",").map((c) => c.trim()).filter(Boolean)
      : userLobCodes;

    const branchFilterValue = columnFilters["Shortcut_Dimension_2_Code"]?.value;
    const effectiveBranches = branchFilterValue
      ? branchFilterValue.split(",").map((c) => c.trim()).filter(Boolean)
      : userBranchCodes;

    const locFilterValue = columnFilters["Location_Code"]?.value;
    const effectiveLocs = locFilterValue
      ? locFilterValue.split(",").map((c) => c.trim()).filter(Boolean)
      : userLocCodes;

    if (effectiveBranches.length === 0) {
      setOrders([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const allIds = columnConfig.allColumns.map((c) => c.id);
      const filter = buildFilterString(
        effectiveLobs,
        effectiveBranches,
        effectiveLocs,
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
        $skip: (currentPage - 1) * pageSize,
        searchTerm: searchQuery || undefined,
      };

      const result =
        documentType === "posted-shipment"
          ? await searchPostedShipments(params)
          : await searchPostedInvoices(params);

      setOrders(result.orders as unknown as Record<string, unknown>[]);
      setTotalCount(result.totalCount);
    } catch {
      toast.error("Failed to load documents. Please try again.");
      setOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    additionalFilters,
    columnConfig,
    columnFilters,
    currentPage,
    documentType,
    isSetupLoaded,
    pageSize,
    searchQuery,
    sortColumn,
    sortDirection,
    userBranchCodes,
    userLobCodes,
    userLocCodes,
    visibleColumns,
  ]);

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
    setSortColumn((prev) => {
      if (prev === column) {
        setSortDirection((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
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

  const handleColumnFilter = useCallback(
    (columnId: string, value: string, valueTo?: string) => {
      setColumnFilters((prev) => {
        if (!value && !valueTo) {
          const { [columnId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [columnId]: { value, valueTo } };
      });
      setCurrentPage(1);
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
    setCurrentPage(1);
  }, []);

  const handleRemoveAdditionalFilter = useCallback((index: number) => {
    setAdditionalFilters((prev) => prev.filter((_, i) => i !== index));
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setColumnFilters({});
    setAdditionalFilters([]);
    setSortColumn("Posting_Date");
    setSortDirection("desc");
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
    refetch: fetchOrders,
  };
}
