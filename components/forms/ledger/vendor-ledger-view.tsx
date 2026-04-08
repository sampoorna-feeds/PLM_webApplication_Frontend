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
    <div className="flex flex-col h-full w-full gap-5 p-6 bg-background/40 overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90">Vendor Ledger</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Detailed transaction history and real-time outstanding balance tracking
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-muted/20 p-1.5 rounded-xl border border-border/40 backdrop-blur-md shadow-sm">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-[280px]"
          >
            <TabsList className="grid w-full grid-cols-2 bg-transparent h-8 p-0">
              <TabsTrigger
                value="ledger"
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-7 text-xs font-bold transition-all"
              >
                Ledger
              </TabsTrigger>
              <TabsTrigger
                value="outstanding"
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-7 text-xs font-bold transition-all"
              >
                Outstanding
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="h-4 w-px bg-border/60 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => currentState.refetch()}
            disabled={currentState.isLoading}
            className="h-8 px-3 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-all duration-300"
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
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] items-center gap-4 bg-card/40 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-500">
        <div className="relative group">
          <AccountSelect
            accountType="Vendor"
            value={currentState.filters.vendorNo || ""}
            onChange={(val: string) =>
              currentState.onFilterChange({ vendorNo: val })
            }
            placeholder="Search for a vendor to load ledger..."
            className="h-11 w-full bg-background/50 border-primary/20 group-hover:border-primary/50 text-sm font-medium pl-10 pr-4 rounded-xl shadow-inner transition-all duration-300"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60 group-hover:text-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-cog"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="m19 8 2 2-2 2"/><path d="M17 10h6"/></svg>
          </div>
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
      <div className="flex-1 min-h-0 bg-card/30 backdrop-blur-md rounded-2xl border border-border/40 shadow-2xl overflow-hidden flex flex-col group">
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
        />
      </div>
    </div>
  );
}
