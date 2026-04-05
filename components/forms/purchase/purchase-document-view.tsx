"use client";

import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { PurchaseOrdersTable } from "@/components/forms/purchase/purchase-orders-table";
import { PurchaseOrderFilterBar } from "@/components/forms/purchase/purchase-order-filter-bar";
import { PurchaseOrderActiveFilters } from "@/components/forms/purchase/active-filters";
import { PurchaseOrderPaginationControls } from "@/components/forms/purchase/pagination-controls";
import {
  getPurchaseDocumentConfig,
  type PurchaseDocumentStatusTab,
  type PurchaseDocumentType,
} from "./purchase-document-config";
import { usePurchaseDocuments } from "./use-purchase-documents";

interface PurchaseDocumentViewProps {
  documentType: PurchaseDocumentType;
  statusFilter?: PurchaseDocumentStatusTab;
  onPlaceOrder?: () => void;
  registerRefetch?: (refetch: () => void) => void;
}

export function PurchaseDocumentView({
  documentType,
  statusFilter,
  onPlaceOrder,
  registerRefetch,
}: PurchaseDocumentViewProps) {
  const { openTab } = useFormStackContext();
  const config = getPurchaseDocumentConfig(documentType);

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
    allColumns,
    defaultColumns,
    optionalColumns,
    poType,
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
    onPoTypeChange,
    onClearFilters,
  } = usePurchaseDocuments({ documentType, statusFilter });

  useEffect(() => {
    registerRefetch?.(refetch);
  }, [refetch, registerRefetch]);

  const hasNextPage = currentPage < totalPages;

  const handleCreateDocument = () => {
    openTab(config.formType, {
      title: config.createTabTitle,
      context: {
        documentType,
        mode: "create",
        openedFromParent: true,
        onOrderPlaced: onPlaceOrder,
      },
      autoCloseOnSuccess: true,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <PurchaseOrderFilterBar
        searchQuery={searchQuery}
        visibleColumns={visibleColumns}
        allColumns={allColumns}
        defaultColumns={defaultColumns}
        optionalColumns={optionalColumns}
        columnFilters={columnFilters}
        additionalFilters={additionalFilters}
        onSearch={onSearch}
        onClearFilters={onClearFilters}
        onColumnToggle={onColumnToggle}
        onResetColumns={onResetColumns}
        onShowAllColumns={onShowAllColumns}
        onAddAdditionalFilter={onAddAdditionalFilter}
        onRemoveAdditionalFilter={onRemoveAdditionalFilter}
        poType={config.supportsPoTypeFilter ? poType : undefined}
        onPoTypeChange={
          config.supportsPoTypeFilter ? onPoTypeChange : undefined
        }
      >
        <Button onClick={handleCreateDocument} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {config.createButtonLabel}
        </Button>
      </PurchaseOrderFilterBar>

      <PurchaseOrderActiveFilters
        searchQuery={searchQuery}
        columnFilters={columnFilters}
        allColumns={allColumns}
        onSearch={onSearch}
        onColumnFilter={onColumnFilter}
        onClearFilters={onClearFilters}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <PurchaseOrdersTable
          orders={orders}
          isLoading={isLoading}
          visibleColumns={visibleColumns}
          allColumns={allColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          pageSize={pageSize}
          currentPage={currentPage}
          columnFilters={columnFilters}
          onRowClick={(orderNo) => {
            openTab(config.formType, {
              title: `${config.detailTitlePrefix} ${orderNo}`,
              context: { documentType, mode: "view", orderNo, refetch },
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
  );
}
