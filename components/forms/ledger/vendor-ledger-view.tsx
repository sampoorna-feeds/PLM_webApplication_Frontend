"use client";

import { AccountSelect } from "@/components/forms/account-select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { PaginationControls } from "../report-ledger/pagination-controls";
import { useVendorLedger } from "./use-vendor-ledger";
import { VendorLedgerFilterBar } from "./vendor-ledger-filter-bar";
import { VendorLedgerTable } from "./vendor-ledger-table";

export function VendorLedgerView() {
  const [activeTab, setActiveTab] = useState<"ledger" | "outstanding">(
    "ledger",
  );

  const ledgerState = useVendorLedger({ isOutstanding: false });
  const outstandingState = useVendorLedger({ isOutstanding: true });

  const currentState = activeTab === "ledger" ? ledgerState : outstandingState;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "ledger" | "outstanding");
  };

  return (
    <div className="flex h-full w-full flex-col gap-2 p-4 overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Vendor Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Detailed transaction history and real-time outstanding balance tracking
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-muted/50 p-1 rounded-lg border shadow-sm">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-[240px]"
          >
            <TabsList className="grid w-full grid-cols-2 h-8 p-0">
              <TabsTrigger
                value="ledger"
                className="h-7 text-xs font-medium"
              >
                Ledger
              </TabsTrigger>
              <TabsTrigger
                value="outstanding"
                className="h-7 text-xs font-medium"
              >
                Outstanding
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => currentState.refetch()}
            disabled={currentState.isLoading}
            className="h-8 px-3 text-xs"
          >
            {currentState.isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
            ) : (
              <RefreshCcw className="mr-2 h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Orchestration Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-card border p-4 rounded-lg shadow-sm">
        <div className="w-full md:w-[380px]">
          <AccountSelect
            accountType="Vendor"
            value={currentState.filters.vendorNo || ""}
            onChange={(val: string) =>
              currentState.onFilterChange({ vendorNo: val })
            }
            placeholder="Search for a vendor..."
            className="h-9 w-full"
          />
        </div>

        <VendorLedgerFilterBar
          filters={currentState.filters}
          visibleColumns={currentState.visibleColumns}
          totalCount={currentState.totalCount}
          currentFilterString={currentState.currentFilterString}
          humanReadableFilters={currentState.humanReadableFilters}
          onFilterChange={currentState.onFilterChange}
          onColumnToggle={currentState.onColumnToggle}
          onResetColumns={currentState.onResetColumns}
          onShowAllColumns={currentState.onShowAllColumns}
          onAddAdditionalFilter={currentState.onAddAdditionalFilter}
          onRemoveAdditionalFilter={currentState.onRemoveAdditionalFilter}
          onSuccess={() => currentState.refetch()}
          onClearFilters={() => {
            currentState.onFilterChange({
              fromDate: "",
              toDate: "",
              vendorNo: "",
              search: "",
              columnFilters: {},
              additionalFilters: [],
            });
          }}
          isLoading={currentState.isLoading}
          openingBalance={currentState.openingBalance}
          closingBalance={currentState.closingBalance}
          currentEntries={currentState.entries}
        />
      </div>

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 bg-card rounded-lg border shadow-sm overflow-hidden flex flex-col">
        <VendorLedgerTable
          entries={currentState.entries}
          isLoading={currentState.isLoading}
          isFetchingNextPage={currentState.isFetchingNextPage}
          hasMore={currentState.hasMore}
          loadMore={currentState.loadMore}
          openingBalance={currentState.openingBalance}
          closingBalance={currentState.closingBalance}
          debitSum={currentState.debitSum}
          creditSum={currentState.creditSum}
          onSort={currentState.onSort}
          onColumnFilterChange={currentState.onColumnFilterChange}
          sortField={currentState.filters.sortField}
          sortOrder={currentState.filters.sortOrder}
          columnFilters={currentState.filters.columnFilters}
          visibleColumns={currentState.visibleColumns}
          columnWidths={currentState.columnWidths}
          setColumnWidths={currentState.setColumnWidths}
          saveColumnWidths={currentState.saveColumnWidths}
          columnOrder={currentState.columnOrder}
          setColumnOrder={currentState.setColumnOrder}
          saveColumnOrder={currentState.saveColumnOrder}
          vendorNo={currentState.filters.vendorNo}
          fromDate={currentState.filters.fromDate}
          toDate={currentState.filters.toDate}
          isOutstanding={activeTab === "outstanding"}
          refetch={currentState.refetch}
        />
      </div>
    </div>
  );
}
