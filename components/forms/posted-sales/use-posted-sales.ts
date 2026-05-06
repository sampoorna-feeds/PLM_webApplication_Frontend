"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  getPostedSalesCreditMemos,
  type PostedSalesHeader 
} from "@/lib/api/services/posted-sales.service";
import { toast } from "sonner";

export function usePostedSales(initialFilters?: { skipDateFilter?: boolean }) {
  const [documents, setDocuments] = useState<PostedSalesHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<{ fromDate: string; toDate: string } | null>(null);

  const skipDateFilter = initialFilters?.skipDateFilter;

  const fetchDocuments = useCallback(async () => {
    if (!skipDateFilter && !dateFilter) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const filterParts: string[] = [];

      // Date filter
      if (dateFilter?.fromDate) {
        filterParts.push(`Posting_Date ge ${dateFilter.fromDate}`);
      }
      if (dateFilter?.toDate) {
        filterParts.push(`Posting_Date le ${dateFilter.toDate}`);
      }

      if (searchQuery) {
        const escaped = searchQuery.replace(/'/g, "''");
        filterParts.push(
          `(contains(No,'${escaped}') or contains(Sell_to_Customer_No,'${escaped}') or contains(Sell_to_Customer_Name,'${escaped}'))`
        );
      }

      const filter = filterParts.length > 0 ? filterParts.join(" and ") : undefined;

      const params: any = {
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
        $orderby: sortColumn && sortDirection ? `${sortColumn} ${sortDirection}` : "No desc",
        $filter: filter,
        $count: true,
      };

      const result = await getPostedSalesCreditMemos(params);

      setDocuments(result.value || []);
      setTotalCount(result["@odata.count"] ?? result.value?.length ?? 0);
    } catch (error) {
      console.error(`Error fetching posted sales credit memo:`, error);
      toast.error(`Failed to load posted sales credit memo.`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, sortColumn, sortDirection, searchQuery, dateFilter, skipDateFilter]);

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
    dateFilter,
    setDateFilter,
    onPageSizeChange: (size: number) => { setPageSize(size); setCurrentPage(1); },
    onPageChange: setCurrentPage,
    onSort: handleSort,
    onSearch: (q: string) => { setSearchQuery(q); setCurrentPage(1); },
    onClearFilters: () => { setSearchQuery(""); setCurrentPage(1); },
    refetch: fetchDocuments,
  };
}
