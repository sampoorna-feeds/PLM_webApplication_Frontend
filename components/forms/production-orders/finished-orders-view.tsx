"use client";

/**
 * Finished Production Orders View
 * Read-only table view for finished production orders
 */

import { useFinishedProductionOrders } from "./use-finished-production-orders";
import { ProductionOrdersTable } from "./production-orders-table";
import { TableFilterBar } from "./table-filter-bar";
import { ActiveFilters } from "./active-filters";
import { FINISHED_ORDERS_EXCLUDED_COLUMNS } from "./column-config";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";

export function FinishedOrdersView() {
  const {
    orders,
    isLoading,
    pageSize,
    currentPage,
    totalCount,
    sortColumn,
    sortDirection,
    onSort,
    searchQuery,
    onSearch,
    onClearFilters,
    columnFilters,
    onColumnFilter,
    visibleColumns,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    branchOptions,
    userBranchCodes,
    additionalFilters,
    handleAddAdditionalFilter,
    handleRemoveAdditionalFilter,
    loadMore,
    hasMore,
    isLoadingMore,
    refetch,
  } = useFinishedProductionOrders();

  const { openTab } = useFormStackContext();

  // Removed hasNextPage

  // Open a read-only detail view in FormStack
  const handleRowClick = (orderNo: string) => {
    openTab("finished-production-order-detail", {
      title: `Finished Order ${orderNo}`,
      context: { orderNo },
      autoCloseOnSuccess: false,
    });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between pb-3">
        <div>
          <p className="text-muted-foreground text-sm">
            Completed production orders
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-xs font-medium">
            Total: {totalCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main content area with scrolling */}
      <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-auto">
        {/* Filter Bar */}
        <div className="shrink-0">
          <TableFilterBar
            searchQuery={searchQuery}
            visibleColumns={visibleColumns}
            columnFilters={columnFilters}
            onSearch={onSearch}
            onClearFilters={onClearFilters}
            onColumnToggle={onColumnToggle}
            onResetColumns={onResetColumns}
            onShowAllColumns={onShowAllColumns}
            excludeColumns={FINISHED_ORDERS_EXCLUDED_COLUMNS}
            additionalFilters={additionalFilters}
            onAddAdditionalFilter={handleAddAdditionalFilter}
            onRemoveAdditionalFilter={handleRemoveAdditionalFilter}
          />
        </div>

        {/* Active Filters Display */}
        <ActiveFilters
          searchQuery={searchQuery}
          columnFilters={columnFilters}
          onSearch={onSearch}
          onColumnFilter={onColumnFilter}
          onClearFilters={onClearFilters}
          userBranchCodes={userBranchCodes}
        />

        {/* Table container */}
        <div className="min-h-0 flex-1">
          <ProductionOrdersTable
            orders={orders}
            isLoading={isLoading}
            pageSize={pageSize}
            currentPage={currentPage}
            visibleColumns={visibleColumns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            columnFilters={columnFilters}
            onRowClick={handleRowClick}
            onSort={onSort}
            onColumnFilter={onColumnFilter}
            branchOptions={branchOptions}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
          />
        </div>
      </div>
    </div>
  );
}
