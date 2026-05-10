"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  getPostedInwardGateEntries, 
  getPostedOutwardGateEntries,
  type PostedGateEntryHeader 
} from "@/lib/api/services/posted-gate-entry.service";
import { type SortDirection, POSTED_GATE_ENTRY_COLUMNS } from "./column-config";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/auth-context";
import { getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";
import { toastError } from "@/lib/errors";

export function usePostedGateEntries(type: "inward" | "outward", initialFilters?: { skipDateFilter?: boolean }) {
  const { userID } = useAuth();
  const [entries, setEntries] = useState<PostedGateEntryHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});
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

  const fetchEntries = useCallback(async () => {
    if (!skipDateFilter && !dateFilter) {
      setIsLoading(false);
      return;
    }

    if (userBranchCodes.length === 0) {
      setEntries([]);
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

      // Global search
      if (searchQuery) {
        const escaped = searchQuery.replace(/'/g, "''");
        filterParts.push(
          `(contains(No,'${escaped}') or contains(Vehicle_No,'${escaped}') or contains(Transporter_Name,'${escaped}') or contains(Description,'${escaped}'))`
        );
      }

      // Column filters (simplified)
      Object.entries(columnFilters).forEach(([col, filter]) => {
        if (filter.value) {
          const escaped = filter.value.replace(/'/g, "''");
          filterParts.push(`contains(${col},'${escaped}')`);
        }
      });

      const filter = filterParts.length > 0 ? filterParts.join(" and ") : undefined;

      const params: any = {
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
        $orderby: sortColumn && sortDirection ? `${sortColumn} ${sortDirection}` : "No desc",
        $filter: filter,
        $count: true,
      };

      const result = type === "inward" 
        ? await getPostedInwardGateEntries(params)
        : await getPostedOutwardGateEntries(params);

      setEntries(result.value || []);
      setTotalCount(result["@odata.count"] ?? result.value?.length ?? 0);
    } catch (error) {
      console.error(`Error fetching posted ${type} gate entries:`, error);
      toastError(error, `Failed to load posted ${type} gate entries.`);
    } finally {
      setIsLoading(false);
    }
  }, [type, currentPage, pageSize, sortColumn, sortDirection, searchQuery, columnFilters, dateFilter, skipDateFilter, userBranchCodes]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
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

  const handleClearFilters = () => {
    setSearchQuery("");
    setColumnFilters({});
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    entries,
    isLoading,
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
    onPageSizeChange: (size: number) => { setPageSize(size); setCurrentPage(1); },
    onPageChange: setCurrentPage,
    onSort: handleSort,
    onSearch: (q: string) => { setSearchQuery(q); setCurrentPage(1); },
    onColumnFilter: handleColumnFilter,
    onClearFilters: handleClearFilters,
    refetch: fetchEntries,
  };
}
