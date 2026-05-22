"use client";

import { useState, useEffect } from "react";
import { usePostedTransfers, type PostedTransferFilters } from "./use-posted-transfers";
import { PostedTransferTable } from "./posted-transfer-table";
import { TableFilterBar } from "./table-filter-bar";
import { Button } from "@/components/ui/button";
import { RotateCcw, RefreshCcw } from "lucide-react";
import { loadVisibleColumns, saveVisibleColumns, getDefaultVisibleColumns, POSTED_TRANSFER_COLUMNS } from "./column-config";
import { getTransferShipmentReport, getTransferReceiptReport, getDownloadRecordLink } from "@/lib/api/services/transfer-orders.service";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";

interface PostedTransferViewProps {
  type: "shipment" | "receipt";
}

export function PostedTransferView({ type }: PostedTransferViewProps) {
  const { openTab } = useFormStackContext();
  const [filters, setFilters] = useState<PostedTransferFilters>({});
  const [activeReportDocNo, setActiveReportDocNo] = useState<string | null>(null);
  const [reportPdfUrls, setReportPdfUrls] = useState<Record<string, string>>({});
  
  const {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    totalCount,
    sortColumn,
    sortDirection,
    searchQuery,
    columnFilters,
    onSort,
    onSearch,
    onColumnFilter,
    onClearFilters,
    refetch,
    loadMore,
  } = usePostedTransfers({ type, initialFilters: filters });

  // Column Visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => 
    typeof window !== "undefined" ? loadVisibleColumns() : getDefaultVisibleColumns()
  );

  const title = type === "shipment" ? "Posted Transfer Shipment" : "Posted Transfer Receipt";

  useEffect(() => {
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

  const getReportPdfUrl = async (docNo: string) => {
    if (reportPdfUrls[docNo]) return reportPdfUrls[docNo];

    setActiveReportDocNo(docNo);
    try {
      const base64Data = type === "receipt"
        ? await getTransferReceiptReport(docNo)
        : await getTransferShipmentReport(docNo);
      if (!base64Data) throw new Error("No PDF content returned.");

      const blob = base64ToPdfBlob(base64Data);
      const url = window.URL.createObjectURL(blob);
      setReportPdfUrls(prev => ({ ...prev, [docNo]: url }));
      return url;
    } finally {
      setActiveReportDocNo(null);
    }
  };

  const handlePreviewReport = async (docNo: string) => {
    try {
      const url = await getReportPdfUrl(docNo);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toastError(err, "Failed to preview report");
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
      toastError(err, `Failed to get ${reportName} link`);
    } finally {
      setActiveReportDocNo(null);
    }
  };

  const handlePrintRecord = async (docNo: string, docType: string, reportName: string) => {
    setActiveReportDocNo(docNo);
    try {
      if (type === "receipt") {
        const url = await getReportPdfUrl(docNo);
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow?.print();
        };
        return;
      }

      const url = await getDownloadRecordLink({ documentType: docType, documentNo: docNo });
      if (!url) {
        toast.info(`No URL returned for ${reportName}`);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const pdfBlob = new Blob([arrayBuffer], { type: "application/pdf" });
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      
      // Open the Blob URL directly in a new tab to view
      window.open(blobUrl, "_blank");
      
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 10000);
    } catch (err: any) {
      toastError(err, `Failed to print ${reportName}`);
    } finally {
      setActiveReportDocNo(null);
    }
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

  return (
    <div className="flex flex-col h-full w-full gap-2 [overflow-anchor:none]">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold">{title} Data</h1>
          <span className="text-xs text-muted-foreground mt-0.5">Total: {totalCount.toLocaleString()} records</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { 
              setFilters({});
              onClearFilters();
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Search
          </Button>
        </div>
      </div>
      
      <TableFilterBar 
        searchQuery={searchQuery}
        onSearch={onSearch}
        onClearFilters={() => {
          onSearch("");
          onClearFilters();
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
          onSort={onSort}
          columnFilters={columnFilters}
          onColumnFilter={onColumnFilter}
          onRowClick={(id) => {
            openTab(`posted-transfer-${type}-detail`, {
              title: `${type === "shipment" ? "Shipment" : "Receipt"} ${id}`,
              context: { no: id, type }
            });
          }}
          onDownloadRecord={handleGetRecordLink}
          onPrintRecord={handlePrintRecord}
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
        />
      </div>
    </div>
  );
}
