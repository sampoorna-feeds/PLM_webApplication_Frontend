"use client";

import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { SalesDocumentTable } from "./sales-document-table";
import { SalesDocumentFilterBar } from "./sales-document-filter-bar";
import { SalesDocumentActiveFilters } from "./sales-document-active-filters";
import { SalesDocumentPaginationControls } from "./sales-document-pagination-controls";
import {
  getSalesDocumentConfig,
  type SalesDocumentStatusTab,
  type SalesDocumentType,
} from "./sales-document-config";
import { useSalesDocuments } from "./use-sales-documents";

interface SalesDocumentViewProps {
  documentType: SalesDocumentType;
  statusFilter?: SalesDocumentStatusTab;
  onPlaceOrder?: () => void;
  registerRefetch?: (refetch: () => void) => void;
}

export function SalesDocumentView({
  documentType,
  statusFilter,
  onPlaceOrder,
  registerRefetch,
}: SalesDocumentViewProps) {
  const { openTab } = useFormStackContext();
  const config = getSalesDocumentConfig(documentType);

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
  } = useSalesDocuments({ documentType, statusFilter });

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
      <SalesDocumentFilterBar
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
      >
        <Button onClick={handleCreateDocument} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {config.createButtonLabel}
        </Button>
      </SalesDocumentFilterBar>

      <SalesDocumentActiveFilters
        searchQuery={searchQuery}
        columnFilters={columnFilters}
        allColumns={allColumns}
        onSearch={onSearch}
        onColumnFilter={onColumnFilter}
        onClearFilters={onClearFilters}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <SalesDocumentTable
          orders={orders}
          isLoading={isLoading}
          visibleColumns={visibleColumns}
          allColumns={allColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          pageSize={pageSize}
          currentPage={currentPage}
          columnFilters={columnFilters}
          emptyMessage={`No ${config.documentLabel.toLowerCase()}s found`}
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

      <SalesDocumentPaginationControls
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
