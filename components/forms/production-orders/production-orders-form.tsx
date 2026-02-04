"use client";

/**
 * Production Orders Form
 * Main component for viewing and managing production orders
 * Uses FormStack for managing multiple form tabs
 */

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { useProductionOrders } from "./use-production-orders";
import { ProductionOrdersTable } from "./production-orders-table";
import { PaginationControls } from "./pagination-controls";
import { TableFilterBar } from "./table-filter-bar";
import { ActiveFilters } from "./active-filters";
import { cn } from "@/lib/utils";

function ProductionOrdersContent() {
  const {
    orders,
    isLoading,
    // Pagination
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    onPageSizeChange,
    onPageChange,
    // Sorting
    sortColumn,
    sortDirection,
    onSort,
    // Filtering - Basic
    searchQuery,
    onSearch,
    onClearFilters,
    // Column filters (generic)
    columnFilters,
    onColumnFilter,
    // Column visibility
    visibleColumns,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    addOrder,
  } = useProductionOrders();

  const { openTab } = useFormStackContext();

  // Determine if there's a next page
  const hasNextPage = currentPage < totalPages;

  // Open create form in FormStack
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

  // Open view form in FormStack when clicking a row
  const handleRowClick = (orderNo: string) => {
    openTab("production-order", {
      title: `Order: ${orderNo}`,
      context: {
        mode: "view",
        orderNo,
        openedFromParent: true,
      },
      autoCloseOnSuccess: false, // View mode shouldn't auto-close
    });
  };

  return (
    <div className={cn(
      "flex w-full",
      "h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)]",
    )}>
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col p-4 overflow-hidden">
        {/* Header - fixed at top */}
        <div className="flex-shrink-0 flex items-center justify-between pb-3">
          <div>
            <h1 className="text-lg font-bold">Released Production Orders</h1>
            <p className="text-sm text-muted-foreground">
              View and manage released production orders
            </p>
          </div>
          <Button onClick={handleCreateOrder} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Order
          </Button>
        </div>

        {/* Filter Bar - fixed at top */}
        <div className="flex-shrink-0">
          <TableFilterBar
            searchQuery={searchQuery}
            visibleColumns={visibleColumns}
            columnFilters={columnFilters}
            onSearch={onSearch}
            onClearFilters={onClearFilters}
            onColumnToggle={onColumnToggle}
            onResetColumns={onResetColumns}
            onShowAllColumns={onShowAllColumns}
          />
        </div>

        {/* Active Filters Display - conditionally rendered by the component itself */}
        <div className="flex-shrink-0">
          <ActiveFilters
            searchQuery={searchQuery}
            columnFilters={columnFilters}
            onSearch={onSearch}
            onColumnFilter={onColumnFilter}
            onClearFilters={onClearFilters}
          />
        </div>

        {/* Table container - takes remaining space with internal scrolling */}
        <div className="flex-1 min-h-0">
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
          />
        </div>

        {/* Pagination Controls - fixed at bottom */}
        <div className="flex-shrink-0">
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

      {/* FormStack Panel */}
      <FormStackPanel />

      {/* Mini Access Panel */}
      <MiniAccessPanel />
    </div>
  );
}



export function ProductionOrdersForm() {
  return (
    <FormStackProvider formScope="production-orders">
      <ProductionOrdersContent />
    </FormStackProvider>
  );
}

