"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  getPostedPurchaseReceipts,
  getPostedPurchaseInvoices,
  getPostedPurchaseReturnShipments,
  getPostedPurchaseCreditMemos,
  type PostedPurchaseHeader 
} from "@/lib/api/services/posted-purchase.service";
import { toast } from "sonner";

export type PostedPurchaseType = "receipt" | "invoice" | "return-shipment" | "credit-memo";

export function usePostedPurchase(type: PostedPurchaseType) {
  const [documents, setDocuments] = useState<PostedPurchaseHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const filterParts: string[] = [];

      if (searchQuery) {
        const escaped = searchQuery.replace(/'/g, "''");
        filterParts.push(
          `(contains(No,'${escaped}') or contains(Buy_from_Vendor_No,'${escaped}') or contains(Buy_from_Vendor_Name,'${escaped}'))`
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

      let result;
      switch (type) {
        case "receipt": result = await getPostedPurchaseReceipts(params); break;
        case "invoice": result = await getPostedPurchaseInvoices(params); break;
        case "return-shipment": result = await getPostedPurchaseReturnShipments(params); break;
        case "credit-memo": result = await getPostedPurchaseCreditMemos(params); break;
      }

      setDocuments(result.value || []);
      setTotalCount(result["@odata.count"] ?? result.value?.length ?? 0);
    } catch (error) {
      console.error(`Error fetching posted purchase ${type}:`, error);
      toast.error(`Failed to load posted purchase ${type}.`);
    } finally {
      setIsLoading(false);
    }
  }, [type, currentPage, pageSize, sortColumn, sortDirection, searchQuery]);

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
    onPageSizeChange: (size: number) => { setPageSize(size); setCurrentPage(1); },
    onPageChange: setCurrentPage,
    onSort: handleSort,
    onSearch: (q: string) => { setSearchQuery(q); setCurrentPage(1); },
    onClearFilters: () => { setSearchQuery(""); setCurrentPage(1); },
    refetch: fetchDocuments,
  };
}
