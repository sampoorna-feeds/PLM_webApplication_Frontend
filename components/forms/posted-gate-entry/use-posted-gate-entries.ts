"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  getPostedInwardGateEntries, 
  getPostedOutwardGateEntries,
  type PostedGateEntryHeader 
} from "@/lib/api/services/posted-gate-entry.service";
import { type SortDirection, POSTED_GATE_ENTRY_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from "./column-config";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";

export function usePostedGateEntries(type: "inward" | "outward", initialFilters?: { skipDateFilter?: boolean }) {
  const [entries, setEntries] = useState<PostedGateEntryHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState(200);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});
  const [dateFilter, setDateFilter] = useState<{ fromDate: string; toDate: string } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);

  const isLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const lastRequestId = useRef(0);
  const pageRef = useRef(1);

  const skipDateFilter = initialFilters?.skipDateFilter;

  const fetchEntries = useCallback(async (reset = false) => {
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
      if (dateFilter?.fromDate) {
        filterParts.push(`Posting_Date ge ${dateFilter.fromDate}`);
      }
      if (dateFilter?.toDate) {
        filterParts.push(`Posting_Date le ${dateFilter.toDate}`);
      }

      // Global search
      if (searchQuery) {
        const escaped = searchQuery.replace(/'/g, "''");
        filterParts.push(
          `(contains(No,'${escaped}') or contains(Vehicle_No,'${escaped}') or contains(Transporter_Name,'${escaped}') or contains(Description,'${escaped}'))`
        );
      }

      // Column filters
      Object.entries(columnFilters).forEach(([colId, filter]) => {
        const column = POSTED_GATE_ENTRY_COLUMNS.find((c) => c.id === colId);
        if (!column) return;

        if (column.type === "date") {
          if (filter.value) {
            filterParts.push(`${colId} ge ${filter.value}`);
          }
          if (filter.valueTo) {
            filterParts.push(`${colId} le ${filter.valueTo}`);
          }
        } else if (column.type === "number") {
          if (filter.valueTo) {
            if (filter.value) filterParts.push(`${colId} ge ${filter.value}`);
            filterParts.push(`${colId} le ${filter.valueTo}`);
          } else if (filter.value) {
            const [operator, numValue] = filter.value.includes(":")
              ? filter.value.split(":")
              : ["eq", filter.value];
            switch (operator) {
              case "gt":
                filterParts.push(`${colId} gt ${numValue}`);
                break;
              case "lt":
                filterParts.push(`${colId} lt ${numValue}`);
                break;
              case "ge":
                filterParts.push(`${colId} ge ${numValue}`);
                break;
              case "le":
                filterParts.push(`${colId} le ${numValue}`);
                break;
              default:
                filterParts.push(`${colId} eq ${numValue}`);
            }
          }
        } else {
          if (filter.value) {
            const escaped = filter.value.replace(/'/g, "''");
            filterParts.push(`contains(${colId},'${escaped}')`);
          }
        }
      });

      const filter = filterParts.length > 0 ? filterParts.join(" and ") : undefined;

      const params: any = {
        $top: pageSize,
        $skip: (pageRef.current - 1) * pageSize,
        $orderby: sortColumn && sortDirection ? `${sortColumn} ${sortDirection}` : "No desc",
        $filter: filter,
        $count: true,
      };

      const result = type === "inward" 
        ? await getPostedInwardGateEntries(params)
        : await getPostedOutwardGateEntries(params);

      if (requestId !== lastRequestId.current) return;

      if (pageRef.current === 1) {
        setEntries(result.value || []);
      } else {
        setEntries((prev) => [...prev, ...(result.value || [])]);
      }
      setTotalCount(result["@odata.count"] ?? result.value?.length ?? 0);
      const count = result["@odata.count"];
      const hasMoreData = count && count > 0
        ? pageRef.current * pageSize < count
        : ((result.value?.length || 0) === pageSize);
      setHasMore(hasMoreData);
      setCurrentPage(pageRef.current);
    } catch (error) {
      if (requestId !== lastRequestId.current) return;
      console.error(`Error fetching posted ${type} gate entries:`, error);
      toastError(error, `Failed to load posted ${type} gate entries.`);
      if (pageRef.current === 1) {
        setEntries([]);
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
  }, [type, pageSize, sortColumn, sortDirection, searchQuery, columnFilters, dateFilter, skipDateFilter]);

  const loadMore = useCallback(() => {
    if (isLoadingRef.current || isLoadingMoreRef.current || !hasMore) return;
    pageRef.current += 1;
    fetchEntries(false);
  }, [hasMore, fetchEntries]);

  useEffect(() => {
    fetchEntries(true);
  }, [fetchEntries]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleColumnFilter = (columnId: string, value: string, valueTo?: string) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (!value && !valueTo) delete next[columnId];
      else next[columnId] = { value, valueTo };
      return next;
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setColumnFilters({});
  };

  const handleColumnToggle = (columnId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleResetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  };

  const handleShowAllColumns = () => {
    setVisibleColumns(POSTED_GATE_ENTRY_COLUMNS.map((col) => col.id));
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    entries,
    isLoading,
    isLoadingMore,
    hasMore,
    pageSize,
    currentPage,
    totalCount,
    totalPages,
    sortColumn,
    sortDirection,
    searchQuery,
    columnFilters,
    dateFilter,
    setDateFilter,
    visibleColumns,
    onPageSizeChange: (size: number) => { setPageSize(size); },
    onPageChange: setCurrentPage,
    onSort: handleSort,
    onSearch: (q: string) => { setSearchQuery(q); },
    onColumnFilter: handleColumnFilter,
    onColumnToggle: handleColumnToggle,
    onResetColumns: handleResetColumns,
    onShowAllColumns: handleShowAllColumns,
    onClearFilters: handleClearFilters,
    refetch: () => fetchEntries(true),
    loadMore,
  };
}
