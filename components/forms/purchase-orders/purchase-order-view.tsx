"use client";

import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { PurchaseOrdersTable } from "./purchase-orders-table";
import { PurchaseOrderFilterBar } from "./purchase-order-filter-bar";
import { PurchaseOrderActiveFilters } from "./active-filters";
import { PurchaseOrderPaginationControls } from "./pagination-controls";
import {
  usePurchaseOrders,
  type PurchaseOrderStatusTab,
} from "./use-purchase-orders";

export interface PurchaseOrderViewProps {
  /** Status filter for tab (Open | Pending Approval | Released). Applied at API level. */
  statusFilter?: PurchaseOrderStatusTab;
  /** Called when order is placed (e.g. to refetch list). Passed to FormStack context as onOrderPlaced. */
  onPlaceOrder?: () => void;
  /** Optional: register refetch so parent can trigger list refresh (e.g. after place order) */
  registerRefetch?: (refetch: () => void) => void;
}

export function PurchaseOrderView({
  statusFilter,
  onPlaceOrder,
  registerRefetch,
}: PurchaseOrderViewProps) {
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
    additionalFilters,
    visibleColumns,
    onPageSizeChange,
    onPageChange,
    onSort,
    onSearch,
    onColumnFilter,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    onAddAdditionalFilter,
    onRemoveAdditionalFilter,
    onClearFilters,
  } = usePurchaseOrders({ statusFilter });

  useEffect(() => {
    registerRefetch?.(refetch);
  }, [refetch, registerRefetch]);

  const hasNextPage = currentPage < totalPages;

  const handlePlaceOrder = () => {
    openTab("purchase-order", {
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
        <PurchaseOrderFilterBar
          searchQuery={searchQuery}
          visibleColumns={visibleColumns}
          columnFilters={columnFilters}
          additionalFilters={additionalFilters}
          onSearch={onSearch}
          onClearFilters={onClearFilters}
          onColumnToggle={onColumnToggle}
          onResetColumns={onResetColumns}
          onShowAllColumns={onShowAllColumns}
          onAddAdditionalFilter={onAddAdditionalFilter}
          onRemoveAdditionalFilter={onRemoveAdditionalFilter}
        >
          <Button onClick={handlePlaceOrder} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Place Order
          </Button>
        </PurchaseOrderFilterBar>
        <PurchaseOrderActiveFilters
          searchQuery={searchQuery}
          columnFilters={columnFilters}
          onSearch={onSearch}
          onColumnFilter={onColumnFilter}
          onClearFilters={onClearFilters}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <PurchaseOrdersTable
            orders={orders}
            isLoading={isLoading}
            visibleColumns={visibleColumns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            pageSize={pageSize}
            currentPage={currentPage}
            columnFilters={columnFilters}
            onRowClick={(orderNo) => {
              openTab("purchase-order-detail", {
                title: `Order ${orderNo}`,
                context: { orderNo, refetch },
                autoCloseOnSuccess: false,
              });
            }}
            onSort={onSort}
            onColumnFilter={onColumnFilter}
          />
        </div>
        <PurchaseOrderPaginationControls
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
