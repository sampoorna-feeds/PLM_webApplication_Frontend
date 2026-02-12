"use client";

/**
 * Released Production Orders View
 * Main view for released production orders with FormStack integration
 */

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { useProductionOrders } from "./use-production-orders";
import { ProductionOrdersTable } from "./production-orders-table";
import { PaginationControls } from "./pagination-controls";
import { TableFilterBar } from "./table-filter-bar";
import { ActiveFilters } from "./active-filters";
import { RELEASED_ORDERS_EXCLUDED_COLUMNS } from "./column-config";

export function ReleasedOrdersView() {
  const { openTab } = useFormStackContext();

  const {
    orders,
    isLoading,
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    onPageSizeChange,
    onPageChange,
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
    addOrder,
    refetch,
  } = useProductionOrders();

  const hasNextPage = currentPage < totalPages;

  const handleCreateOrder = () => {
    openTab("production-order", {
      title: "Create Production Order",
      context: {
        mode: "create",
        openedFromParent: true,
        onOrderCreated: addOrder,
      },
      autoCloseOnSuccess: true,
    });
  };

  const handleRowClick = (orderNo: string) => {
    openTab("production-order", {
      title: `Order: ${orderNo}`,
      context: {
        mode: "view",
        orderNo,
        openedFromParent: true,
        onStatusChanged: refetch,
      },
      autoCloseOnSuccess: false,
    });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between pb-3">
        <div>
          <p className="text-muted-foreground text-sm">
            Released orders ready for production
          </p>
        </div>
        <Button onClick={handleCreateOrder} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Order
        </Button>
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
            excludeColumns={RELEASED_ORDERS_EXCLUDED_COLUMNS}
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
