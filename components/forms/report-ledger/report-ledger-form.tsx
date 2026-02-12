"use client";

/**
 * Report Ledger Form
 * Main component for viewing item ledger entries with filtering
 */

import { cn } from "@/lib/utils";
import { useReportLedger } from "./use-report-ledger";
import { ReportLedgerTable } from "./report-ledger-table";
import { PaginationControls } from "./pagination-controls";
import { TableFilterBar } from "./table-filter-bar";

export function ReportLedgerForm() {
  const {
    entries,
    isLoading,
    // Pagination
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    onPageSizeChange,
    onPageChange,
    // Sorting
    sortColumn,
    sortDirection,
    onSort,
    // Filters
    filters,
    locationOptions,
    itemOptions,
    isLoadingLocations,
    isLoadingItems,
    isLoadingMoreItems,
    hasMoreItems,
    onFiltersChange,
    onApplyFilters,
    onClearFilters,
    onItemSearch,
    onLoadMoreItems,
    // Column visibility
    visibleColumns,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
  } = useReportLedger();

  return (
    <div
      className={cn(
        "flex w-full",
        "h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)]",
      )}
    >
      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
        {/* Header - fixed at top */}
        <div className="flex shrink-0 items-center justify-between pb-3">
          <div>
            <h1 className="text-lg font-bold">Report Ledger</h1>
            <p className="text-muted-foreground text-sm">
              View item ledger entries by applying filters
            </p>
          </div>
        </div>

        {/* Filter Bar - fixed at top */}
        <div className="shrink-0">
          <TableFilterBar
            filters={filters}
            visibleColumns={visibleColumns}
            locationOptions={locationOptions}
            itemOptions={itemOptions}
            isLoadingLocations={isLoadingLocations}
            isLoadingItems={isLoadingItems}
            isLoadingMoreItems={isLoadingMoreItems}
            hasMoreItems={hasMoreItems}
            onFiltersChange={onFiltersChange}
            onApplyFilters={onApplyFilters}
            onClearFilters={onClearFilters}
            onColumnToggle={onColumnToggle}
            onResetColumns={onResetColumns}
            onShowAllColumns={onShowAllColumns}
            onItemSearch={onItemSearch}
            onLoadMoreItems={onLoadMoreItems}
          />
        </div>

        {/* Table container - takes remaining space with internal scrolling */}
        <div className="min-h-0 flex-1">
          <ReportLedgerTable
            entries={entries}
            isLoading={isLoading}
            pageSize={pageSize}
            currentPage={currentPage}
            visibleColumns={visibleColumns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </div>

        {/* Pagination Controls - fixed at bottom */}
        <div className="shrink-0">
          <PaginationControls
            pageSize={pageSize}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            hasNextPage={hasNextPage}
            onPageSizeChange={onPageSizeChange}
            onPageChange={onPageChange}
          />
        </div>
      </div>
    </div>
  );
}

export default ReportLedgerForm;
