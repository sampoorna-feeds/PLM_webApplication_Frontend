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
    <div className="bg-background/30 flex h-full w-full flex-col gap-4 overflow-hidden p-4 backdrop-blur-sm">
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-3">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-[360px]"
          >
            <TabsList className="bg-muted/30 grid h-9 w-full grid-cols-2 border p-1 shadow-sm">
              <TabsTrigger
                value="ledger"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-7 text-xs font-semibold transition-all"
              >
                Ledger
              </TabsTrigger>
              <TabsTrigger
                value="outstanding"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-7 text-xs font-semibold transition-all"
              >
                Outstanding
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="bg-border/60 mx-1 h-6 w-px" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => currentState.refetch()}
            disabled={currentState.isLoading}
            className="hover:bg-muted h-9 border px-3 font-medium shadow-sm"
          >
            {currentState.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            {!currentState.isLoading && "Refresh"}
          </Button>
        </div>
      </div>

      <div className="bg-card/60 flex items-center gap-4 rounded-xl border p-3 shadow-sm">
        <div className="max-w-sm flex-1">
          <AccountSelect
            accountType="Vendor"
            value={currentState.filters.vendorNo || ""}
            onChange={(val: string) =>
              currentState.onFilterChange({ vendorNo: val })
            }
            placeholder="Select vendor code..."
            className="border-primary/20 hover:border-primary/50 h-10 w-full shadow-none transition-colors"
          />
        </div>

        <div className="bg-border/60 h-6 w-px" />

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
        />
      </div>

      <div className="bg-background/50 mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border p-1 shadow-sm">
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

      <div className="bg-card rounded-lg border p-2 shadow-sm">
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
