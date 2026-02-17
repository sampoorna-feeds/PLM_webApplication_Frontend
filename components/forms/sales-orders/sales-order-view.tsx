"use client";

import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { SalesOrdersTable } from "./sales-orders-table";
import { SalesOrderFilterBar } from "./sales-order-filter-bar";
import { SalesOrderActiveFilters } from "./active-filters";
import { SalesOrderPaginationControls } from "./pagination-controls";
import {
  useSalesOrders,
  type SalesOrderStatusTab,
} from "./use-sales-orders";

export interface SalesOrderViewProps {
  /** Status filter for tab (Open | Pending Approval | Released). Applied at API level. */
  statusFilter?: SalesOrderStatusTab;
  /** Called when order is placed (e.g. to refetch list). Passed to FormStack context as onOrderPlaced. */
  onPlaceOrder?: () => void;
  /** Optional: register refetch so parent can trigger list refresh (e.g. after place order) */
  registerRefetch?: (refetch: () => void) => void;
}

export function SalesOrderView({
  statusFilter,
  onPlaceOrder,
  registerRefetch,
}: SalesOrderViewProps) {
  const { openTab } = useFormStackContext();
  const {
    orders,
    isLoading,
    refetch,
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    sortColumn,
    sortDirection,
    searchQuery,
    columnFilters,
    visibleColumns,
    onPageSizeChange,
    onPageChange,
    onSort,
    onSearch,
    onColumnFilter,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    onClearFilters,
  } = useSalesOrders({ statusFilter });

  useEffect(() => {
    registerRefetch?.(refetch);
  }, [refetch, registerRefetch]);

  const hasNextPage = currentPage < totalPages;

  const handlePlaceOrder = () => {
    openTab("sales-order", {
      title: "New Order",
      context: {
        openedFromParent: true,
        onOrderPlaced: onPlaceOrder,
      },
      autoCloseOnSuccess: true,
    });
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* Header row: Place Order above filters (like Production Orders) */}
      <div className="flex shrink-0 items-center justify-end pb-2">
        <Button onClick={handlePlaceOrder} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Place Order
        </Button>
      </div>
      <SalesOrderFilterBar
        searchQuery={searchQuery}
        visibleColumns={visibleColumns}
        columnFilters={columnFilters}
        onSearch={onSearch}
        onClearFilters={onClearFilters}
        onColumnToggle={onColumnToggle}
        onResetColumns={onResetColumns}
        onShowAllColumns={onShowAllColumns}
      />
      <SalesOrderActiveFilters
        searchQuery={searchQuery}
        columnFilters={columnFilters}
        onSearch={onSearch}
        onColumnFilter={onColumnFilter}
        onClearFilters={onClearFilters}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <SalesOrdersTable
          orders={orders}
          isLoading={isLoading}
          visibleColumns={visibleColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          pageSize={pageSize}
          currentPage={currentPage}
          columnFilters={columnFilters}
          onRowClick={(orderNo) => {
            openTab("sales-order-detail", {
              title: `Order ${orderNo}`,
              context: { orderNo, refetch },
              autoCloseOnSuccess: false,
            });
          }}
          onSort={onSort}
          onColumnFilter={onColumnFilter}
        />
      </div>
      <SalesOrderPaginationControls
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        onPageSizeChange={onPageSizeChange}
        onPageChange={onPageChange}
      />
      </div>
    </>
  );
}
