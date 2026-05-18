"use client";

import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { QCReceiptsTable } from "./qc-receipts-table";
import { QCReceiptFilterBar } from "./qc-receipt-filter-bar";
import { QCReceiptActiveFilters } from "./active-filters";
import { useQCReceipts } from "./use-qc-receipts";
import type { QCReceiptHeader } from "@/lib/api/services/qc-receipt.service";
import { QCFilterForm, type QCDateFilters } from "./qc-filter-form";
import { Button } from "@/components/ui/button";

interface QCReceiptViewProps {
  statusFilter?: string;
  isPosted?: boolean;
  skipDateFilter?: boolean;
}

export function QCReceiptView({ statusFilter, isPosted, skipDateFilter }: QCReceiptViewProps) {

  const { openTab } = useFormStackContext();
  const {
    receipts,
    isLoading,
    isLoadingMore,
    hasMore,
    pageSize,
    currentPage,
    totalCount,
    totalPages,
    sortColumn,
    sortDirection,
    visibleColumns,
    searchQuery,
    columnFilters,
    dateFilter,
    setDateFilter,
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
    loadMore,
  } = useQCReceipts({ statusFilter, isPosted, skipDateFilter });

  const handleRowClick = (receipt: QCReceiptHeader) => {
    openTab("qc-receipt-detail", {
      title: `${isPosted ? "Posted QC Detail" : "QC Detail"}: ${receipt.No}`,
      context: { receipt, isPosted, onSuccess: refetch },
    });
  };

  const handleApplyFilters = (filters: QCDateFilters) => {
    setDateFilter(filters);
  };

  if (!dateFilter && !skipDateFilter) {
    return (
      <QCFilterForm
        title={isPosted ? "Posted QC Receipts" : "QC Receipts"}
        description="Select a date range to view quality control receipts"
        onApply={handleApplyFilters}
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 [overflow-anchor:none]">
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
        onDateFilterChange={() => setDateFilter(null)}
        totalCount={totalCount}
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
      <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
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
          isPosted={!!isPosted}
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
        />
      </div>
    </div>
  );
}


