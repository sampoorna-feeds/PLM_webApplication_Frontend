"use client";

import { useEffect } from "react";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { SalesDocumentTable } from "./sales-document-table";
import { SalesDocumentFilterBar } from "./sales-document-filter-bar";
import { SalesDocumentActiveFilters } from "./sales-document-active-filters";
import { SalesDocumentPaginationControls } from "./sales-document-pagination-controls";
import { useSalesPostedDocuments } from "./use-sales-posted-documents";
import {
  POSTED_DOCUMENT_CONFIGS,
  type SalesPostedDocumentType,
} from "./sales-posted-document-config";
import type { SalesOrder } from "@/lib/api/services/sales-orders.service";

interface SalesPostedDocumentViewProps {
  documentType: SalesPostedDocumentType;
  registerRefetch?: (refetch: () => void) => void;
}

export function SalesPostedDocumentView({
  documentType,
  registerRefetch,
}: SalesPostedDocumentViewProps) {
  const { openTab } = useFormStackContext();
  const config = POSTED_DOCUMENT_CONFIGS[documentType];

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
  } = useSalesPostedDocuments(documentType);

  useEffect(() => {
    registerRefetch?.(refetch);
  }, [refetch, registerRefetch]);

  const hasNextPage = currentPage < totalPages;

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
      />

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
          orders={orders as unknown as SalesOrder[]}
          isLoading={isLoading}
          visibleColumns={visibleColumns}
          allColumns={allColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          pageSize={pageSize}
          currentPage={currentPage}
          columnFilters={columnFilters}
          emptyMessage={`No ${config.documentLabel.toLowerCase()}s found`}
          onRowClick={(no) => {
            openTab(config.formType, {
              title: `${config.detailTitlePrefix} ${no}`,
              context: { documentType, no, refetch },
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
