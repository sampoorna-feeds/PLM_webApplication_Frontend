"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Loader2, Printer } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { useAuth } from "@/lib/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { SalesDocumentTable } from "./sales-document-table";
import { SalesDocumentFilterBar } from "./sales-document-filter-bar";
import { SalesDocumentActiveFilters } from "./sales-document-active-filters";
import { SalesDocumentPaginationControls } from "./sales-document-pagination-controls";
import { useSalesPostedDocuments } from "./use-sales-posted-documents";
import {
  POSTED_DOCUMENT_CONFIGS,
  type SalesPostedDocumentType,
} from "./sales-posted-document-config";
import { getDeliveryReportPdf } from "@/lib/api/services/sales-orders.service";
import { getInvoiceReportPdf } from "@/lib/api/services/sales-posted-invoices.service";
import { getDownloadRecordLink } from "@/lib/api/services/transfer-orders.service";
import type { SalesOrder } from "@/lib/api/services/sales-orders.service";

interface SalesPostedDocumentViewProps {
  documentType: SalesPostedDocumentType;
  registerRefetch?: (refetch: () => void) => void;
}

function base64ToPdfBlob(b64: string): Blob {
  const normalized = b64
    .replace(/^data:application\/pdf;base64,/, "")
    .replace(/\s/g, "");
  const bytes = atob(normalized);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: "application/pdf" });
}

export function SalesPostedDocumentView({
  documentType,
  registerRefetch,
}: SalesPostedDocumentViewProps) {
  const { openTab } = useFormStackContext();
  const { userID } = useAuth();
  const config = POSTED_DOCUMENT_CONFIGS[documentType];

  const {
    orders,
    isLoading,
    refetch,
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    sortColumn,
    sortDirection,
    searchQuery,
    columnFilters,
    additionalFilters,
    visibleColumns,
    allColumns,
    defaultColumns,
    optionalColumns,
    onPageSizeChange,
    onPageChange,
    onSort,
    onSearch,
    onColumnFilter,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    onAddAdditionalFilter,
    onRemoveAdditionalFilter,
    onClearFilters,
  } = useSalesPostedDocuments(documentType);

  useEffect(() => {
    registerRefetch?.(refetch);
  }, [refetch, registerRefetch]);

  const hasNextPage = currentPage < totalPages;

  // PDF URL cache: docNo → object URL
  const pdfUrlsRef = useRef<Record<string, string>>({});
  const [loadingDocNo, setLoadingDocNo] = useState<string | null>(null);
  const [loadingEWayDocNo, setLoadingEWayDocNo] = useState<string | null>(null);

  const handlePrintEWayBill = useCallback(async (row: SalesOrder) => {
    const no = row.No;
    setLoadingEWayDocNo(no);
    try {
      const url = await getDownloadRecordLink({ documentType: "SalesInvoice", documentNo: no });
      if (!url) {
        toast.error("No URL returned for E-Way Bill.");
        return;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${no}_ewaybill.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
    } catch {
      toast.error("Failed to print E-Way Bill.");
    } finally {
      setLoadingEWayDocNo(null);
    }
  }, []);

  const handleViewPrint = useCallback(async (row: SalesOrder) => {
    const no = row.No;
    const existing = pdfUrlsRef.current[no];
    if (existing) {
      window.open(existing, "_blank", "noopener,noreferrer");
      return;
    }
    const rawRow = row as unknown as Record<string, unknown>;
    const customerNo = String(rawRow.Sell_to_Customer_No || "").trim();
    if (!customerNo) {
      toast.error("Missing customer number for PDF generation.");
      return;
    }

    const today = new Date();
    const todayDate = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const printdateTime = today.toISOString(); // ISO 8601 datetime
    const resolvedUserID = userID ?? "";
    const documentPostingDate = String(rawRow.Posting_Date || todayDate).trim();

    setLoadingDocNo(no);
    try {
      const base64 =
        documentType === "posted-invoice"
          ? await getInvoiceReportPdf(no, customerNo, todayDate, resolvedUserID, printdateTime)
          : await getDeliveryReportPdf(no, customerNo, documentPostingDate);
      if (!base64) throw new Error("No PDF content returned");
      const blob = base64ToPdfBlob(base64);
      const url = window.URL.createObjectURL(blob);
      pdfUrlsRef.current[no] = url;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Failed to generate PDF report.");
    } finally {
      setLoadingDocNo(null);
    }
  }, [documentType, userID]);

  const renderRowAction = useCallback(
    (row: SalesOrder) => {
      const isThisLoading = loadingDocNo === row.No;
      const isEWayLoading = loadingEWayDocNo === row.No;
      return (
        <div className="flex items-center justify-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleViewPrint(row)}
                  disabled={isThisLoading}
                >
                  {isThisLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>View / Print</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {documentType === "posted-invoice" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handlePrintEWayBill(row)}
                    disabled={isEWayLoading}
                  >
                    {isEWayLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Printer className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Print E-Way Bill</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    },
    [loadingDocNo, loadingEWayDocNo, handleViewPrint, handlePrintEWayBill, documentType],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <SalesDocumentFilterBar
        searchQuery={searchQuery}
        visibleColumns={visibleColumns}
        allColumns={allColumns}
        defaultColumns={defaultColumns}
        optionalColumns={optionalColumns}
        columnFilters={columnFilters}
        additionalFilters={additionalFilters}
        onSearch={onSearch}
        onClearFilters={onClearFilters}
        onColumnToggle={onColumnToggle}
        onResetColumns={onResetColumns}
        onShowAllColumns={onShowAllColumns}
        onAddAdditionalFilter={onAddAdditionalFilter}
        onRemoveAdditionalFilter={onRemoveAdditionalFilter}
      />

      <SalesDocumentActiveFilters
        searchQuery={searchQuery}
        columnFilters={columnFilters}
        allColumns={allColumns}
        onSearch={onSearch}
        onColumnFilter={onColumnFilter}
        onClearFilters={onClearFilters}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <SalesDocumentTable
          orders={orders as unknown as SalesOrder[]}
          isLoading={isLoading}
          visibleColumns={visibleColumns}
          allColumns={allColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          pageSize={pageSize}
          currentPage={currentPage}
          columnFilters={columnFilters}
          emptyMessage={`No ${config.documentLabel.toLowerCase()}s found`}
          onRowClick={(no) => {
            openTab(config.formType, {
              title: `${config.detailTitlePrefix} ${no}`,
              context: { documentType, no, refetch },
              autoCloseOnSuccess: false,
            });
          }}
          onSort={onSort}
          onColumnFilter={onColumnFilter}
          renderRowAction={renderRowAction}
        />
      </div>

      <SalesDocumentPaginationControls
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        onPageSizeChange={onPageSizeChange}
        onPageChange={onPageChange}
      />
    </div>
  );
}
