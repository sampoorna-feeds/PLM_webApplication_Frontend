"use client";

import { FormStackProvider, FormStackPanel, MiniAccessPanel } from "@/components/form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { usePostedSales } from "@/components/forms/posted-sales/use-posted-sales";
import { PostedSalesTable } from "@/components/forms/posted-sales/posted-sales-table";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getPostedReportPdf } from "@/lib/api/services/posted-report.service";
import { viewPdfFromBase64 } from "@/lib/pdf-utils";
import { toast } from "sonner";

import { PostedDocumentFilterForm, type DateRangeFilters } from "@/components/forms/posted-documents/posted-document-filter-form";

import { PostedSalesColumnVisibility } from "@/components/forms/posted-sales/column-visibility";
import { POSTED_SALES_COLUMNS } from "@/components/forms/posted-sales/column-config";

function PostedSalesCreditMemoContent() {
  const {
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
    onPageChange,
    onSort,
    onSearch,
    onColumnFilter,
    onToggleColumn,
    onClearFilters,
    refetch,
  } = usePostedSales();

  const { openTab } = useFormStackContext();

  const handleRowClick = (doc: any) => {
    openTab("posted-sales-credit-memo", {
      title: `Posted Cr. Memo: ${doc.No}`,
      context: { doc, mode: "view" },
    });
  };

  const handleApplyFilters = (filters: DateRangeFilters) => {
    setDateFilter(filters);
  };

  const handlePrint = async (doc: any) => {
    try {
      const base64 = await getPostedReportPdf("SalesCreditMemo", doc.No);
      if (!base64) {
        toast.error("No report data received from server.");
        return;
      }
      viewPdfFromBase64(base64, `SalesCreditMemo_${doc.No}`);
      toast.success("Report generated successfully.");
    } catch (error: any) {
      console.error("Print error:", error);
      toast.error(error.message || "Failed to generate report.");
    }
  };

  if (!dateFilter) {
    return (
      <PostedDocumentFilterForm
        title="Posted Sales Credit Memos"
        description="Select a date range to view processed sales credit memos"
        onApply={handleApplyFilters}
      />
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posted Sales Credit Memo</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">View processed sales credit memos</p>
            {dateFilter && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                {dateFilter.fromDate.split('-').reverse().join('/')} - {dateFilter.toDate.split('-').reverse().join('/')}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateFilter(null)}
            className="h-8 text-xs"
          >
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            Change Date Range
          </Button>
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by No., Customer..."
              className="h-9 pl-8 text-xs font-medium"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9 gap-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
              Clear Filters
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PostedSalesColumnVisibility 
            columns={POSTED_SALES_COLUMNS.map(c => ({ ...c, visible: visibleColumns.includes(c.id) }))}
            onToggle={onToggleColumn}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <PostedSalesTable
          documents={documents}
          isLoading={isLoading}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
          onRowClick={handleRowClick}
          columnFilters={columnFilters}
          onColumnFilter={onColumnFilter}
          visibleColumns={visibleColumns}
          onPrint={handlePrint}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, totalCount)}</span> of{" "}
            <span className="font-medium text-foreground">{totalCount}</span> results
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            Previous
          </Button>
          <div className="text-xs font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PostedSalesCreditMemoPage() {
  return (
    <FormStackProvider formScope="posted-sales-credit-memo">
      <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <PostedSalesCreditMemoContent />
        </div>
        <FormStackPanel />
        <MiniAccessPanel />
      </div>
    </FormStackProvider>
  );
}
