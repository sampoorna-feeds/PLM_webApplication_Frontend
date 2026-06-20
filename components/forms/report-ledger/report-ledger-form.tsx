"use client";

import { useReportLedger } from "./use-report-ledger";
import { ReportLedgerTable } from "./report-ledger-table";
import { TableFilterBar } from "./table-filter-bar";
export function ReportLedgerForm() {
  const {
    entries,
    isLoading,
    isFetchingNextPage,
    hasMore,
    loadMore,
    totalCount,
    currentFilterString,
    humanReadableFilters,
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
    handleFiltersChange: onFiltersChange,
    handleApplyFilters: onApplyFilters, // Keeping old alias
    handleApplyAdditionalFilters,
    handleClearFilters: onClearFilters,
    onItemSearch,
    onLoadMoreItems,
    // Column visibility
    visibleColumns,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    columnFilters,
    onColumnFilter,
    onClearColumnFilters,
  } = useReportLedger();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Main content area */}
      <div className="flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden">
        {/* Filter Bar */}
        <div className="shrink-0">
          <TableFilterBar
            filters={filters}
            visibleColumns={visibleColumns}
            locationOptions={locationOptions}
            itemOptions={itemOptions}
            currentFilterString={currentFilterString}
            totalCount={totalCount}
            humanReadableFilters={humanReadableFilters}
            isLoadingLocations={isLoadingLocations}
            isLoadingItems={isLoadingItems}
            isLoadingMoreItems={isLoadingMoreItems}
            hasMoreItems={hasMoreItems}
            onFiltersChange={onFiltersChange}
            onApplyFilters={onApplyFilters}
            onApplyAdditionalFilters={handleApplyAdditionalFilters}
            onClearFilters={onClearFilters}
            onColumnToggle={onColumnToggle}
            onResetColumns={onResetColumns}
            onShowAllColumns={onShowAllColumns}
            onItemSearch={onItemSearch}
            onLoadMoreItems={onLoadMoreItems}
          />
        </div>

        {/* Table container */}
        <div className="min-h-0 flex-1">
          <ReportLedgerTable
            entries={entries}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasMore={hasMore}
            loadMore={loadMore}
            visibleColumns={visibleColumns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
            columnFilters={columnFilters}
            onFilter={onColumnFilter}
            onClearColumnFilters={onClearColumnFilters}
          />
        </div>
      </div>
    </div>
  );
}

export default ReportLedgerForm;

