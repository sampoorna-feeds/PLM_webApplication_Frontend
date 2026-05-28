"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  getPostedSalesCreditMemos,
  type PostedSalesHeader 
} from "@/lib/api/services/posted-sales.service";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import type { ODataResponse } from "@/lib/api/types";

import { POSTED_SALES_COLUMNS } from "./column-config";

import { useAuth } from "@/lib/contexts/auth-context";
import { getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";

export function usePostedSales(initialFilters?: { skipDateFilter?: boolean }) {
  const { userID } = useAuth();
  const [documents, setDocuments] = useState<PostedSalesHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState(200);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    POSTED_SALES_COLUMNS.filter(c => c.visible).map(c => c.id)
  );
  const [dateFilter, setDateFilter] = useState<{ fromDate: string; toDate: string } | null>(null);
  const [userBranchCodes, setUserBranchCodes] = useState<string[]>([]);

  const isLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const lastRequestId = useRef(0);
  const pageRef = useRef(1);

  useEffect(() => {
    if (!userID) return;
    const fetchBranches = async () => {
      try {
        const branches = await getAllBranchesFromUserSetup(userID);
        setUserBranchCodes(branches.map((b) => b.Code));
      } catch (error) {
        console.error("Error fetching user branches:", error);
      }
    };
    fetchBranches();
  }, [userID]);

  const skipDateFilter = initialFilters?.skipDateFilter;

  const fetchDocuments = useCallback(async (reset = false) => {
    if (!skipDateFilter && !dateFilter) {
      setIsLoading(false);
      return;
    }

    if (userBranchCodes.length === 0) {
      setDocuments([]);
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
      const filterParts: string[] = [];

      // Branch filter
      if (userBranchCodes.length > 0) {
        const branchFilter = userBranchCodes.map(code => `Shortcut_Dimension_2_Code eq '${code}'`).join(" or ");
        filterParts.push(`(${branchFilter})`);
      }

      // Date filter
      if (dateFilter?.fromDate) {
        filterParts.push(`Posting_Date ge ${dateFilter.fromDate}`);
      }
      if (dateFilter?.toDate) {
        filterParts.push(`Posting_Date le ${dateFilter.toDate}`);
      }

      // Column filters
      Object.entries(columnFilters).forEach(([col, filter]) => {
        const column = POSTED_SALES_COLUMNS.find((c) => c.id === col);
        if (!column) return;

        if (column.filterType === "date") {
          if (filter.value) {
            filterParts.push(`${col} ge ${filter.value}`);
          }
          if (filter.valueTo) {
            filterParts.push(`${col} le ${filter.valueTo}`);
          }
        } else if (column.filterType === "number") {
          if (filter.valueTo) {
            if (filter.value) filterParts.push(`${col} ge ${filter.value}`);
            filterParts.push(`${col} le ${filter.valueTo}`);
          } else if (filter.value) {
            const [operator, numValue] = filter.value.includes(":")
              ? filter.value.split(":")
              : ["eq", filter.value];
            switch (operator) {
              case "gt":
                filterParts.push(`${col} gt ${numValue}`);
                break;
              case "lt":
                filterParts.push(`${col} lt ${numValue}`);
                break;
              case "ge":
                filterParts.push(`${col} ge ${numValue}`);
                break;
              case "le":
                filterParts.push(`${col} le ${numValue}`);
                break;
              default:
                filterParts.push(`${col} eq ${numValue}`);
            }
          }
        } else {
          if (filter.value) {
            const escaped = filter.value.replace(/'/g, "''");
            if (escaped.includes(",")) {
              const vals = escaped.split(",").map(v => v.trim()).filter(Boolean);
              if (vals.length > 0) {
                filterParts.push(`(${vals.map(v => `contains(${col},'${v}')`).join(" or ")})`);
              }
            } else {
              filterParts.push(`contains(${col},'${escaped}')`);
            }
          }
        }
      });

      const filter = filterParts.length > 0 ? filterParts.join(" and ") : undefined;
      const baseParams: any = {
        $orderby: sortColumn && sortDirection ? `${sortColumn} ${sortDirection}` : "No desc",
        $filter: filter,
        $count: true,
      };

      let result: ODataResponse<PostedSalesHeader>;

      if (searchQuery) {
        const escaped = searchQuery.replace(/'/g, "''");
        const searchFields = ["No", "Sell_to_Customer_No", "Sell_to_Customer_Name", "Location_Code"];
        
        const limit = Math.max(pageRef.current * pageSize, 200);
        const responses = await Promise.all(
          searchFields.map(async (field) => {
            const fieldFilter = `contains(${field},'${escaped}')`;
            const combinedFilter = filter ? `(${filter}) and (${fieldFilter})` : fieldFilter;
            const params = { ...baseParams, $filter: combinedFilter, $top: limit };
            
            try {
              return await getPostedSalesCreditMemos(params);
            } catch (e) {
              console.error(`Search failed for field ${field}:`, e);
              return { value: [] };
            }
          })
        );

        if (requestId !== lastRequestId.current) return;

        const seen = new Set<string>();
        const merged: PostedSalesHeader[] = [];
        responses.forEach(resp => {
          resp?.value?.forEach(doc => {
            if (!seen.has(doc.No)) {
              seen.add(doc.No);
              merged.push(doc);
            }
          });
        });

        const start = (pageRef.current - 1) * pageSize;
        const paged = merged.slice(start, start + pageSize);
        
        const hasMoreOnServer = responses.some(resp => (resp?.["@odata.count"] ?? 0) > limit);
        const searchTotalCount = hasMoreOnServer ? Math.max(merged.length, limit + 1) : merged.length;

        result = {
          value: paged,
          "@odata.count": searchTotalCount
        };
      } else {
        const params = {
          ...baseParams,
          $top: pageSize,
          $skip: (pageRef.current - 1) * pageSize,
        };
        result = await getPostedSalesCreditMemos(params);
        if (requestId !== lastRequestId.current) return;
      }

      if (pageRef.current === 1) {
        setDocuments(result.value || []);
      } else {
        setDocuments((prev) => [...prev, ...(result.value || [])]);
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
      console.error(`Error fetching posted sales credit memo:`, error);
      toastError(error, `Failed to load posted sales credit memo.`);
      if (pageRef.current === 1) {
        setDocuments([]);
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
  }, [pageSize, sortColumn, sortDirection, searchQuery, columnFilters, dateFilter, skipDateFilter, userBranchCodes]);

  const loadMore = useCallback(() => {
    if (isLoadingRef.current || isLoadingMoreRef.current || !hasMore) return;
    pageRef.current += 1;
    fetchDocuments(false);
  }, [hasMore, fetchDocuments]);

  useEffect(() => {
    fetchDocuments(true);
  }, [fetchDocuments]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleColumnFilter = (columnId: string, value: string, valueTo?: string) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (!value && !valueTo) delete next[columnId];
      else next[columnId] = { value, valueTo };
      return next;
    });
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    documents,
    isLoading,
    pageSize,
    currentPage,
    totalCount,
    totalPages,
    sortColumn,
    sortDirection,
    searchQuery,
    columnFilters,
    visibleColumns,
    dateFilter,
    setDateFilter,
    onPageSizeChange: (size: number) => { setPageSize(size); setCurrentPage(1); },
    onPageChange: setCurrentPage,
    onSort: handleSort,
    onSearch: (q: string) => { setSearchQuery(q); setCurrentPage(1); },
    onColumnFilter: handleColumnFilter,
    onToggleColumn: toggleColumn,
    onClearFilters: () => { setSearchQuery(""); setColumnFilters({}); setCurrentPage(1); },
    refetch: fetchDocuments,
    loadMore,
    hasMore,
    isLoadingMore,
  };
}
