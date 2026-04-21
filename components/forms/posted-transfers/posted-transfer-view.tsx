"use client";

import { useState, useEffect, useCallback } from "react";
import { PostedTransferFilterForm, type PostedTransferFilters } from "./posted-transfer-filter-form";
import { PostedTransferTable } from "./posted-transfer-table";
import { TableFilterBar } from "./table-filter-bar";
import { PostedTransferPaginationControls } from "./pagination-controls";
import { Button } from "@/components/ui/button";
import { ChevronLeft, RefreshCcw } from "lucide-react";
import { type SortDirection, loadVisibleColumns, saveVisibleColumns, getDefaultVisibleColumns, POSTED_TRANSFER_COLUMNS } from "./column-config";
import { getPostedTransferShipments, getTransferReceipts, getTransferShipmentReport, getDownloadRecordLink, searchPostedTransferShipments, searchTransferReceiptsExtended } from "@/lib/api/services/transfer-orders.service";
import { toast } from "sonner";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { useAuth } from "@/lib/contexts/auth-context";
import { getAllLOCsFromUserSetup } from "@/lib/api/services/dimension.service";

interface PostedTransferViewProps {
  type: "shipment" | "receipt";
}

export function PostedTransferView({ type }: PostedTransferViewProps) {
  const { openTab } = useFormStackContext();
  const [filters, setFilters] = useState<PostedTransferFilters | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeReportDocNo, setActiveReportDocNo] = useState<string | null>(null);
  const [reportPdfUrls, setReportPdfUrls] = useState<Record<string, string>>({});
  
  const { userID } = useAuth();
  const [authLocations, setAuthLocations] = useState<string[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
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

  // Fetch authorized locations for the current user
  useEffect(() => {
    const loadAuthLocations = async () => {
      if (!userID) return;
      setIsAuthLoading(true);
      try {
        const setup = await getAllLOCsFromUserSetup(userID);
        setAuthLocations(setup.map(s => s.Code).filter(Boolean));
      } catch (error) {
        console.error("Error loading user authorized locations:", error);
      } finally {
        setIsAuthLoading(false);
      }
    };
    loadAuthLocations();
  }, [userID]);

  const title = type === "shipment" ? "Posted Transfer Shipment" : "Posted Transfer Receipt";
  const description = `Enter details to find posted transfer ${type}s.`;

  const fetchData = useCallback(async () => {
    if (!filters || (userID && isAuthLoading)) return;
    setIsLoading(true);
    try {
      const parts = [];
      // Initial Date/Location Filters
      if (filters.fromDate) parts.push(`Posting_Date ge ${filters.fromDate}`);
      if (filters.toDate) parts.push(`Posting_Date le ${filters.toDate}`);
      if (filters.fromLocation) parts.push(`Transfer_from_Code eq '${filters.fromLocation}'`);
      if (filters.toLocation) parts.push(`Transfer_to_Code eq '${filters.toLocation}'`);
      
      // Column Filters (Server-side supported ones)
      const allowedServerFilters = ["No", "Posting_Date", "Transfer_from_Code", "Transfer_to_Code", "Vehicle_No", "E_Way_Bill_No"];
      
      Object.entries(columnFilters).forEach(([colId, f]) => {
        const { value, valueTo } = f;
        if (!value && !valueTo) return;
        
        if (colId === "Posting_Date") {
           if (value) parts.push(`Posting_Date ge ${value}`);
           if (valueTo) parts.push(`Posting_Date le ${valueTo}`);
        } else if (allowedServerFilters.includes(colId)) {
          parts.push(`contains(${colId},'${value.replace(/'/g, "''")}')`);
        }
      });

      // Mandatory Branch/Location Access Filter
      // BC OData doesn't support OR across distinct fields (e.g., Transfer_from_Code and Transfer_to_Code).
      // We filter by the primary location field based on the view type: 
      // Shipments are outbound (from), Receipts are inbound (to).
      if (authLocations.length > 0) {
        const mainField = type === "shipment" ? "Transfer_from_Code" : "Transfer_to_Code";
        const branchFilter = authLocations.map(loc => 
          `${mainField} eq '${loc}'`
        ).join(" or ");
        parts.push(`(${branchFilter})`);
      } else if (!isAuthLoading) {
        // If user has no branches assigned and loading finished, they see nothing
        // (unless we want to allow super-admins to see all, but usually there's at least one setup)
        // For now, if setup exists but is empty, restrict to non-existent to show empty
        parts.push("No eq 'NONE'");
      }

      const filter = parts.join(" and ");
      const orderby = sortColumn && sortDirection && ["No", "Posting_Date", "Transfer_from_Code", "Transfer_to_Code", "Vehicle_No", "E_Way_Bill_No"].includes(sortColumn) 
        ? `${sortColumn} ${sortDirection}` 
        : "No desc";
        
      const top = pageSize;
      const skip = (currentPage - 1) * pageSize;

      const params = { $filter: filter, $orderby: orderby, $top: top, $skip: skip, searchTerm: searchQuery };
      const result = type === "shipment" 
        ? await searchPostedTransferShipments(params)
        : await searchTransferReceiptsExtended(params);
      
      setData(result.orders);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error(`Error fetching posted transfer ${type}s:`, error);
      toast.error(`Failed to load posted ${type}s.`);
      setData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [type, filters, searchQuery, columnFilters, sortColumn, sortDirection, pageSize, currentPage, authLocations, isAuthLoading, userID]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Cleanup URLs on unmount
    return () => {
      Object.values(reportPdfUrls).forEach(url => window.URL.revokeObjectURL(url));
    };
  }, [reportPdfUrls]);

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
      if (!url) {
        toast.info(`No URL returned for ${reportName}`);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${docNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
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
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${docNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 5000);
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

  const hasActiveFilters = searchQuery !== "" || Object.values(columnFilters).some(f => f.value || f.valueTo);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasNextPage = currentPage < totalPages;

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
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={isLoading}>
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
          data={data} 
          isLoading={isLoading} 
          visibleColumns={visibleColumns}
          type={type}
          onViewReport={handlePreviewReport}
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
