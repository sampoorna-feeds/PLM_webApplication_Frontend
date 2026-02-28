"use client";

import { useInventorySummary } from "./use-inventory-summary";
import { SummaryFilterBar } from "./summary-filter-bar";
import { InventorySummaryTable } from "./inventory-summary-table";
import { PaginationControls } from "./pagination-controls";

export function InventorySummaryForm() {
  const {
    // Filter state
    filters,
    appliedFilters,
    locationOptions,
    isLoadingLocations,
    // Data
    allRows,
    grouped,
    paginatedRows,
    isLoading,
    loadingMessage,
    // Pagination
    currentPage,
    totalPages,
    totalCount,
    // Actions
    handleFiltersChange,
    handleApplyFilters,
    handleClearFilters,
    handlePageChange,
  } = useInventorySummary();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-auto">
        {/* Filter Bar */}
        <div className="shrink-0">
          <SummaryFilterBar
            filters={filters}
            locationOptions={locationOptions}
            isLoadingLocations={isLoadingLocations}
            totalCount={totalCount}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            onFiltersChange={handleFiltersChange}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1">
          <InventorySummaryTable
            allRows={allRows}
            grouped={grouped}
            paginatedRows={paginatedRows}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            dateFrom={appliedFilters.postingDateFrom}
            dateTo={appliedFilters.postingDateTo}
          />
        </div>

        {/* Pagination */}
        {!isLoading && allRows.length > 0 && (
          <div className="shrink-0">
            <PaginationControls
              pageSize={50}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              hasNextPage={currentPage < totalPages}
              onPageSizeChange={() => {}}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
