"use client";

import { useEffect } from "react";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { TransferOrdersTable } from "./transfer-orders-table";
import { TransferOrderFilterBar } from "./transfer-order-filter-bar";
import { TransferOrderActiveFilters } from "./active-filters";
import {
  useTransferOrders,
  type TransferOrderStatusTab,
} from "./use-transfer-orders";

export interface TransferOrderViewProps {
  /** Status filter for tab (Open | Pending Approval | Released). Applied at API level. */
  statusFilter?: TransferOrderStatusTab;
  /** Called when order is placed (e.g. to refetch list). Passed to FormStack context as onOrderPlaced. */
  onPlaceOrder?: () => void;
  /** Optional: register refetch so parent can trigger list refresh (e.g. after place order) */
  registerRefetch?: (refetch: () => void) => void;
}

export function TransferOrderView({
  statusFilter,
  registerRefetch,
}: TransferOrderViewProps) {
  const { openTab } = useFormStackContext();
  const {
    orders,
    isLoading,
    refetch,
    pageSize,
    currentPage,
    totalCount,
    sortColumn,
    sortDirection,
    searchQuery,
    columnFilters,
    visibleColumns,
    onSort,
    onSearch,
    onColumnFilter,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    onClearFilters,
    loadMore,
    hasMore,
    isLoadingMore,
  } = useTransferOrders({ statusFilter });

  useEffect(() => {
    registerRefetch?.(refetch);
  }, [refetch, registerRefetch]);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <TransferOrderFilterBar
          searchQuery={searchQuery}
          visibleColumns={visibleColumns}
          columnFilters={columnFilters}
          onSearch={onSearch}
          onClearFilters={onClearFilters}
          onColumnToggle={onColumnToggle}
          onResetColumns={onResetColumns}
          onShowAllColumns={onShowAllColumns}
        >
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-xs font-medium">
              Total: {totalCount.toLocaleString()}
            </span>
          </div>
        </TransferOrderFilterBar>
        <TransferOrderActiveFilters
          searchQuery={searchQuery}
          columnFilters={columnFilters}
          onSearch={onSearch}
          onColumnFilter={onColumnFilter}
          onClearFilters={onClearFilters}
        />
        <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
          <TransferOrdersTable
            orders={orders}
            isLoading={isLoading}
            visibleColumns={visibleColumns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            pageSize={pageSize}
            currentPage={currentPage}
            columnFilters={columnFilters}
            onRowClick={(orderNo) => {
              openTab("transfer-order", {
                title: `Order ${orderNo}`,
                context: {
                  orderNo,
                  mode: "view",
                  onOrderPosted: () => refetch(),
                },
              });
            }}
            onSort={onSort}
            onColumnFilter={onColumnFilter}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
          />
        </div>
      </div>
    </>
  );
}
