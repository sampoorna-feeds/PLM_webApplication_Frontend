"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVendorLedger } from "./use-vendor-ledger";
import { VendorLedgerTable } from "./vendor-ledger-table";
import { VendorLedgerFilterBar } from "./vendor-ledger-filter-bar";
import { PaginationControls } from "../report-ledger/pagination-controls";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VendorLedgerView() {
  const [activeTab, setActiveTab] = useState<"ledger" | "outstanding">("ledger");

  const ledgerState = useVendorLedger({ isOutstanding: false });
  const outstandingState = useVendorLedger({ isOutstanding: true });

  const currentState = activeTab === "ledger" ? ledgerState : outstandingState;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "ledger" | "outstanding");
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2 h-10 shadow-sm border">
            <TabsTrigger value="ledger" className="text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Ledger
            </TabsTrigger>
            <TabsTrigger value="outstanding" className="text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Outstanding Amount
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => currentState.refetch()} 
            disabled={currentState.isLoading}
            className="h-9 px-3 border shadow-sm hover:bg-muted"
          >
            {currentState.isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <VendorLedgerFilterBar
        filters={currentState.filters}
        onFilterChange={currentState.onFilterChange}
        onClearFilters={() => currentState.onFilterChange({
          fromDate: "",
          toDate: "",
          vendorNo: ""
        })}
        isLoading={currentState.isLoading}
      />

      <div className="flex-1 min-h-0 overflow-hidden mt-2 border rounded-xl shadow-sm bg-background/50 backdrop-blur-sm p-1">
        <VendorLedgerTable
          entries={currentState.entries}
          isLoading={currentState.isLoading}
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
