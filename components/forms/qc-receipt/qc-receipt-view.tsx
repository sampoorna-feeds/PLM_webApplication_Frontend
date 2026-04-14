"use client";

import { Filter, Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { QCReceiptsTable } from "./qc-receipts-table";
import { QCReceiptColumnVisibility } from "./column-visibility";
import { useQCReceipts } from "./use-qc-receipts";
import type { QCReceiptHeader } from "@/lib/api/services/qc-receipt.service";

export function QCReceiptView() {
  const { openTab } = useFormStackContext();
  const {
    receipts,
    isLoading,
    pageSize,
    currentPage,
    sortColumn,
    sortDirection,
    visibleColumns,
    onSort,
    onPageChange,
    onPageSizeChange,
    onSearch,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    refetch,
  } = useQCReceipts();

  const handleRowClick = (receipt: QCReceiptHeader) => {
    openTab("qc-receipt-detail", {
      title: `QC Detail: ${receipt.No}`,
      context: { receipt },
    });
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Search and Filters Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search QC receipts..."
              className="pl-8"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <QCReceiptColumnVisibility
            visibleColumns={visibleColumns}
            onColumnToggle={onColumnToggle}
            onResetColumns={onResetColumns}
            onShowAllColumns={onShowAllColumns}
          />
        </div>
      </div>

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
          onSort={onSort}
          onRowClick={handleRowClick}
        />
      </div>

      {/* Pagination (Simplified for now) */}
      <div className="flex items-center justify-between px-2 py-4 border-t">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
          <span className="font-medium">{Math.min(currentPage * pageSize, receipts.length)}</span> of{" "}
          <span className="font-medium">{receipts.length}</span> results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={receipts.length < pageSize}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
