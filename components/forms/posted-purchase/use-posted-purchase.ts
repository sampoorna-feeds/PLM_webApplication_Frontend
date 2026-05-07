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
import type { ODataResponse } from "@/lib/api/types";

import { POSTED_PURCHASE_COLUMNS } from "./column-config";

export type PostedPurchaseType = "receipt" | "invoice" | "return-shipment" | "credit-memo";

export function usePostedPurchase(type: PostedPurchaseType, initialFilters?: { skipDateFilter?: boolean }) {
  const [documents, setDocuments] = useState<PostedPurchaseHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    POSTED_PURCHASE_COLUMNS.filter(c => c.visible).map(c => c.id)
  );
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

      // Column filters
      Object.entries(columnFilters).forEach(([col, filter]) => {
        if (filter.value) {
          const escaped = filter.value.replace(/'/g, "''");
          
          // Dynamic column mapping for Vendor No
          let targetCol = col;
          if (col === "Buy_from_Vendor_No" && (type === "invoice" || type === "credit-memo")) {
            targetCol = "Pay_to_Vendor_No";
          }

          // Handle comma separated values as OR within the same field
          if (escaped.includes(",")) {
            const vals = escaped.split(",").map(v => v.trim()).filter(Boolean);
            if (vals.length > 0) {
              filterParts.push(`(${vals.map(v => `contains(${targetCol},'${v}')`).join(" or ")})`);
            }
          } else {
            filterParts.push(`contains(${targetCol},'${escaped}')`);
          }
        }
      });

      const filter = filterParts.length > 0 ? filterParts.join(" and ") : undefined;
      const baseParams: any = {
        $orderby: sortColumn && sortDirection ? `${sortColumn} ${sortDirection}` : "No desc",
        $filter: filter,
        $count: true,
      };

      let result: ODataResponse<PostedPurchaseHeader>;

      if (searchQuery) {
        const escaped = searchQuery.replace(/'/g, "''");
        
        // Dynamic search fields based on document type
        const vendorNoField = (type === "invoice" || type === "credit-memo") ? "Pay_to_Vendor_No" : "Buy_from_Vendor_No";
        const searchFields = ["No", vendorNoField, "Buy_from_Vendor_Name", "Location_Code"];
        
        // Perform parallel requests for each searchable field to bypass OR operator limitation
        const responses = await Promise.all(
          searchFields.map(async (field) => {
            const fieldFilter = `contains(${field},'${escaped}')`;
            const combinedFilter = filter ? `(${filter}) and (${fieldFilter})` : fieldFilter;
            const params = { ...baseParams, $filter: combinedFilter, $top: 100 }; // Fetch a decent pool
            
            try {
              switch (type) {
                case "receipt": return await getPostedPurchaseReceipts(params);
                case "invoice": return await getPostedPurchaseInvoices(params);
                case "return-shipment": return await getPostedPurchaseReturnShipments(params);
                case "credit-memo": return await getPostedPurchaseCreditMemos(params);
              }
            } catch (e) {
              console.error(`Search failed for field ${field}:`, e);
              return { value: [] };
            }
          })
        );

        // Merge and deduplicate results
        const seen = new Set<string>();
        const merged: PostedPurchaseHeader[] = [];
        responses.forEach(resp => {
          resp?.value?.forEach(doc => {
            if (!seen.has(doc.No)) {
              seen.add(doc.No);
              // Normalize vendor data for consistent display
              const normalizedDoc = { ...doc };
              if (!normalizedDoc.Buy_from_Vendor_No && normalizedDoc.Pay_to_Vendor_No) {
                normalizedDoc.Buy_from_Vendor_No = normalizedDoc.Pay_to_Vendor_No;
              }
              merged.push(normalizedDoc);
            }
          });
        });

        // Manual pagination on merged results
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

        switch (type) {
          case "receipt": result = await getPostedPurchaseReceipts(params); break;
          case "invoice": result = await getPostedPurchaseInvoices(params); break;
          case "return-shipment": result = await getPostedPurchaseReturnShipments(params); break;
          case "credit-memo": result = await getPostedPurchaseCreditMemos(params); break;
        }
        
        // Normalize vendor data in non-search results too
        if (result.value) {
          result.value = result.value.map(doc => {
            if (!doc.Buy_from_Vendor_No && doc.Pay_to_Vendor_No) {
              return { ...doc, Buy_from_Vendor_No: doc.Pay_to_Vendor_No };
            }
            return doc;
          });
        }
      }

      setDocuments(result.value || []);
      setTotalCount(result["@odata.count"] ?? result.value?.length ?? 0);
    } catch (error) {
      console.error(`Error fetching posted purchase ${type}:`, error);
      toast.error(`Failed to load posted purchase ${type}.`);
    } finally {
      setIsLoading(false);
    }
  }, [type, currentPage, pageSize, sortColumn, sortDirection, searchQuery, columnFilters, dateFilter, skipDateFilter]);

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
