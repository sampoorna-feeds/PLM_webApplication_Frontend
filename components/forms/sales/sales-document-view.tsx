"use client";

import { useState, useEffect } from "react";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { SalesPlanningModal } from "./sales-planning-modal";
import { SalesDocumentTable } from "./sales-document-table";
import { SalesDocumentFilterBar } from "./sales-document-filter-bar";
import { SalesDocumentActiveFilters } from "./sales-document-active-filters";
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
  const [isSalesPlanningOpen, setIsSalesPlanningOpen] = useState(false);

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
    additionalFilters,
    visibleColumns,
    allColumns,
    defaultColumns,
    optionalColumns,
    onSort,
    onSearch,
    onColumnFilter,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    onAddAdditionalFilter,
    onRemoveAdditionalFilter,
    onClearFilters,
    loadMore,
    hasMore,
    isLoadingMore,
  } = useSalesDocuments({ documentType, statusFilter });

  useEffect(() => {
    registerRefetch?.(refetch);
  }, [refetch, registerRefetch]);

  // Removed hasNextPage calculation

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
        <div className="flex items-center gap-4">
          {config.type === "order" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSalesPlanningOpen(true)}
              className="h-8 gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase border-primary/30 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Sales Planning
            </Button>
          )}
          <span className="text-muted-foreground text-xs font-medium">
            Total: {totalCount.toLocaleString()}
          </span>
          <Button onClick={handleCreateDocument} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {config.createButtonLabel}
          </Button>
        </div>
      </SalesDocumentFilterBar>

      <SalesDocumentActiveFilters
        searchQuery={searchQuery}
        columnFilters={columnFilters}
        allColumns={allColumns}
        onSearch={onSearch}
        onColumnFilter={onColumnFilter}
        onClearFilters={onClearFilters}
      />

      <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
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
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
        />
      </div>

      <SalesPlanningModal
        isOpen={isSalesPlanningOpen}
        onClose={() => setIsSalesPlanningOpen(false)}
      />
    </div>
  );
}
