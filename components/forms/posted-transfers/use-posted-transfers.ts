"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { 
  getPostedTransferShipments, 
  getTransferReceipts,
  type PostedTransferShipment,
  type TransferReceipt
} from "@/lib/api/services/transfer-orders.service";
import { type SortDirection } from "./column-config";
export interface PostedTransferFilters {
  fromDate?: string;
  toDate?: string;
  fromLocation?: string;
  toLocation?: string;
}

import { useAuth } from "@/lib/contexts/auth-context";
import { getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";

export interface UsePostedTransfersOptions {
  type: "shipment" | "receipt";
  initialFilters: PostedTransferFilters | null;
}

export function usePostedTransfers({ type, initialFilters }: UsePostedTransfersOptions) {
  const { userID } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState(200);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
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

  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);

  const buildFilterString = useCallback(() => {
    if (!initialFilters) return "";

    const parts = [];
    
    // Branch filter
    if (userBranchCodes.length > 0) {
      const branchFilter = userBranchCodes.map(code => `Shortcut_Dimension_2_Code eq '${code}'`).join(" or ");
      parts.push(`(${branchFilter})`);
    }

    if (initialFilters.fromDate) parts.push(`Posting_Date ge ${initialFilters.fromDate}`);
    if (initialFilters.toDate) parts.push(`Posting_Date le ${initialFilters.toDate}`);
    if (initialFilters.fromLocation) parts.push(`Transfer_from_Code eq '${initialFilters.fromLocation}'`);
    if (initialFilters.toLocation) parts.push(`Transfer_to_Code eq '${initialFilters.toLocation}'`);

    if (searchQuery) {
      const escaped = searchQuery.replace(/'/g, "''");
      parts.push(`(contains(No,'${escaped}') or contains(Transfer_from_Code,'${escaped}') or contains(Transfer_to_Code,'${escaped}'))`);
    }

    Object.entries(columnFilters).forEach(([col, filter]) => {
      if (filter.value) {
        const escaped = filter.value.replace(/'/g, "''");
        if (escaped.includes(",")) {
          const vals = escaped.split(",").map(v => v.trim()).filter(Boolean);
          if (vals.length > 0) {
            parts.push(`(${vals.map(v => `contains(${col},'${v}')`).join(" or ")})`);
          }
        } else {
          parts.push(`contains(${col},'${escaped}')`);
        }
      }
    });

    return parts.join(" and ");
  }, [initialFilters, userBranchCodes, searchQuery, columnFilters]);

  const fetchData = useCallback(async (reset = false) => {
    if (!initialFilters) return;

    if (userBranchCodes.length === 0) {
      setData([]);
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
      const filter = buildFilterString();
      const params = {
        $filter: filter,
        $top: pageSize,
        $skip: (pageRef.current - 1) * pageSize,
        $orderby: sortColumn && sortDirection ? `${sortColumn} ${sortDirection}` : "No desc",
      };

      const result = type === "shipment" 
        ? await getPostedTransferShipments(params)
        : await getTransferReceipts(params);
      
      if (requestId !== lastRequestId.current) return;

      if (pageRef.current === 1) {
        setData(result.orders);
      } else {
        setData(prev => [...prev, ...result.orders]);
      }
      setTotalCount(result.totalCount);
      setHasMore(pageRef.current * pageSize < result.totalCount);
      setCurrentPage(pageRef.current);
    } catch (error) {
      if (requestId !== lastRequestId.current) return;
      console.error(`Error fetching posted transfer ${type}s:`, error);
      toastError(error, `Failed to load posted ${type}s.`);
      if (pageRef.current === 1) {
        setData([]);
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
  }, [type, initialFilters, pageSize, sortColumn, sortDirection, buildFilterString, userBranchCodes]);

  const loadMore = useCallback(() => {
    if (isLoadingRef.current || isLoadingMoreRef.current || !hasMore) return;
    pageRef.current += 1;
    fetchData(false);
  }, [hasMore, fetchData]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : prev === "desc" ? "asc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleColumnFilter = useCallback((columnId: string, value: string, valueTo?: string) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (!value && !valueTo) delete next[columnId];
      else next[columnId] = { value, valueTo };
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setColumnFilters({});
  }, []);

  return {
    data,
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
    onPageSizeChange: handlePageSizeChange,
    onPageChange: handlePageChange,
    onSort: handleSort,
    onSearch: handleSearch,
    onColumnFilter: handleColumnFilter,
    onClearFilters: handleClearFilters,
    refetch: () => fetchData(true),
    loadMore,
  };
}
