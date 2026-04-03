"use client";

import React, { useState } from "react";
import { useVendorLedger } from "./use-vendor-ledger";
import { VendorLedgerTable } from "./vendor-ledger-table";
import { VendorLedgerFilterBar } from "./vendor-ledger-filter-bar";
import { PaginationControls } from "../report-ledger/pagination-controls";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountSelect } from "@/components/forms/account-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function VendorLedgerView() {
  const [activeTab, setActiveTab] = useState<"ledger" | "outstanding">("ledger");

  const ledgerState = useVendorLedger({ isOutstanding: false });
  const outstandingState = useVendorLedger({ isOutstanding: true });

  const currentState = activeTab === "ledger" ? ledgerState : outstandingState;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "ledger" | "outstanding");
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full p-4 overflow-hidden bg-background/30 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground/90 shrink-0">Vendor Ledger</h1>
        
        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-[360px]">
            <TabsList className="grid w-full grid-cols-2 h-9 shadow-sm border p-1 bg-muted/30">
              <TabsTrigger value="ledger" className="text-xs font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-7">
                Ledger
              </TabsTrigger>
              <TabsTrigger value="outstanding" className="text-xs font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-7">
                Outstanding
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="h-6 w-px bg-border/60 mx-1" />

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => currentState.refetch()} 
            disabled={currentState.isLoading}
            className="h-9 px-3 border shadow-sm hover:bg-muted font-medium"
          >
            {currentState.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            {!currentState.isLoading && "Refresh"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card/60 p-3 border rounded-xl shadow-sm">
        <div className="flex-1 max-w-sm">
          <AccountSelect
            accountType="Vendor"
            value={currentState.filters.vendorNo || ""}
            onChange={(val: string) => currentState.onFilterChange({ vendorNo: val })}
            placeholder="Select vendor code..."
            className="w-full h-10 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
          />
        </div>

        <div className="h-6 w-px bg-border/60" />

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
              additionalFilters: []
            });
          }}
          isLoading={currentState.isLoading}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden mt-1 border rounded-xl shadow-sm bg-background/50 p-1 flex flex-col">
        <VendorLedgerTable
          entries={currentState.entries}
          isLoading={currentState.isLoading}
          openingBalance={currentState.openingBalance}
          closingBalance={currentState.closingBalance}
          onSort={currentState.onSort}
          onColumnFilterChange={currentState.onColumnFilterChange}
          sortField={currentState.filters.sortField}
          sortOrder={currentState.filters.sortOrder}
          columnFilters={currentState.filters.columnFilters}
          visibleColumns={currentState.visibleColumns}
          isOutstanding={activeTab === "outstanding"}
        />
      </div>

      <div className="border rounded-lg bg-card p-2 shadow-sm">
        <PaginationControls
          currentPage={currentState.currentPage}
          totalPages={currentState.totalPages}
          pageSize={currentState.pageSize}
          totalCount={currentState.totalCount}
          hasNextPage={currentState.currentPage < currentState.totalPages}
          onPageChange={currentState.onPageChange}
          onPageSizeChange={currentState.onPageSizeChange}
        />
      </div>
    </div>
  );
}
