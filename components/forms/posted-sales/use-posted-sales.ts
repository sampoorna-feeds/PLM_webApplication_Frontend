"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    POSTED_SALES_COLUMNS.filter(c => c.visible).map(c => c.id)
  );
  const [dateFilter, setDateFilter] = useState<{ fromDate: string; toDate: string } | null>(null);
  const [userBranchCodes, setUserBranchCodes] = useState<string[]>([]);

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

  const fetchDocuments = useCallback(async () => {
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

    setIsLoading(true);
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
        
        const responses = await Promise.all(
          searchFields.map(async (field) => {
            const fieldFilter = `contains(${field},'${escaped}')`;
            const combinedFilter = filter ? `(${filter}) and (${fieldFilter})` : fieldFilter;
            const params = { ...baseParams, $filter: combinedFilter, $top: 100 };
            
            try {
              return await getPostedSalesCreditMemos(params);
            } catch (e) {
              console.error(`Search failed for field ${field}:`, e);
              return { value: [] };
            }
          })
        );

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

        const start = (currentPage - 1) * pageSize;
        const paged = merged.slice(start, start + pageSize);
        
        result = {
          value: paged,
          "@odata.count": merged.length
        };
      } else {
        const params = {
          ...baseParams,
          $top: pageSize,
          $skip: (currentPage - 1) * pageSize,
        };
        result = await getPostedSalesCreditMemos(params);
      }

      setDocuments(result.value || []);
      setTotalCount(result["@odata.count"] ?? result.value?.length ?? 0);
    } catch (error) {
      console.error(`Error fetching posted sales credit memo:`, error);
      toastError(error, `Failed to load posted sales credit memo.`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, sortColumn, sortDirection, searchQuery, columnFilters, dateFilter, skipDateFilter, userBranchCodes]);

  useEffect(() => {
    fetchDocuments();
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
  };
}
