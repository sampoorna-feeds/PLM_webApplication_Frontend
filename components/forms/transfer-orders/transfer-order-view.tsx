"use client";

import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { TransferOrdersTable } from "./transfer-orders-table";
import { TransferOrderFilterBar } from "./transfer-order-filter-bar";
import { TransferOrderActiveFilters } from "./active-filters";
import { TransferOrderPaginationControls } from "./pagination-controls";
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
  onPlaceOrder,
  registerRefetch,
}: TransferOrderViewProps) {
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
  } = useTransferOrders({ statusFilter });

  useEffect(() => {
    registerRefetch?.(refetch);
  }, [refetch, registerRefetch]);

  const hasNextPage = currentPage < totalPages;

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
      />
      <TransferOrderActiveFilters
        searchQuery={searchQuery}
        columnFilters={columnFilters}
        onSearch={onSearch}
        onColumnFilter={onColumnFilter}
        onClearFilters={onClearFilters}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
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
            openTab("transfer-order-detail", {
              title: `Order ${orderNo}`,
              context: { orderNo, refetch },
              autoCloseOnSuccess: false,
            });
          }}
          onSort={onSort}
          onColumnFilter={onColumnFilter}
        />
      </div>
      <TransferOrderPaginationControls
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
