"use client";

import { useReportLedger } from "./use-report-ledger";
import { ReportLedgerTable } from "./report-ledger-table";
import { PaginationControls } from "./pagination-controls";
import { TableFilterBar } from "./table-filter-bar";
import { ReportLedgerSummary } from "./report-ledger-summary";

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
    // Metrics
    openingBalance,
    increaseMetrics,
    decreaseMetrics,
    closingBalance,
    isLoadingSummary,
  } = useReportLedger();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between pb-3">
        <p className="text-muted-foreground text-sm">
          Browse item ledger entries with filters and sorting
        </p>
      </div>

      {/* Main content area */}
      <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-auto">
        {/* Filter Bar */}
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

        {/* Summary Section - Show when entries are loaded */}
        {(entries.length > 0 || isLoadingSummary) && (
          <div className="shrink-0 overflow-hidden">
            <h2 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
              Summary
            </h2>
            <ReportLedgerSummary
              openingBalance={openingBalance}
              increaseMetrics={increaseMetrics}
              decreaseMetrics={decreaseMetrics}
              closingBalance={closingBalance}
              isLoadingSummary={isLoadingSummary}
            />
          </div>
        )}

        {/* Table container */}
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

        {/* Pagination Controls */}
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
