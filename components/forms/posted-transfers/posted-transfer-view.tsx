"use client";

import { useState, useEffect, useCallback } from "react";
import { PostedTransferFilterForm, type PostedTransferFilters } from "./posted-transfer-filter-form";
import { PostedTransferTable } from "./posted-transfer-table";
import { TableFilterBar } from "./table-filter-bar";
import { PostedTransferPaginationControls } from "./pagination-controls";
import { Button } from "@/components/ui/button";
import { ChevronLeft, RefreshCcw } from "lucide-react";
import { type SortDirection, loadVisibleColumns, saveVisibleColumns, getDefaultVisibleColumns, POSTED_TRANSFER_COLUMNS } from "./column-config";
import { getPostedTransferShipments, getTransferReceipts, getTransferShipmentReport, getDownloadRecordLink } from "@/lib/api/services/transfer-orders.service";
import { toast } from "sonner";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";

interface PostedTransferViewProps {
  type: "shipment" | "receipt";
}

export function PostedTransferView({ type }: PostedTransferViewProps) {
  const { openTab } = useFormStackContext();
  const [filters, setFilters] = useState<PostedTransferFilters | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeReportDocNo, setActiveReportDocNo] = useState<string | null>(null);
  const [reportPdfUrls, setReportPdfUrls] = useState<Record<string, string>>({});
  
  // New filtering/sorting states
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination states
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Column Visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => 
    typeof window !== "undefined" ? loadVisibleColumns() : getDefaultVisibleColumns()
  );

  const title = type === "shipment" ? "Posted Transfer Shipment" : "Posted Transfer Receipt";
  const description = `Enter details to find posted transfer ${type}s.`;

  const fetchData = useCallback(async (appliedFilters: PostedTransferFilters) => {
    setIsLoading(true);
    try {
      const parts = [];
      if (appliedFilters.fromDate) {
        parts.push(`Posting_Date ge ${appliedFilters.fromDate}`);
      }
      if (appliedFilters.toDate) {
        parts.push(`Posting_Date le ${appliedFilters.toDate}`);
      }
      if (appliedFilters.fromLocation) {
        parts.push(`Transfer_from_Code eq '${appliedFilters.fromLocation}'`);
      }
      if (appliedFilters.toLocation) {
        parts.push(`Transfer_to_Code eq '${appliedFilters.toLocation}'`);
      }
      
      const filter = parts.join(" and ");
      const result = type === "shipment" 
        ? await getPostedTransferShipments({ $filter: filter, $top: 200 })
        : await getTransferReceipts({ $filter: filter, $top: 200 });
      
      setData(result.orders);
    } catch (error) {
      console.error(`Error fetching posted transfer ${type}s:`, error);
      toast.error(`Failed to load posted ${type}s.`);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (filters) {
      fetchData(filters);
      setCurrentPage(1);
    }
    // Cleanup URLs on unmount
    return () => {
      Object.values(reportPdfUrls).forEach(url => window.URL.revokeObjectURL(url));
    };
  }, [filters, fetchData]);

  const base64ToPdfBlob = (base64Value: string) => {
    const normalized = base64Value.replace(/^data:application\/pdf;base64,/, "").replace(/\s/g, "");
    const byteCharacters = atob(normalized);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
  };

  const getReportPdfUrl = async (shipmentNo: string) => {
    if (reportPdfUrls[shipmentNo]) return reportPdfUrls[shipmentNo];

    setActiveReportDocNo(shipmentNo);
    try {
      const base64Data = await getTransferShipmentReport(shipmentNo);
      if (!base64Data) throw new Error("No PDF content returned.");

      const blob = base64ToPdfBlob(base64Data);
      const url = window.URL.createObjectURL(blob);
      setReportPdfUrls(prev => ({ ...prev, [shipmentNo]: url }));
      return url;
    } finally {
      setActiveReportDocNo(null);
    }
  };

  const handlePreviewReport = async (shipmentNo: string) => {
    try {
      const url = await getReportPdfUrl(shipmentNo);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err.message || "Failed to preview report");
    }
  };

  const handleGetRecordLink = async (docNo: string, docType: string, reportName: string) => {
    setActiveReportDocNo(docNo);
    try {
      const url = await getDownloadRecordLink({ documentType: docType, documentNo: docNo });
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast.info(`No URL returned for ${reportName}`);
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to get ${reportName} link`);
    } finally {
      setActiveReportDocNo(null);
    }
  };

  const handlePrintRecord = async (docNo: string, docType: string, reportName: string) => {
    setActiveReportDocNo(docNo);
    try {
      const url = await getDownloadRecordLink({ documentType: docType, documentNo: docNo });
      if (!url) {
        toast.info(`No URL returned for ${reportName}`);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
    } catch (err: any) {
      toast.error(err.message || `Failed to print ${reportName}`);
    } finally {
      setActiveReportDocNo(null);
    }
  };


  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
      if (sortDirection === "desc") setSortColumn(null);
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleColumnFilter = (columnId: string, value: string, valueTo?: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnId]: { value, valueTo }
    }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleColumnToggle = (columnId: string) => {
    setVisibleColumns(prev => {
      const newColumns = prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId];
      saveVisibleColumns(newColumns);
      return newColumns;
    });
  };

  const handleResetColumns = () => {
    const defaults = getDefaultVisibleColumns();
    setVisibleColumns(defaults);
    saveVisibleColumns(defaults);
  };

  const handleShowAllColumns = () => {
    const allColumnIds = POSTED_TRANSFER_COLUMNS.map(c => c.id);
    setVisibleColumns(allColumnIds);
    saveVisibleColumns(allColumnIds);
  };

  const getFilteredAndSortedData = () => {
    let result = [...data];

    // Global Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.No?.toLowerCase() || "").includes(q) ||
        (item.Transfer_from_Code?.toLowerCase() || "").includes(q) ||
        (item.Transfer_to_Code?.toLowerCase() || "").includes(q) ||
        (item.Vehicle_No?.toLowerCase() || "").includes(q) ||
        (item.E_Way_Bill_No?.toLowerCase() || "").includes(q) ||
        (item.E_Invoice_No?.toLowerCase() || "").includes(q)
      );
    }
    // No more manual reset of currentPage here to avoid recursion, 
    // it's handled in handleSearch/handleColumnFilter

    // Column Filters
    Object.entries(columnFilters).forEach(([colId, filter]) => {
      const { value, valueTo } = filter;
      if (!value && !valueTo) return;

      if (colId === "Posting_Date") {
         if (value) {
           result = result.filter(item => item.Posting_Date && item.Posting_Date >= value);
         }
         if (valueTo) {
           result = result.filter(item => item.Posting_Date && item.Posting_Date <= valueTo);
         }
      } else {
        const val = value.toLowerCase();
        result = result.filter(item => (item[colId]?.toLowerCase() || "").includes(val));
      }
    });

    // Sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        const valA = a[sortColumn] || "";
        const valB = b[sortColumn] || "";
        
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  };

  const filteredData = getFilteredAndSortedData();
  const hasActiveFilters = searchQuery !== "" || Object.values(columnFilters).some(f => f.value || f.valueTo);

  // Pagination calculations
  const totalCount = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasNextPage = currentPage < totalPages;
  const pagedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  if (!filters) {
    return (
      <PostedTransferFilterForm
        onApply={(f) => setFilters(f)}
        title={title}
        description={description}
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-2">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold">{title} Data</h1>
          <p className="text-muted-foreground text-xs">
            Range: {filters.fromDate} to {filters.toDate}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(filters)} disabled={isLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setFilters(null); setData([]); }}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            New Search
          </Button>
        </div>
      </div>
      
      <TableFilterBar 
        searchQuery={searchQuery}
        onSearch={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        onClearFilters={() => {
          setSearchQuery("");
          setColumnFilters({});
          setCurrentPage(1);
        }}
        hasActiveFilters={hasActiveFilters}
        visibleColumns={visibleColumns}
        onColumnToggle={handleColumnToggle}
        onResetColumns={handleResetColumns}
        onShowAllColumns={handleShowAllColumns}
      />
      
      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-2">
        <PostedTransferTable 
          data={pagedData} 
          isLoading={isLoading} 
          visibleColumns={visibleColumns}
          onViewReport={type === "shipment" ? handlePreviewReport : undefined}
          activeReportId={activeReportDocNo}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          columnFilters={columnFilters}
          onColumnFilter={handleColumnFilter}
           onRowClick={(id) => {
              openTab(`posted-transfer-${type}-detail`, {
                title: `${type === "shipment" ? "Shipment" : "Receipt"} ${id}`,
                context: { no: id, type }
              });
           }}
           onDownloadRecord={handleGetRecordLink}
           onPrintRecord={handlePrintRecord}
        />
      </div>

      <PostedTransferPaginationControls
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        onPageSizeChange={handlePageSizeChange}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
