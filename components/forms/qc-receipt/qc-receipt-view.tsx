"use client";

import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { QCReceiptsTable } from "./qc-receipts-table";
import { QCReceiptFilterBar } from "./qc-receipt-filter-bar";
import { QCReceiptActiveFilters } from "./active-filters";
import { useQCReceipts } from "./use-qc-receipts";
import type { QCReceiptHeader } from "@/lib/api/services/qc-receipt.service";
import { Button } from "@/components/ui/button";

interface QCReceiptViewProps {
  statusFilter?: string;
  isPosted?: boolean;
}

export function QCReceiptView({ statusFilter, isPosted }: QCReceiptViewProps) {
  const { openTab } = useFormStackContext();
  const {
    receipts,
    isLoading,
    pageSize,
    currentPage,
    totalCount,
    totalPages,
    sortColumn,
    sortDirection,
    visibleColumns,
    searchQuery,
    columnFilters,
    onSort,
    onPageChange,
    onPageSizeChange,
    onSearch,
    onColumnFilter,
    onClearFilters,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    refetch,
  } = useQCReceipts({ statusFilter, isPosted });

  const handleRowClick = (receipt: QCReceiptHeader) => {
    openTab("qc-receipt-detail", {
      title: `${isPosted ? "Posted QC Detail" : "QC Detail"}: ${receipt.No}`,
      context: { receipt, isPosted },
    });
  };

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Filter Bar */}
      <QCReceiptFilterBar
        searchQuery={searchQuery}
        visibleColumns={visibleColumns}
        columnFilters={columnFilters}
        onSearch={onSearch}
        onClearFilters={onClearFilters}
        onColumnToggle={onColumnToggle}
        onResetColumns={onResetColumns}
        onShowAllColumns={onShowAllColumns}
        onRefresh={refetch}
      />

      {/* Active Filters Chips */}
      <QCReceiptActiveFilters
        searchQuery={searchQuery}
        columnFilters={columnFilters}
        onSearch={onSearch}
        onColumnFilter={onColumnFilter}
        onClearFilters={onClearFilters}
      />

      {/* Main Table */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <QCReceiptsTable
          receipts={receipts}
          isLoading={isLoading}
          visibleColumns={visibleColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          pageSize={pageSize}
          currentPage={currentPage}
          columnFilters={columnFilters}
          onSort={onSort}
          onFilter={onColumnFilter}
          onRowClick={handleRowClick}
        />
      </div>

      {/* Pagination Container */}
      <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-4">
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            Showing <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min(currentPage * pageSize, totalCount)}</span> of{" "}
            <span className="font-semibold text-foreground">{totalCount}</span> results
          </p>
          
          <select 
            className="bg-transparent text-xs font-medium border rounded px-1 py-0.5 outline-none focus:ring-1 ring-primary/50"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map(size => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            {"<<"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1 mx-2">
            <span className="text-xs font-semibold">Page {currentPage}</span>
            <span className="text-xs text-muted-foreground">of {totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            {">>"}
          </Button>
        </div>
      </div>
    </div>
  );
}
